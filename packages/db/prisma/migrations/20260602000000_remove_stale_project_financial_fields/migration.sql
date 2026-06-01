-- Remove stale denormalized financial fields from Project model.
-- These values are now computed live in the API layer.

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "outstandingAmount",
DROP COLUMN "paymentReceived",
DROP COLUMN "purchaseValue",
DROP COLUMN "quotationValue";

-- Add missing relations/columns that exist in DB but need schema sync
-- (These already exist in DB, migration is a no-op for them, schema.prisma now reflects them)

-- AddForeignKey (SalesOrder.projectId -> Project.id) - already in DB
-- AddForeignKey (Activity.projectId -> Project.id) - already in DB
-- AddForeignKey (FollowUp.projectId -> Project.id) - already in DB
-- AddForeignKey (StockMovement.projectId -> Project.id) - already in DB
