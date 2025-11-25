-- T606: Backfill certificate metadata from enrollments
-- Migration: 20250106_backfill_certificate_metadata
-- Purpose: Populate new certificate fields with data from enrollments table

-- Update certificates with enrollment data
-- This joins certificates → enrollments to get completion metadata
UPDATE certificates c
SET
  average_grade = e.average_grade,
  completed_at = e.completed_at,
  instructor_id = co.instructor_id,
  course_difficulty = co.difficulty::text,
  course_title = co.title
FROM enrollments e
JOIN courses co ON e.course_id = co.id
WHERE
  c.user_id = e.user_id
  AND c.course_id = e.course_id
  AND c.average_grade IS NULL  -- Only update if not already set
  AND e.completion_percentage >= 100;  -- Only completed enrollments

-- Log the number of rows updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled % certificates with enrollment metadata', updated_count;
END $$;
