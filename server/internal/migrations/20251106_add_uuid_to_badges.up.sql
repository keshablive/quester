-- Add UUID support to badges table (backward compatible migration)
-- This allows achievements (UUID-based) to reference badges while maintaining legacy int64 IDs

-- Add uuid column to badges table
ALTER TABLE badges ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid();

-- Make uuid unique and indexed
CREATE UNIQUE INDEX IF NOT EXISTS idx_badges_uuid ON badges(uuid);

-- Update existing rows to have UUIDs (if any exist)
UPDATE badges SET uuid = gen_random_uuid() WHERE uuid IS NULL;

-- Make uuid NOT NULL after populating existing rows
ALTER TABLE badges ALTER COLUMN uuid SET NOT NULL;

-- Add tenant_uuid column for UUID-based tenant isolation (optional, for future use)
-- Note: This assumes tenants table has been migrated to UUIDs or will be
-- If not yet migrated, this column can remain nullable until tenant migration is complete
ALTER TABLE badges ADD COLUMN IF NOT EXISTS tenant_uuid UUID;

-- Create index on tenant_uuid for future queries
CREATE INDEX IF NOT EXISTS idx_badges_tenant_uuid ON badges(tenant_uuid);

-- Comments for documentation
COMMENT ON COLUMN badges.uuid IS 'UUID identifier for badges (used by achievement system)';
COMMENT ON COLUMN badges.tenant_uuid IS 'UUID-based tenant reference (for future tenant UUID migration)';

-- Note: Legacy int64 'id' and 'tenant_id' columns remain for backward compatibility
-- Services can use either badges.id (int64) or badges.uuid (UUID) depending on their needs
