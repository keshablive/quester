-- Migration: Ensure UUID consistency across all user-related foreign keys
-- This fixes the schema mismatch where users.id is UUID but foreign keys are integer

-- Step 1: Migrate courses.instructor_id from integer to UUID
-- First, drop the foreign key constraint
ALTER TABLE courses DROP CONSTRAINT IF EXISTS fk_courses_instructor;

-- Check if there's any data in courses
DO $$
BEGIN
    -- If courses table has data, we need to handle it carefully
    IF EXISTS (SELECT 1 FROM courses LIMIT 1) THEN
        RAISE EXCEPTION 'Cannot migrate: courses table contains data. Manual data migration required.';
    END IF;
END $$;

-- Add temporary UUID column
ALTER TABLE courses ADD COLUMN instructor_uuid UUID;

-- Drop old integer column
ALTER TABLE courses DROP COLUMN instructor_id;

-- Rename new column
ALTER TABLE courses RENAME COLUMN instructor_uuid TO instructor_id;

-- Set NOT NULL constraint
ALTER TABLE courses ALTER COLUMN instructor_id SET NOT NULL;

-- Recreate foreign key with UUID
ALTER TABLE courses ADD CONSTRAINT fk_courses_instructor 
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE;

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);

-- Step 2: Migrate lesson_completions.user_id from integer to UUID
ALTER TABLE lesson_completions DROP CONSTRAINT IF EXISTS fk_lesson_completions_user;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM lesson_completions LIMIT 1) THEN
        RAISE EXCEPTION 'Cannot migrate: lesson_completions table contains data. Manual data migration required.';
    END IF;
END $$;

ALTER TABLE lesson_completions ADD COLUMN user_uuid UUID;
ALTER TABLE lesson_completions DROP COLUMN user_id;
ALTER TABLE lesson_completions RENAME COLUMN user_uuid TO user_id;
ALTER TABLE lesson_completions ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE lesson_completions ADD CONSTRAINT fk_lesson_completions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 3: Migrate enrollments.user_id from integer to UUID
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS fk_enrollments_user;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM enrollments LIMIT 1) THEN
        RAISE EXCEPTION 'Cannot migrate: enrollments table contains data. Manual data migration required.';
    END IF;
END $$;

ALTER TABLE enrollments ADD COLUMN user_uuid UUID;
ALTER TABLE enrollments DROP COLUMN user_id;
ALTER TABLE enrollments RENAME COLUMN user_uuid TO user_id;
ALTER TABLE enrollments ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE enrollments ADD CONSTRAINT fk_enrollments_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);

-- Step 4: Migrate certificates.user_id from integer to UUID
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS fk_certificates_user;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM certificates LIMIT 1) THEN
        RAISE EXCEPTION 'Cannot migrate: certificates table contains data. Manual data migration required.';
    END IF;
END $$;

ALTER TABLE certificates ADD COLUMN user_uuid UUID;
ALTER TABLE certificates DROP COLUMN user_id;
ALTER TABLE certificates RENAME COLUMN user_uuid TO user_id;
ALTER TABLE certificates ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE certificates ADD CONSTRAINT fk_certificates_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 5: Migrate tenants.id from bigint to UUID
-- WARNING: This is a major change that affects users.tenant_id foreign keys
-- First check if there's data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tenants LIMIT 1) THEN
        RAISE EXCEPTION 'Cannot migrate: tenants table contains data. Manual data migration required.';
    END IF;
    IF EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        RAISE EXCEPTION 'Cannot migrate: users table contains data that references tenants. Manual data migration required.';
    END IF;
END $$;

-- Drop sequence (will be replaced by UUID generation)
DROP SEQUENCE IF EXISTS tenants_id_seq CASCADE;

-- Recreate tenants table with UUID primary key
DROP TABLE IF EXISTS tenants CASCADE;

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);

-- Note: After this migration, you'll need to:
-- 1. Update Course model: InstructorID from uint to uuid.UUID
-- 2. Update LessonCompletion model: UserID from uint to uuid.UUID  
-- 3. Update Enrollment model: UserID from uint to uuid.UUID
-- 4. Update Certificate model: UserID from uint to uuid.UUID
-- 5. Update Tenant model: ID from uint to uuid.UUID
-- 6. Update all service contracts to use uuid.UUID instead of uint for user IDs
