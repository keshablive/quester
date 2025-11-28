-- Drop report_executions table
DROP INDEX IF EXISTS idx_report_executions_schedule_status;
DROP INDEX IF EXISTS idx_report_executions_started;
DROP INDEX IF EXISTS idx_report_executions_status;
DROP INDEX IF EXISTS idx_report_executions_report;
DROP INDEX IF EXISTS idx_report_executions_schedule;
DROP INDEX IF EXISTS idx_report_executions_tenant;

DROP TABLE IF EXISTS report_executions CASCADE;
