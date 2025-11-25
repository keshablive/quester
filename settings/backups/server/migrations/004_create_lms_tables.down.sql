-- Drop triggers
DROP TRIGGER IF EXISTS update_certificates_updated_at ON certificates;
DROP TRIGGER IF EXISTS update_enrollments_updated_at ON enrollments;
DROP TRIGGER IF EXISTS update_lesson_completions_updated_at ON lesson_completions;
DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;

-- Drop tables in reverse order (respecting foreign key constraints)
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS lesson_completions CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS courses CASCADE;

-- Note: We keep the update_updated_at_column() function as it may be used by other tables
