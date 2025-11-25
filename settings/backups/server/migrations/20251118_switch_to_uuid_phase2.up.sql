-- Phase 2: Switch primary keys from uint to UUID
-- WARNING: This is a breaking change that requires application downtime
-- Ensure Phase 1 migration is fully applied and all UUID columns are populated
-- Test this migration thoroughly in a staging environment first

-- ============================================================================
-- PREREQUISITE CHECKS
-- ============================================================================

DO $$
DECLARE
  missing_columns INTEGER := 0;
  null_uuids INTEGER := 0;
BEGIN
  -- Check if all UUID columns exist
  SELECT COUNT(*) INTO missing_columns
  FROM (
    SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'uuid')
    UNION ALL
    SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name = 'uuid')
    UNION ALL
    SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'uuid')
    UNION ALL
    SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quests' AND column_name = 'uuid')
    UNION ALL
    SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'uuid')
    UNION ALL
    SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketplace_listings' AND column_name = 'uuid')
    UNION ALL
    SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketplace_reviews' AND column_name = 'uuid')
    UNION ALL
    SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'uuid')
    UNION ALL
    SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certificates' AND column_name = 'uuid')
    UNION ALL
    SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'uuid')
    UNION ALL
    SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classified_ads' AND column_name = 'uuid')
    UNION ALL
    SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interactions' AND column_name = 'uuid')
  ) AS missing;
  
  IF missing_columns > 0 THEN
    RAISE EXCEPTION 'Phase 1 migration not applied. Missing UUID columns. Run 20251118_add_uuid_columns_phase1.up.sql first.';
  END IF;
  
  -- Check for NULL UUIDs
  SELECT COUNT(*) INTO null_uuids FROM (
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
  ) AS nulls;
  
  IF null_uuids > 0 THEN
    RAISE EXCEPTION 'Found % records with NULL UUIDs. Fix data before proceeding.', null_uuids;
  END IF;
  
  RAISE NOTICE 'Prerequisites verified. Ready to proceed with migration.';
END $$;

-- ============================================================================
-- COURSES TABLE
-- ============================================================================

-- Drop existing foreign key constraints that reference courses.id
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS fk_enrollments_course;
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_course_id_fkey;
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS fk_lessons_course;
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_course_id_fkey;
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS fk_certificates_course;
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_course_id_fkey;

-- Drop old primary key and rename UUID column
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_pkey;
ALTER TABLE courses DROP COLUMN id;
ALTER TABLE courses RENAME COLUMN uuid TO id;
ALTER TABLE courses ADD PRIMARY KEY (id);

-- ============================================================================
-- ENROLLMENTS TABLE
-- ============================================================================

-- Drop foreign keys referencing enrollments.id
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS fk_certificates_enrollment;
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_enrollment_id_fkey;

-- Update course_id foreign key
ALTER TABLE enrollments DROP COLUMN course_id;
ALTER TABLE enrollments RENAME COLUMN course_uuid TO course_id;
ALTER TABLE enrollments ALTER COLUMN course_id SET NOT NULL;

-- Update certificate_id reference
ALTER TABLE enrollments DROP COLUMN certificate_id;
ALTER TABLE enrollments RENAME COLUMN certificate_uuid TO certificate_id;

-- Drop old primary key and rename UUID column
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_pkey;
ALTER TABLE enrollments DROP COLUMN id;
ALTER TABLE enrollments RENAME COLUMN uuid TO id;
ALTER TABLE enrollments ADD PRIMARY KEY (id);

-- Recreate foreign key to courses
ALTER TABLE enrollments ADD CONSTRAINT fk_enrollments_course
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

CREATE INDEX idx_enrollments_course ON enrollments(course_id);

-- ============================================================================
-- LESSONS TABLE
-- ============================================================================

-- Drop foreign keys referencing lessons.id
ALTER TABLE lesson_completions DROP CONSTRAINT IF EXISTS fk_lesson_completions_lesson;
ALTER TABLE lesson_completions DROP CONSTRAINT IF EXISTS lesson_completions_lesson_id_fkey;
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS fk_lessons_prerequisite;
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_prerequisite_lesson_id_fkey;
ALTER TABLE assessments DROP CONSTRAINT IF EXISTS fk_assessments_lesson;
ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_lesson_id_fkey;

-- Update foreign keys
ALTER TABLE lessons DROP COLUMN course_id;
ALTER TABLE lessons RENAME COLUMN course_uuid TO course_id;
ALTER TABLE lessons ALTER COLUMN course_id SET NOT NULL;

ALTER TABLE lessons DROP COLUMN prerequisite_lesson_id;
ALTER TABLE lessons RENAME COLUMN prerequisite_lesson_uuid TO prerequisite_lesson_id;

-- Update lesson_completions reference
ALTER TABLE lesson_completions DROP COLUMN lesson_id;
ALTER TABLE lesson_completions RENAME COLUMN lesson_uuid TO lesson_id;
ALTER TABLE lesson_completions ALTER COLUMN lesson_id SET NOT NULL;

