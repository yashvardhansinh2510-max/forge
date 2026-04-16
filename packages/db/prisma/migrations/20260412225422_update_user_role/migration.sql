-- AlterEnum: rename ADMIN→OWNER, SALES→WORKER, add MANAGER
-- PostgreSQL cannot rename enum values directly; we create a new type.

CREATE TYPE "UserRole_new" AS ENUM ('OWNER', 'MANAGER', 'WORKER');

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING CASE "role"::text
    WHEN 'ADMIN' THEN 'OWNER'::"UserRole_new"
    WHEN 'SALES' THEN 'WORKER'::"UserRole_new"
    ELSE 'WORKER'::"UserRole_new"
  END;

ALTER TABLE "User"
  ALTER COLUMN "role" SET DEFAULT 'WORKER'::"UserRole_new";

DROP TYPE "UserRole";

ALTER TYPE "UserRole_new" RENAME TO "UserRole";
