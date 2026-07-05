-- Make createdById nullable on Quotation and PurchaseOrder.
-- Fixes FK violation when Clerk is not configured (app degrades gracefully without auth).

ALTER TABLE "Quotation" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "createdById" DROP NOT NULL;
