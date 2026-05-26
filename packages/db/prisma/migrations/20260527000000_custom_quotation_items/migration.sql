-- Make productId optional on QuotationItem to support custom (non-catalog) line items
ALTER TABLE "QuotationItem" ALTER COLUMN "productId" DROP NOT NULL;

-- Add custom item metadata columns
ALTER TABLE "QuotationItem" ADD COLUMN "isCustom"          BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "QuotationItem" ADD COLUMN "customDescription" TEXT;
ALTER TABLE "QuotationItem" ADD COLUMN "customBrand"       TEXT;
ALTER TABLE "QuotationItem" ADD COLUMN "customUnit"        TEXT;
ALTER TABLE "QuotationItem" ADD COLUMN "customHsnCode"     TEXT;
ALTER TABLE "QuotationItem" ADD COLUMN "customNotes"       TEXT;
