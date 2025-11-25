-- Phase 1: Add UUID columns to all models currently using uint primary keys
-- This is a non-breaking change that adds new columns alongside existing ones
-- Models affected: courses, enrollments, lessons, quests, properties, marketplace_listings,
-- marketplace_reviews, transactions, certificates, assessments, classified_ads, interactions

-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- COURSES TABLE
-- ============================================================================
ALTER TABLE courses 
  ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE;

CREATE INDEX IF NOT EXISTS idx_courses_uuid ON courses(uuid);

-- ============================================================================
-- ENROLLMENTS TABLE
-- ============================================================================
ALTER TABLE enrollments 
  ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE;

CREATE INDEX IF NOT EXISTS idx_enrollments_uuid ON enrollments(uuid);

-- Add UUID foreign key columns for references
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS course_uuid UUID;

-- Populate course_uuid from existing course_id
UPDATE enrollments e
SET course_uuid = c.uuid
FROM courses c
WHERE e.course_id = c.id;

CREATE INDEX IF NOT EXISTS idx_enrollments_course_uuid ON enrollments(course_uuid);

-- ============================================================================
-- LESSONS TABLE
-- ============================================================================
ALTER TABLE lessons 
  ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE;

CREATE INDEX IF NOT EXISTS idx_lessons_uuid ON lessons(uuid);

-- Add UUID foreign key columns
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS course_uuid UUID,
  ADD COLUMN IF NOT EXISTS prerequisite_lesson_uuid UUID;

-- Populate foreign key UUIDs
UPDATE lessons l
SET course_uuid = c.uuid
FROM courses c
WHERE l.course_id = c.id;

UPDATE lessons l
SET prerequisite_lesson_uuid = pl.uuid
FROM lessons pl
WHERE l.prerequisite_lesson_id = pl.id;

CREATE INDEX IF NOT EXISTS idx_lessons_course_uuid ON lessons(course_uuid);
CREATE INDEX IF NOT EXISTS idx_lessons_prerequisite_uuid ON lessons(prerequisite_lesson_uuid);

-- ============================================================================
-- LESSON_COMPLETIONS TABLE (related to lessons)
-- ============================================================================
ALTER TABLE lesson_completions
  ADD COLUMN IF NOT EXISTS lesson_uuid UUID;

UPDATE lesson_completions lc
SET lesson_uuid = l.uuid
FROM lessons l
WHERE lc.lesson_id = l.id;

CREATE INDEX IF NOT EXISTS idx_lesson_completions_lesson_uuid ON lesson_completions(lesson_uuid);

-- ============================================================================
-- QUESTS TABLE
-- ============================================================================
ALTER TABLE quests 
  ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE;

CREATE INDEX IF NOT EXISTS idx_quests_uuid ON quests(uuid);

-- Add UUID foreign key column for badge reference
ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS badge_uuid UUID;

-- Note: Badges table likely already uses UUID, update if needed
UPDATE quests q
SET badge_uuid = b.id
FROM badges b
WHERE q.badge_id::text = b.id::text;

CREATE INDEX IF NOT EXISTS idx_quests_badge_uuid ON quests(badge_uuid);

-- ============================================================================
-- QUEST_PROGRESS TABLE (related to quests)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quest_progress') THEN
    ALTER TABLE quest_progress
      ADD COLUMN IF NOT EXISTS quest_uuid UUID;
    
    UPDATE quest_progress qp
    SET quest_uuid = q.uuid
    FROM quests q
    WHERE qp.quest_id = q.id;
    
    CREATE INDEX IF NOT EXISTS idx_quest_progress_quest_uuid ON quest_progress(quest_uuid);
  END IF;
END $$;

-- ============================================================================
-- PROPERTIES TABLE
-- ============================================================================
ALTER TABLE properties 
  ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE;

CREATE INDEX IF NOT EXISTS idx_properties_uuid ON properties(uuid);

-- ============================================================================
-- MARKETPLACE_LISTINGS TABLE
-- ============================================================================
ALTER TABLE marketplace_listings 
  ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE;

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_uuid ON marketplace_listings(uuid);

-- ============================================================================
-- MARKETPLACE_REVIEWS TABLE
-- ============================================================================
ALTER TABLE marketplace_reviews 
  ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE;

CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_uuid ON marketplace_reviews(uuid);

-- Add UUID foreign key column for listing reference
ALTER TABLE marketplace_reviews
  ADD COLUMN IF NOT EXISTS listing_uuid UUID;

UPDATE marketplace_reviews mr
SET listing_uuid = ml.uuid
FROM marketplace_listings ml
WHERE mr.listing_id = ml.id;

CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_listing_uuid ON marketplace_reviews(listing_uuid);

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE;

CREATE INDEX IF NOT EXISTS idx_transactions_uuid ON transactions(uuid);

-- Add UUID foreign key columns
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS listing_uuid UUID;

UPDATE transactions t
SET listing_uuid = ml.uuid
FROM marketplace_listings ml
WHERE t.listing_id = ml.id;

CREATE INDEX IF NOT EXISTS idx_transactions_listing_uuid ON transactions(listing_uuid);

