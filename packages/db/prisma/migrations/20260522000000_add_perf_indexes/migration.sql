-- Performance indexes identified in code review
-- Prevents full table scans on common filter/sort columns

CREATE INDEX IF NOT EXISTS "CustomerPayment_receivedAt_idx" ON "CustomerPayment"("receivedAt");

CREATE INDEX IF NOT EXISTS "FollowUp_status_nextFollowUpDate_idx" ON "FollowUp"("status", "nextFollowUpDate");
CREATE INDEX IF NOT EXISTS "FollowUp_customerPhone_idx" ON "FollowUp"("customerPhone");

CREATE INDEX IF NOT EXISTS "Quotation_currentStatus_idx" ON "Quotation"("currentStatus");

CREATE INDEX IF NOT EXISTS "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

CREATE INDEX IF NOT EXISTS "Activity_contactId_idx" ON "Activity"("contactId");
