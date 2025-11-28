-- Add tenant_id to quests table for multi-tenancy support
-- Part of C1: Quest System Implementation

ALTER TABLE quests ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Add index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_quests_tenant ON quests(tenant_id);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_quests_tenant_status ON quests(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quests_tenant_type ON quests(tenant_id, type) WHERE deleted_at IS NULL;
