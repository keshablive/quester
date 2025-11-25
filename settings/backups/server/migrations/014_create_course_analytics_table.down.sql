-- Drop course_analytics table
DROP INDEX IF EXISTS idx_course_analytics_course_date;
DROP INDEX IF EXISTS idx_course_analytics_tenant_date;
DROP INDEX IF EXISTS idx_course_analytics_deleted;
DROP INDEX IF EXISTS idx_course_analytics_date;
DROP INDEX IF EXISTS idx_course_analytics_course;
DROP INDEX IF EXISTS idx_course_analytics_tenant;

DROP TABLE IF EXISTS course_analytics CASCADE;
