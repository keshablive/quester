-- T604: Add metadata fields to certificates table
-- Migration: 20250106_add_certificate_metadata
-- Purpose: Add fields to store enrollment completion data in certificates

-- Add new columns to certificates table
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS average_grade DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS instructor_id UUID,
  ADD COLUMN IF NOT EXISTS course_difficulty VARCHAR(20),
  ADD COLUMN IF NOT EXISTS course_title VARCHAR(255);

-- Add comments to document the fields
COMMENT ON COLUMN certificates.average_grade IS 'Student average grade from enrollment (0-100)';
COMMENT ON COLUMN certificates.completed_at IS 'Course completion timestamp from enrollment';
COMMENT ON COLUMN certificates.instructor_id IS 'Course instructor ID for certificate display';
COMMENT ON COLUMN certificates.course_difficulty IS 'Course difficulty level (beginner, intermediate, advanced, expert)';
COMMENT ON COLUMN certificates.course_title IS 'Course title snapshot at certificate issuance';

-- Add index for instructor queries
CREATE INDEX IF NOT EXISTS idx_certificates_instructor ON certificates(instructor_id);

-- Add check constraint for average_grade
ALTER TABLE certificates
  ADD CONSTRAINT chk_certificate_average_grade 
  CHECK (average_grade IS NULL OR (average_grade >= 0 AND average_grade <= 100));

-- Add foreign key for instructor
ALTER TABLE certificates
  ADD CONSTRAINT fk_certificates_instructor
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL;
