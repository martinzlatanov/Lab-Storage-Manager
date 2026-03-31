-- AlterTable: add optional local password hash to User
-- Format: scrypt-derived hash stored as "hash:salt" (both hex-encoded)
-- Nullable — most users authenticate via LDAP and will never have this set

ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
