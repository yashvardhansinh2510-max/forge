-- AlterTable: add transfer adjustment fields to POLineItem
-- qtyOrdered is NEVER mutated by transfers — these fields track net transfer deltas
ALTER TABLE "POLineItem"
ADD COLUMN "qtyTransferredIn"  INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "qtyTransferredOut" INTEGER NOT NULL DEFAULT 0;

-- Populate qtyTransferredOut from audit: sum of TRANSFERRED_OUT movements
UPDATE "POLineItem" p
SET "qtyTransferredOut" = COALESCE(
  (SELECT SUM(qty) FROM "StageMovement" sm
   WHERE sm."poLineItemId" = p.id AND sm."toStage" = 'TRANSFERRED_OUT'),
  0
);

-- Populate qtyTransferredIn from audit: sum of TRANSFERRED_IN movements
UPDATE "POLineItem" p
SET "qtyTransferredIn" = COALESCE(
  (SELECT SUM(qty) FROM "StageMovement" sm
   WHERE sm."poLineItemId" = p.id AND sm."fromStage" = 'TRANSFERRED_IN'),
  0
);

-- Restore original qtyOrdered — undo the corruption from past transfers
-- Original = corrupted_current + transferred_out - transferred_in
-- WARNING: This UPDATE is NOT idempotent. It must never be re-run manually on
-- a database that has already been migrated. Prisma's migration ledger prevents
-- automatic re-execution. If the _prisma_migrations table is reset while data
-- persists, running this again will double-corrupt qtyOrdered.
UPDATE "POLineItem"
SET "qtyOrdered" = "qtyOrdered" + "qtyTransferredOut" - "qtyTransferredIn";
