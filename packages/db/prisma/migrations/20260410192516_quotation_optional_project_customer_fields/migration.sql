-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "siteAddress" TEXT,
ALTER COLUMN "projectId" DROP NOT NULL;
