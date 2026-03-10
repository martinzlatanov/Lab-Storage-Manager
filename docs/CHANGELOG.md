# Changelog

> All notable changes, milestones, and completions are recorded here.
> Format follows [Keep a Changelog](https://keepachangelog.com) conventions.
> Versions use `YYYY-MM-DD` until a formal versioning scheme is adopted.

---

## [Unreleased]

### Planned
- TypeScript type definitions implementation (`src/shared/types/`)
- Prisma schema (`prisma/schema.prisma`)
- Docker Compose setup
- Backend scaffold (Fastify + LDAP auth + JWT)
- Frontend scaffold (React + Vite + routing)

---

## [2026-03-10] — Project Kickoff / Documentation Phase

### Added
- `docs/PROJECT.md` — master context file
- `docs/SPEC.md` — full specification from source document
- `docs/DECISIONS.md` — architecture decision log (initial 9 decisions)
- `docs/TYPES.md` — TypeScript type definitions (DRAFT)
- `docs/SCREENS.md` — screen inventory (DRAFT, 25 screens planned)
- `docs/API.md` — API route catalogue (DRAFT)
- `docs/CHANGELOG.md` — this file

### Decided
- Stack locked: React/Vite/TS + Fastify + Prisma + PostgreSQL
- Auth: LDAP → JWT, 3 roles
- Barcodes: Code 128 + QR Code
- Deployment: Docker Compose, on-prem, Nginx reverse proxy
- Multi-site: global DB with role+site filtered queries
- Soft-delete strategy for users and items

---

## Template for Future Entries

```markdown
## [YYYY-MM-DD] — Milestone Name

### Added
- New feature or file

### Changed
- What was updated

### Fixed
- Bug or issue resolved

### Decided
- New architecture or design decision (link to DECISIONS.md)

### Removed
- What was deprecated or removed
```
