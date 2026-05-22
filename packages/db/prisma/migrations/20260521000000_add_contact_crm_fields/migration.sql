-- Migration: add_contact_crm_fields
-- Applied manually via Neon MCP (raw SQL) on 2026-05-21.
-- Renames Contact.role → title and adds CRM fields + owner FK.

ALTER TABLE "Contact" RENAME COLUMN "role" TO "title";

ALTER TABLE "Contact"
  ADD COLUMN IF NOT EXISTS "whatsapp"       TEXT,
  ADD COLUMN IF NOT EXISTS "city"           TEXT,
  ADD COLUMN IF NOT EXISTS "area"           TEXT,
  ADD COLUMN IF NOT EXISTS "ownerId"        TEXT,
  ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "notes"          TEXT;

ALTER TABLE "Contact"
  ADD CONSTRAINT "Contact_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
