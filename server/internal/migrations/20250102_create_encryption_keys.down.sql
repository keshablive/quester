-- T207: Rollback encryption_keys table
-- Migration: 20250102_create_encryption_keys.down.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_encryption_keys_rotated_at;
DROP INDEX IF EXISTS idx_encryption_keys_created_at;
DROP INDEX IF EXISTS idx_encryption_keys_tenant_id;
DROP INDEX IF EXISTS idx_encryption_keys_status;
DROP INDEX IF EXISTS idx_encryption_keys_version;
DROP INDEX IF EXISTS idx_encryption_keys_key_id;
DROP INDEX IF EXISTS idx_encryption_keys_version_unique;

-- Drop table
DROP TABLE IF EXISTS encryption_keys;
