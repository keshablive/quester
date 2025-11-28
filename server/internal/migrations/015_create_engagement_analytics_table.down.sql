-- Drop engagement_analytics table
DROP INDEX IF EXISTS idx_engagement_analytics_tenant_date;
DROP INDEX IF EXISTS idx_engagement_analytics_deleted;
DROP INDEX IF EXISTS idx_engagement_analytics_date;
DROP INDEX IF EXISTS idx_engagement_analytics_tenant;

DROP TABLE IF EXISTS engagement_analytics CASCADE;
