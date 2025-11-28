-- Drop report_schedules table
DROP INDEX IF EXISTS idx_report_schedules_filters;
DROP INDEX IF EXISTS idx_report_schedules_tenant_active;
DROP INDEX IF EXISTS idx_report_schedules_deleted;
DROP INDEX IF EXISTS idx_report_schedules_next_run;
DROP INDEX IF EXISTS idx_report_schedules_active;
DROP INDEX IF EXISTS idx_report_schedules_user;
DROP INDEX IF EXISTS idx_report_schedules_tenant;

DROP TABLE IF EXISTS report_schedules CASCADE;