-- Drop old primary key and rename UUID column
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_pkey;
ALTER TABLE lessons DROP COLUMN id;
ALTER TABLE lessons RENAME COLUMN uuid TO id;
ALTER TABLE lessons ADD PRIMARY KEY (id);

-- Recreate foreign keys
ALTER TABLE lessons ADD CONSTRAINT fk_lessons_course
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

ALTER TABLE lessons ADD CONSTRAINT fk_lessons_prerequisite
  FOREIGN KEY (prerequisite_lesson_id) REFERENCES lessons(id) ON DELETE SET NULL;

ALTER TABLE lesson_completions ADD CONSTRAINT fk_lesson_completions_lesson
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;

CREATE INDEX idx_lessons_course ON lessons(course_id);
CREATE INDEX idx_lessons_prerequisite ON lessons(prerequisite_lesson_id);

-- ============================================================================
-- QUESTS TABLE
-- ============================================================================

-- Drop foreign keys referencing quests.id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quest_progress') THEN
    ALTER TABLE quest_progress DROP CONSTRAINT IF EXISTS fk_quest_progress_quest;
    ALTER TABLE quest_progress DROP CONSTRAINT IF EXISTS quest_progress_quest_id_fkey;
    
    -- Update quest_id reference
    ALTER TABLE quest_progress DROP COLUMN quest_id;
    ALTER TABLE quest_progress RENAME COLUMN quest_uuid TO quest_id;
    ALTER TABLE quest_progress ALTER COLUMN quest_id SET NOT NULL;
  END IF;
END $$;

-- Update badge_id reference (badges likely already use UUID)
ALTER TABLE quests DROP COLUMN badge_id;
ALTER TABLE quests RENAME COLUMN badge_uuid TO badge_id;

-- Drop old primary key and rename UUID column
ALTER TABLE quests DROP CONSTRAINT IF EXISTS quests_pkey;
ALTER TABLE quests DROP COLUMN id;
ALTER TABLE quests RENAME COLUMN uuid TO id;
ALTER TABLE quests ADD PRIMARY KEY (id);

-- Recreate foreign keys
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quest_progress') THEN
    ALTER TABLE quest_progress ADD CONSTRAINT fk_quest_progress_quest
      FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- PROPERTIES TABLE
-- ============================================================================

-- Drop old primary key and rename UUID column
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_pkey;
ALTER TABLE properties DROP COLUMN id;
ALTER TABLE properties RENAME COLUMN uuid TO id;
ALTER TABLE properties ADD PRIMARY KEY (id);

-- ============================================================================
-- MARKETPLACE_LISTINGS TABLE
-- ============================================================================

-- Drop foreign keys referencing marketplace_listings.id
ALTER TABLE marketplace_reviews DROP CONSTRAINT IF EXISTS fk_marketplace_reviews_listing;
ALTER TABLE marketplace_reviews DROP CONSTRAINT IF EXISTS marketplace_reviews_listing_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS fk_transactions_listing;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_listing_id_fkey;

-- Drop old primary key and rename UUID column
ALTER TABLE marketplace_listings DROP CONSTRAINT IF EXISTS marketplace_listings_pkey;
ALTER TABLE marketplace_listings DROP COLUMN id;
ALTER TABLE marketplace_listings RENAME COLUMN uuid TO id;
ALTER TABLE marketplace_listings ADD PRIMARY KEY (id);

-- ============================================================================
-- MARKETPLACE_REVIEWS TABLE
-- ============================================================================

-- Update listing_id reference
ALTER TABLE marketplace_reviews DROP COLUMN listing_id;
ALTER TABLE marketplace_reviews RENAME COLUMN listing_uuid TO listing_id;
ALTER TABLE marketplace_reviews ALTER COLUMN listing_id SET NOT NULL;

-- Drop old primary key and rename UUID column
ALTER TABLE marketplace_reviews DROP CONSTRAINT IF EXISTS marketplace_reviews_pkey;
ALTER TABLE marketplace_reviews DROP COLUMN id;
ALTER TABLE marketplace_reviews RENAME COLUMN uuid TO id;
ALTER TABLE marketplace_reviews ADD PRIMARY KEY (id);

-- Recreate foreign key
ALTER TABLE marketplace_reviews ADD CONSTRAINT fk_marketplace_reviews_listing
  FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE;

CREATE INDEX idx_marketplace_reviews_listing ON marketplace_reviews(listing_id);

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================

-- Update listing_id reference
ALTER TABLE transactions DROP COLUMN listing_id;
ALTER TABLE transactions RENAME COLUMN listing_uuid TO listing_id;
ALTER TABLE transactions ALTER COLUMN listing_id SET NOT NULL;

-- Drop old primary key and rename UUID column
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_pkey;
ALTER TABLE transactions DROP COLUMN id;
ALTER TABLE transactions RENAME COLUMN uuid TO id;
ALTER TABLE transactions ADD PRIMARY KEY (id);

