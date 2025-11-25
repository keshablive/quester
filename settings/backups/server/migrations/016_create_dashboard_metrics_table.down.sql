-- Drop dashboard_metrics table
DROP INDEX IF EXISTS idx_dashboard_metric_tenant_category;
DROP INDEX IF EXISTS idx_dashboard_metric_deleted;
DROP INDEX IF EXISTS idx_dashboard_metric_category;
DROP INDEX IF EXISTS idx_dashboard_metric_name;
DROP INDEX IF EXISTS idx_dashboard_metric_tenant;

DROP TABLE IF EXISTS dashboard_metrics CASCADE;
