-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "articleNumber" TEXT,
ADD COLUMN     "brandGroup" TEXT NOT NULL DEFAULT 'HANSGROHE',
ADD COLUMN     "finishCode" TEXT,
ADD COLUMN     "finishName" TEXT,
ADD COLUMN     "sectionName" TEXT,
ADD COLUMN     "seriesName" TEXT,
ADD COLUMN     "sourceFile" TEXT,
ADD COLUMN     "subcategory" TEXT;

-- AlterTable
ALTER TABLE "Quotation" DROP COLUMN "billingAddress",
DROP COLUMN "brandLabel",
DROP COLUMN "customerPhone",
DROP COLUMN "salesRep";

-- AlterTable
ALTER TABLE "QuotationRevision" DROP COLUMN "termsAndConditions",
DROP COLUMN "validUntil";

-- CreateIndex
CREATE INDEX "Product_articleNumber_idx" ON "Product"("articleNumber");
