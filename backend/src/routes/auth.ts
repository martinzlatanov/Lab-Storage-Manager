import type { FastifyInstance } from "fastify";
import { createSigner, createVerifier } from "fast-jwt";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ldapAuthenticate } from "../lib/ldap.js";
import type { JwtPayload } from "../types/index.js";

const LoginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const RefreshBody = z.object({
  refreshToken: z.string().min(1),
});

export default async function authRoutes(app: FastifyInstance) {
  // ── POST /api/v1/auth/login ──────────────────────────────────────────────
  app.post("/auth/login", async (req, reply) => {
    const body = LoginBody.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: "Invalid request body" });
    }

    const { username, password } = body.data;

    // 1. Verify credentials against Active Directory
    let ldapUser;
    try {
      ldapUser = await ldapAuthenticate(username, password);
    } catch (err) {
      app.log.warn({ username }, "LDAP authentication failed");
      return reply.status(401).send({ success: false, error: "Invalid credentials" });
    }

    // 2. Find or create user in local DB (first login auto-provisions the account)
    let user = await prisma.user.findUnique({
      where: { ldapUsername: ldapUser.username },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          ldapUsername: ldapUser.username,
          displayName: ldapUser.displayName,
          email: ldapUser.email,
          role: "USER", // default role — admin must elevate
        },
      });
      app.log.info({ userId: user.id }, "Auto-provisioned new user from LDAP");
    }

    if (!user.isActive) {
      return reply.status(403).send({ success: false, error: "Account is deactivated" });
    }

    // 3. Issue access token
    const payload: JwtPayload = {
      sub: user.id,
      username: user.ldapUsername,
      role: user.role as JwtPayload["role"],
      ...(user.siteId ? { siteId: user.siteId } : {}),
    };
    const accessToken = app.jwt.sign(payload);

    // 4. Issue refresh token (signed with the separate refresh secret)
    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";
    const refreshSigner = createSigner({
      key: app.jwtRefreshSecret,
      expiresIn: parseDurationToMs(refreshExpiresIn),
    });
    const refreshToken = await refreshSigner({ sub: user.id });

    // 5. Persist refresh token in DB
    const expiresAt = new Date(Date.now() + parseDurationToMs(refreshExpiresIn));
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    return reply.send({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.ldapUsername,
          displayName: user.displayName,
          role: user.role,
          siteId: user.siteId,
        },
      },
    });
  });

  // ── POST /api/v1/auth/refresh ────────────────────────────────────────────
  app.post("/auth/refresh", async (req, reply) => {
    const body = RefreshBody.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ success: false, error: "Invalid request body" });
    }

    const { refreshToken } = body.data;

    // 1. Verify refresh token signature
    let tokenPayload: { sub: string };
    try {
      const verifier = createVerifier({ key: app.jwtRefreshSecret });
      tokenPayload = await verifier(refreshToken) as { sub: string };
    } catch {
      return reply.status(401).send({ success: false, error: "Invalid or expired refresh token" });
    }

    // 2. Check token exists in DB and is not revoked
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.revokedAt !== null || stored.expiresAt < new Date()) {
      return reply.status(401).send({ success: false, error: "Refresh token is invalid or revoked" });
    }

    if (!stored.user.isActive) {
      return reply.status(403).send({ success: false, error: "Account is deactivated" });
    }

    // Sanity check: token subject matches DB record
    if (stored.userId !== tokenPayload.sub) {
      return reply.status(401).send({ success: false, error: "Token mismatch" });
    }

    // 3. Rotate: revoke old token, issue new pair
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const newPayload: JwtPayload = {
      sub: stored.user.id,
      username: stored.user.ldapUsername,
      role: stored.user.role as JwtPayload["role"],
      ...(stored.user.siteId ? { siteId: stored.user.siteId } : {}),
    };
    const newAccessToken = app.jwt.sign(newPayload);

    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";
    const refreshSigner = createSigner({
      key: app.jwtRefreshSecret,
      expiresIn: parseDurationToMs(refreshExpiresIn),
    });
    const newRefreshToken = await refreshSigner({ sub: stored.user.id });

    const expiresAt = new Date(Date.now() + parseDurationToMs(refreshExpiresIn));
    await prisma.refreshToken.create({
      data: { token: newRefreshToken, userId: stored.user.id, expiresAt },
    });

    return reply.send({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  });

  // ── POST /api/v1/auth/logout ─────────────────────────────────────────────
  app.post(
    "/auth/logout",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const body = RefreshBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: "Invalid request body" });
      }

      await prisma.refreshToken.updateMany({
        where: {
          token: body.data.refreshToken,
          userId: req.user.id,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      return reply.send({ success: true, data: null });
    }
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert duration strings like "7d", "15m", "1h" to milliseconds. */
function parseDurationToMs(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) throw new Error(`Invalid duration format: ${duration}`);
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * multipliers[unit];
}
