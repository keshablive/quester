-- Migration: Drop leaderboards table
-- Rollback for 003_create_leaderboards_table.up.sql

-- Drop trigger first
DROP TRIGGER IF EXISTS trigger_leaderboards_updated_at ON leaderboards;
DROP FUNCTION IF EXISTS update_leaderboards_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_leaderboards_cached_at;
DROP INDEX IF EXISTS idx_leaderboards_rank;
DROP INDEX IF EXISTS idx_leaderboards_tenant_category;
DROP INDEX IF EXISTS idx_leaderboards_tenant_user;
DROP INDEX IF EXISTS idx_leaderboards_tenant_type_period;
DROP INDEX IF EXISTS idx_leaderboards_unique_user_entry;

-- Drop table
DROP TABLE IF EXISTS leaderboards CASCADE;
