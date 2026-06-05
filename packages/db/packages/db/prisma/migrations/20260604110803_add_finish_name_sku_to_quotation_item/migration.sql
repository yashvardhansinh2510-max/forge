-- AlterTable: add finish name + orderable SKU to QuotationItem
ALTER TABLE "QuotationItem"
  ADD COLUMN IF NOT EXISTS "selectedFinishName" TEXT,
  ADD COLUMN IF NOT EXISTS "selectedFinishSku"  TEXT;
