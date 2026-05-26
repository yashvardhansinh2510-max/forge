-- Migration: Purchase Tracker — remove old stages, add PurchaseItem model
-- Removes qtyPendingDist and qtyNotDisplayed from POLineItem.
-- Adds PurchaseItem model and PurchaseItemStatus enum for per-batch tracking.

-- Remove deprecated stage columns
ALTER TABLE "POLineItem" DROP COLUMN IF EXISTS "qtyPendingDist";
ALTER TABLE "POLineItem" DROP COLUMN IF EXISTS "qtyNotDisplayed";

-- Create enum for per-batch purchase item status
CREATE TYPE "PurchaseItemStatus" AS ENUM (
  'NEEDS_PO',
  'ORDERED',
  'AT_GODOWN',
  'IN_BOX',
  'DISPATCHED'
);

-- Create per-batch purchase item table
CREATE TABLE "PurchaseItem" (
  "id"             TEXT NOT NULL,
  "orderId"        TEXT NOT NULL,
  "productId"      TEXT NOT NULL,
  "batchQty"       INTEGER NOT NULL,
  "status"         "PurchaseItemStatus" NOT NULL DEFAULT 'NEEDS_PO',
  "supplierId"     TEXT,
  "receivedAt"     TIMESTAMP(3),
  "dispatchedAt"   TIMESTAMP(3),
  "godownLocation" TEXT,
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- Foreign key to POLineItem
ALTER TABLE "PurchaseItem"
  ADD CONSTRAINT "PurchaseItem_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "POLineItem"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "PurchaseItem_orderId_idx" ON "PurchaseItem"("orderId");
CREATE INDEX "PurchaseItem_status_idx"  ON "PurchaseItem"("status");
