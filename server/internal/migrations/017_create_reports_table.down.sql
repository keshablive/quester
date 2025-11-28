-- Drop reports table
DROP INDEX IF EXISTS idx_reports_metadata;
DROP INDEX IF EXISTS idx_reports_created;
DROP INDEX IF EXISTS idx_reports_tenant_status;
DROP INDEX IF EXISTS idx_reports_tenant_user;
DROP INDEX IF EXISTS idx_reports_deleted;
DROP INDEX IF EXISTS idx_reports_status;
DROP INDEX IF EXISTS idx_reports_type;
DROP INDEX IF EXISTS idx_reports_user;
DROP INDEX IF EXISTS idx_reports_tenant;

DROP TABLE IF EXISTS reports CASCADE;
