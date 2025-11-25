-- T604: Rollback certificate metadata fields
-- Migration: 20250106_add_certificate_metadata (down)

-- Drop foreign key constraint
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS fk_certificates_instructor;

-- Drop check constraint
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS chk_certificate_average_grade;

-- Drop index
DROP INDEX IF EXISTS idx_certificates_instructor;

-- Drop columns
ALTER TABLE certificates
  DROP COLUMN IF EXISTS average_grade,
  DROP COLUMN IF EXISTS completed_at,
  DROP COLUMN IF EXISTS instructor_id,
  DROP COLUMN IF EXISTS course_difficulty,
  DROP COLUMN IF EXISTS course_title;
