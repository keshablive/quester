-- T606: Rollback backfill (clear metadata)
-- Migration: 20250106_backfill_certificate_metadata (down)
-- Note: This sets fields to NULL, not to original values (data loss)

UPDATE certificates
SET
  average_grade = NULL,
  completed_at = NULL,
  instructor_id = NULL,
  course_difficulty = NULL,
  course_title = NULL;

-- Log warning
DO $$
BEGIN
  RAISE NOTICE 'Cleared certificate metadata (data loss - backfill cannot be reversed)';
END $$;