-- Recreate foreign key
ALTER TABLE transactions ADD CONSTRAINT fk_transactions_listing
  FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE;

CREATE INDEX idx_transactions_listing ON transactions(listing_id);

-- ============================================================================
-- CERTIFICATES TABLE
-- ============================================================================

-- Update foreign key references
ALTER TABLE certificates DROP COLUMN course_id;
ALTER TABLE certificates RENAME COLUMN course_uuid TO course_id;
ALTER TABLE certificates ALTER COLUMN course_id SET NOT NULL;

ALTER TABLE certificates DROP COLUMN enrollment_id;
ALTER TABLE certificates RENAME COLUMN enrollment_uuid TO enrollment_id;

-- Drop old primary key and rename UUID column
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_pkey;
ALTER TABLE certificates DROP COLUMN id;
ALTER TABLE certificates RENAME COLUMN uuid TO id;
ALTER TABLE certificates ADD PRIMARY KEY (id);

-- Recreate foreign keys
ALTER TABLE certificates ADD CONSTRAINT fk_certificates_course
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

ALTER TABLE certificates ADD CONSTRAINT fk_certificates_enrollment
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE;

ALTER TABLE enrollments ADD CONSTRAINT fk_enrollments_certificate
  FOREIGN KEY (certificate_id) REFERENCES certificates(id) ON DELETE SET NULL;

CREATE INDEX idx_certificates_course ON certificates(course_id);
CREATE INDEX idx_certificates_enrollment ON certificates(enrollment_id);

-- ============================================================================
-- ASSESSMENTS TABLE
-- ============================================================================

-- Drop foreign keys referencing assessments.id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessment_attempts') THEN
    ALTER TABLE assessment_attempts DROP CONSTRAINT IF EXISTS fk_assessment_attempts_assessment;
    ALTER TABLE assessment_attempts DROP CONSTRAINT IF EXISTS assessment_attempts_assessment_id_fkey;
    
    -- Update assessment_id reference
    ALTER TABLE assessment_attempts DROP COLUMN assessment_id;
    ALTER TABLE assessment_attempts RENAME COLUMN assessment_uuid TO assessment_id;
    ALTER TABLE assessment_attempts ALTER COLUMN assessment_id SET NOT NULL;
  END IF;
END $$;

-- Update lesson_id reference
ALTER TABLE assessments DROP COLUMN lesson_id;
ALTER TABLE assessments RENAME COLUMN lesson_uuid TO lesson_id;
ALTER TABLE assessments ALTER COLUMN lesson_id SET NOT NULL;

-- Drop old primary key and rename UUID column
ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_pkey;
ALTER TABLE assessments DROP COLUMN id;
ALTER TABLE assessments RENAME COLUMN uuid TO id;
ALTER TABLE assessments ADD PRIMARY KEY (id);

-- Recreate foreign keys
ALTER TABLE assessments ADD CONSTRAINT fk_assessments_lesson
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessment_attempts') THEN
    ALTER TABLE assessment_attempts ADD CONSTRAINT fk_assessment_attempts_assessment
      FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX idx_assessments_lesson ON assessments(lesson_id);

-- ============================================================================
-- CLASSIFIED_ADS TABLE
-- ============================================================================

-- Drop old primary key and rename UUID column
ALTER TABLE classified_ads DROP CONSTRAINT IF EXISTS classified_ads_pkey;
ALTER TABLE classified_ads DROP COLUMN id;
ALTER TABLE classified_ads RENAME COLUMN uuid TO id;
ALTER TABLE classified_ads ADD PRIMARY KEY (id);

-- ============================================================================
-- INTERACTIONS TABLE
-- ============================================================================

-- Update target_id (polymorphic reference, keep as-is for now)
ALTER TABLE interactions DROP COLUMN target_id;
ALTER TABLE interactions RENAME COLUMN target_uuid TO target_id;

-- Drop old primary key and rename UUID column
ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_pkey;
ALTER TABLE interactions DROP COLUMN id;
ALTER TABLE interactions RENAME COLUMN uuid TO id;
ALTER TABLE interactions ADD PRIMARY KEY (id);

CREATE INDEX idx_interactions_target ON interactions(target_id, target_type);

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
  model_count INTEGER := 0;
BEGIN
  -- Verify all models now use UUID as primary key
  SELECT COUNT(*) INTO model_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'id'
    AND table_name IN (
      'courses', 'enrollments', 'lessons', 'quests', 'properties',
      'marketplace_listings', 'marketplace_reviews', 'transactions',
      'certificates', 'assessments', 'classified_ads', 'interactions'
    )
    AND data_type = 'uuid';
  
  IF model_count = 12 THEN
    RAISE NOTICE 'Migration successful. All 12 models now use UUID as primary key.';
  ELSE
    RAISE WARNING 'Expected 12 models with UUID primary keys, found %', model_count;
  END IF;
END $$;
