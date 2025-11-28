-- Drop dashboards table
DROP INDEX IF EXISTS idx_dashboards_filters;
DROP INDEX IF EXISTS idx_dashboards_widgets;
DROP INDEX IF EXISTS idx_dashboards_layout;
DROP INDEX IF EXISTS idx_dashboards_tenant_user;
DROP INDEX IF EXISTS idx_dashboards_deleted;
DROP INDEX IF EXISTS idx_dashboards_shared;
DROP INDEX IF EXISTS idx_dashboards_default;
DROP INDEX IF EXISTS idx_dashboards_user;
DROP INDEX IF EXISTS idx_dashboards_tenant;

DROP TABLE IF EXISTS dashboards CASCADE;
