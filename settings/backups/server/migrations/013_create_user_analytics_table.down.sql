-- Drop user_analytics table
DROP INDEX IF EXISTS idx_user_analytics_user_date;
DROP INDEX IF EXISTS idx_user_analytics_tenant_date;
DROP INDEX IF EXISTS idx_user_analytics_deleted;
DROP INDEX IF EXISTS idx_user_analytics_date;
DROP INDEX IF EXISTS idx_user_analytics_user;
DROP INDEX IF EXISTS idx_user_analytics_tenant;

DROP TABLE IF EXISTS user_analytics CASCADE;
