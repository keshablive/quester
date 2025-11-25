-- Rollback: Remove UUID columns added in Phase 1
-- This migration can be safely run to revert the changes

-- ============================================================================
-- DROP INDEXES
-- ============================================================================

-- Courses
DROP INDEX IF EXISTS idx_courses_uuid;

-- Enrollments
DROP INDEX IF EXISTS idx_enrollments_uuid;
DROP INDEX IF EXISTS idx_enrollments_course_uuid;
DROP INDEX IF EXISTS idx_enrollments_certificate_uuid;

-- Lessons
DROP INDEX IF EXISTS idx_lessons_uuid;
DROP INDEX IF EXISTS idx_lessons_course_uuid;
DROP INDEX IF EXISTS idx_lessons_prerequisite_uuid;

-- Lesson Completions
DROP INDEX IF EXISTS idx_lesson_completions_lesson_uuid;

-- Quests
DROP INDEX IF EXISTS idx_quests_uuid;
DROP INDEX IF EXISTS idx_quests_badge_uuid;

-- Quest Progress
DROP INDEX IF EXISTS idx_quest_progress_quest_uuid;

-- Properties
DROP INDEX IF EXISTS idx_properties_uuid;

-- Marketplace Listings
DROP INDEX IF EXISTS idx_marketplace_listings_uuid;

-- Marketplace Reviews
DROP INDEX IF EXISTS idx_marketplace_reviews_uuid;
DROP INDEX IF EXISTS idx_marketplace_reviews_listing_uuid;

-- Transactions
DROP INDEX IF EXISTS idx_transactions_uuid;
DROP INDEX IF EXISTS idx_transactions_listing_uuid;

-- Certificates
DROP INDEX IF EXISTS idx_certificates_uuid;
DROP INDEX IF EXISTS idx_certificates_course_uuid;
DROP INDEX IF EXISTS idx_certificates_enrollment_uuid;

-- Assessments
DROP INDEX IF EXISTS idx_assessments_uuid;
DROP INDEX IF EXISTS idx_assessments_lesson_uuid;

-- Assessment Attempts
DROP INDEX IF EXISTS idx_assessment_attempts_assessment_uuid;

-- Classified Ads
DROP INDEX IF EXISTS idx_classified_ads_uuid;

-- Interactions
DROP INDEX IF EXISTS idx_interactions_uuid;
DROP INDEX IF EXISTS idx_interactions_target_uuid;

-- ============================================================================
-- DROP COLUMNS
-- ============================================================================

-- Courses
ALTER TABLE courses DROP COLUMN IF EXISTS uuid;

-- Enrollments
ALTER TABLE enrollments 
  DROP COLUMN IF EXISTS uuid,
  DROP COLUMN IF EXISTS course_uuid,
  DROP COLUMN IF EXISTS certificate_uuid;

-- Lessons
ALTER TABLE lessons 
  DROP COLUMN IF EXISTS uuid,
  DROP COLUMN IF EXISTS course_uuid,
  DROP COLUMN IF EXISTS prerequisite_lesson_uuid;

-- Lesson Completions
ALTER TABLE lesson_completions DROP COLUMN IF EXISTS lesson_uuid;

-- Quests
ALTER TABLE quests 
  DROP COLUMN IF EXISTS uuid,
  DROP COLUMN IF EXISTS badge_uuid;

-- Quest Progress
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quest_progress') THEN
    ALTER TABLE quest_progress DROP COLUMN IF EXISTS quest_uuid;
  END IF;
END $$;

-- Properties
ALTER TABLE properties DROP COLUMN IF EXISTS uuid;

-- Marketplace Listings
ALTER TABLE marketplace_listings DROP COLUMN IF EXISTS uuid;

-- Marketplace Reviews
ALTER TABLE marketplace_reviews 
  DROP COLUMN IF EXISTS uuid,
  DROP COLUMN IF EXISTS listing_uuid;

-- Transactions
ALTER TABLE transactions 
  DROP COLUMN IF EXISTS uuid,
  DROP COLUMN IF EXISTS listing_uuid;

-- Certificates
ALTER TABLE certificates 
  DROP COLUMN IF EXISTS uuid,
  DROP COLUMN IF EXISTS course_uuid,
  DROP COLUMN IF EXISTS enrollment_uuid;

-- Assessments
ALTER TABLE assessments 
  DROP COLUMN IF EXISTS uuid,
  DROP COLUMN IF EXISTS lesson_uuid;

-- Assessment Attempts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessment_attempts') THEN
    ALTER TABLE assessment_attempts DROP COLUMN IF EXISTS assessment_uuid;
  END IF;
END $$;

-- Classified Ads
ALTER TABLE classified_ads DROP COLUMN IF EXISTS uuid;

-- Interactions
ALTER TABLE interactions 
  DROP COLUMN IF EXISTS uuid,
  DROP COLUMN IF EXISTS target_uuid;
