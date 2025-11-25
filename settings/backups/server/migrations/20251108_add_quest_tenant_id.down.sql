-- Rollback: Remove tenant_id from quests table
DROP INDEX IF EXISTS idx_quests_tenant_type;
DROP INDEX IF EXISTS idx_quests_tenant_status;
DROP INDEX IF EXISTS idx_quests_tenant;
ALTER TABLE quests DROP COLUMN IF EXISTS tenant_id;
