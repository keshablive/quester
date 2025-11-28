-- Rollback UUID support for badges table

DROP INDEX IF EXISTS idx_badges_tenant_uuid;
DROP INDEX IF EXISTS idx_badges_uuid;

ALTER TABLE badges DROP COLUMN IF EXISTS tenant_uuid;
ALTER TABLE badges DROP COLUMN IF EXISTS uuid;
