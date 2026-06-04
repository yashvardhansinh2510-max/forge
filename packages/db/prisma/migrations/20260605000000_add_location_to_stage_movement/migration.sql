-- Add physical location field to StageMovement (warehouse shelf/box where stock was placed)
ALTER TABLE "StageMovement" ADD COLUMN IF NOT EXISTS "location" TEXT;
