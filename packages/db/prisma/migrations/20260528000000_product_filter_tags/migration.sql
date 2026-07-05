-- AlterTable
ALTER TABLE "Product" ADD COLUMN "filterTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Product" ADD COLUMN "hsnCode" TEXT;
ALTER TABLE "Product" ADD COLUMN "sortOrder" INTEGER;