-- ============================================================================
-- CERTIFICATES TABLE
-- ============================================================================
ALTER TABLE certificates 
  ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE;

CREATE INDEX IF NOT EXISTS idx_certificates_uuid ON certificates(uuid);

-- Add UUID foreign key columns
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS course_uuid UUID,
  ADD COLUMN IF NOT EXISTS enrollment_uuid UUID;

UPDATE certificates cert
SET course_uuid = c.uuid
FROM courses c
WHERE cert.course_id = c.id;

UPDATE certificates cert
SET enrollment_uuid = e.uuid
FROM enrollments e
WHERE cert.enrollment_id = e.id;

CREATE INDEX IF NOT EXISTS idx_certificates_course_uuid ON certificates(course_uuid);
CREATE INDEX IF NOT EXISTS idx_certificates_enrollment_uuid ON certificates(enrollment_uuid);

-- Update enrollments table to reference certificate UUID
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS certificate_uuid UUID;

UPDATE enrollments e
SET certificate_uuid = c.uuid
FROM certificates c
WHERE e.certificate_id = c.id;

CREATE INDEX IF NOT EXISTS idx_enrollments_certificate_uuid ON enrollments(certificate_uuid);

-- ============================================================================
-- ASSESSMENTS TABLE
-- ============================================================================
ALTER TABLE assessments 
  ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE;

CREATE INDEX IF NOT EXISTS idx_assessments_uuid ON assessments(uuid);

-- Add UUID foreign key column
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS lesson_uuid UUID;

UPDATE assessments a
SET lesson_uuid = l.uuid
FROM lessons l
WHERE a.lesson_id = l.id;

CREATE INDEX IF NOT EXISTS idx_assessments_lesson_uuid ON assessments(lesson_uuid);

-- ============================================================================
-- ASSESSMENT_ATTEMPTS TABLE (related to assessments)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessment_attempts') THEN
    ALTER TABLE assessment_attempts
      ADD COLUMN IF NOT EXISTS assessment_uuid UUID;
    
    UPDATE assessment_attempts aa
    SET assessment_uuid = a.uuid
    FROM assessments a
    WHERE aa.assessment_id = a.id;
    
    CREATE INDEX IF NOT EXISTS idx_assessment_attempts_assessment_uuid ON assessment_attempts(assessment_uuid);
  END IF;
END $$;

-- ============================================================================
-- CLASSIFIED_ADS TABLE
-- ============================================================================
ALTER TABLE classified_ads 
  ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE;

CREATE INDEX IF NOT EXISTS idx_classified_ads_uuid ON classified_ads(uuid);

-- ============================================================================
-- INTERACTIONS TABLE
-- ============================================================================
ALTER TABLE interactions 
  ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE;

CREATE INDEX IF NOT EXISTS idx_interactions_uuid ON interactions(uuid);

-- Add UUID foreign key columns for polymorphic target
ALTER TABLE interactions
  ADD COLUMN IF NOT EXISTS target_uuid UUID;

-- Populate target_uuid based on target_type and target_id
-- Note: This requires logic based on the actual target_type values
-- For now, we'll handle the most common cases

UPDATE interactions i
SET target_uuid = c.uuid
FROM courses c
WHERE i.target_type = 'Course' AND i.target_id = c.id;

UPDATE interactions i
SET target_uuid = l.uuid
FROM lessons l
WHERE i.target_type = 'Lesson' AND i.target_id = l.id;

UPDATE interactions i
SET target_uuid = ml.uuid
FROM marketplace_listings ml
WHERE i.target_type = 'MarketplaceListing' AND i.target_id = ml.id;

CREATE INDEX IF NOT EXISTS idx_interactions_target_uuid ON interactions(target_uuid);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all UUID columns were created and populated
DO $$
DECLARE
  missing_uuids INTEGER;
BEGIN
  -- Check for any NULL UUIDs in the new columns (primary keys only)
  SELECT COUNT(*) INTO missing_uuids FROM (
    SELECT id FROM courses WHERE uuid IS NULL
    UNION ALL
    SELECT id FROM enrollments WHERE uuid IS NULL
    UNION ALL
    SELECT id FROM lessons WHERE uuid IS NULL
    UNION ALL
    SELECT id FROM quests WHERE uuid IS NULL
    UNION ALL
    SELECT id FROM properties WHERE uuid IS NULL
    UNION ALL
    SELECT id FROM marketplace_listings WHERE uuid IS NULL
    UNION ALL
    SELECT id FROM marketplace_reviews WHERE uuid IS NULL
    UNION ALL
    SELECT id FROM transactions WHERE uuid IS NULL
    UNION ALL
    SELECT id FROM certificates WHERE uuid IS NULL
    UNION ALL
    SELECT id FROM assessments WHERE uuid IS NULL
    UNION ALL
    SELECT id FROM classified_ads WHERE uuid IS NULL
    UNION ALL
    SELECT id FROM interactions WHERE uuid IS NULL
  ) AS missing;
  
  IF missing_uuids > 0 THEN
    RAISE WARNING 'Found % records with NULL UUIDs', missing_uuids;
  ELSE
    RAISE NOTICE 'All UUID columns successfully populated';
  END IF;
END $$;
