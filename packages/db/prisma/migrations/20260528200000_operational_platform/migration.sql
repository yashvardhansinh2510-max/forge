-- AddFields: POLineItem — priority, assignedToId, stageEnteredAt
ALTER TABLE "POLineItem" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "POLineItem" ADD COLUMN IF NOT EXISTS "assignedToId" TEXT;
ALTER TABLE "POLineItem" ADD COLUMN IF NOT EXISTS "stageEnteredAt" TIMESTAMP(3);

-- FK: POLineItem.assignedTo → User
ALTER TABLE "POLineItem" ADD CONSTRAINT "POLineItem_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: POLineItemNote
CREATE TABLE IF NOT EXISTS "POLineItemNote" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid(),
  "lineItemId"  TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "content"     TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "POLineItemNote_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "POLineItemNote" ADD CONSTRAINT "POLineItemNote_lineItemId_fkey"
  FOREIGN KEY ("lineItemId") REFERENCES "POLineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "POLineItemNote" ADD CONSTRAINT "POLineItemNote_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "POLineItemNote_lineItemId_idx" ON "POLineItemNote"("lineItemId");

-- CreateTable: AuditLog
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId"      TEXT NOT NULL,
  "userName"    TEXT NOT NULL DEFAULT '',
  "action"      TEXT NOT NULL,
  "entityType"  TEXT NOT NULL,
  "entityId"    TEXT,
  "payload"     JSONB,
  "ip"          TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx"    ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx"    ON "AuditLog"("action");

-- Expand UserRole enum — add new values (PostgreSQL: can only add, not remove)
DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'OPS_MANAGER';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'BILLING_STAFF';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DISPATCH_STAFF';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SALES_STAFF';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'READ_ONLY';
EXCEPTION WHEN duplicate_object THEN null;
END $$;
