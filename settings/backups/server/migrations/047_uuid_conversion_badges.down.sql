-- Rollback Migration: Revert Badge and UserBadge tables from UUID back to int64
-- Feature: 001-code-reorganization
-- Date: 2025-11-07
-- WARNING: This rollback assumes no new data was created with UUID-only keys
-- If new UUIDs were created, they cannot be rolled back to int64

BEGIN;

-- =============================================================================
-- STEP 1: Add int64 columns back to badges table
-- =============================================================================
ALTER TABLE badges ADD COLUMN id_int BIGSERIAL;
ALTER TABLE badges ADD COLUMN tenant_id_int BIGINT;

-- =============================================================================
-- STEP 2: Add int64 columns back to user_badges table
-- =============================================================================
ALTER TABLE user_badges ADD COLUMN id_int BIGSERIAL;
ALTER TABLE user_badges ADD COLUMN user_id_int BIGINT;
ALTER TABLE user_badges ADD COLUMN badge_id_int BIGINT;
ALTER TABLE user_badges ADD COLUMN tenant_id_int BIGINT;
ALTER TABLE user_badges ADD COLUMN approved_by_int BIGINT;

-- =============================================================================
-- STEP 3: Populate int64 columns with sequential IDs
-- =============================================================================
-- Note: Original int64 IDs are lost during UUID migration
-- We can only assign new sequential IDs
WITH numbered_badges AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
    FROM badges
)
UPDATE badges b
SET id_int = nb.row_num
FROM numbered_badges nb
WHERE b.id = nb.id;

WITH numbered_user_badges AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY earned_at) as row_num
    FROM user_badges
)
UPDATE user_badges ub
SET id_int = nub.row_num
FROM numbered_user_badges nub
WHERE ub.id = nub.id;

-- =============================================================================
-- STEP 4: Populate foreign key int64 columns
-- =============================================================================
-- Map tenant UUIDs back to deterministic int64
UPDATE badges SET tenant_id_int = (
    ('x' || substring(tenant_id::text, 1, 8))::bit(32)::bigint
);

UPDATE user_badges SET tenant_id_int = (
    ('x' || substring(tenant_id::text, 1, 8))::bit(32)::bigint
);

-- Map user UUIDs from users table (assuming users have both UUID and int64)
-- If users table is UUID-only, this will fail - rollback not possible
UPDATE user_badges ub
SET user_id_int = u.id_int
FROM users u
WHERE ub.user_id = u.id;

-- Map badge foreign keys
UPDATE user_badges ub
SET badge_id_int = b.id_int
FROM badges b
WHERE ub.badge_id = b.id;

-- Map approved_by foreign keys
UPDATE user_badges ub
SET approved_by_int = u.id_int
FROM users u
WHERE ub.approved_by = u.id;

-- =============================================================================
-- STEP 5: Drop UUID foreign key constraints
-- =============================================================================
ALTER TABLE user_badges DROP CONSTRAINT IF EXISTS fk_user_badges_user;
ALTER TABLE user_badges DROP CONSTRAINT IF EXISTS fk_user_badges_badge;
ALTER TABLE user_badges DROP CONSTRAINT IF EXISTS fk_user_badges_approved_by;

-- =============================================================================
-- STEP 6: Drop UUID primary keys
-- =============================================================================
ALTER TABLE badges DROP CONSTRAINT IF EXISTS badges_pkey;
ALTER TABLE user_badges DROP CONSTRAINT IF EXISTS user_badges_pkey;

-- =============================================================================
-- STEP 7: Drop UUID indexes
-- =============================================================================
DROP INDEX IF EXISTS idx_badges_tenant;
DROP INDEX IF EXISTS idx_badges_category;
DROP INDEX IF EXISTS idx_user_badges_user;
DROP INDEX IF EXISTS idx_user_badges_badge;
DROP INDEX IF EXISTS idx_user_badges_tenant;
DROP INDEX IF EXISTS idx_user_badges_status;
DROP INDEX IF EXISTS idx_user_badges_approved_by;
DROP INDEX IF EXISTS idx_user_badges_cooldown;
DROP INDEX IF EXISTS idx_user_badges_unique;

-- =============================================================================
-- STEP 8: Drop UUID columns
-- =============================================================================
ALTER TABLE badges DROP COLUMN id;
ALTER TABLE badges DROP COLUMN tenant_id;

ALTER TABLE user_badges DROP COLUMN id;
ALTER TABLE user_badges DROP COLUMN user_id;
ALTER TABLE user_badges DROP COLUMN badge_id;
ALTER TABLE user_badges DROP COLUMN tenant_id;
ALTER TABLE user_badges DROP COLUMN approved_by;

-- =============================================================================
-- STEP 9: Rename int64 columns back to primary names
-- =============================================================================
ALTER TABLE badges RENAME COLUMN id_int TO id;
ALTER TABLE badges RENAME COLUMN tenant_id_int TO tenant_id;

ALTER TABLE user_badges RENAME COLUMN id_int TO id;
ALTER TABLE user_badges RENAME COLUMN user_id_int TO user_id;
ALTER TABLE user_badges RENAME COLUMN badge_id_int TO badge_id;
ALTER TABLE user_badges RENAME COLUMN tenant_id_int TO tenant_id;
ALTER TABLE user_badges RENAME COLUMN approved_by_int TO approved_by;

-- =============================================================================
-- STEP 10: Add NOT NULL constraints
-- =============================================================================
ALTER TABLE badges ALTER COLUMN id SET NOT NULL;
ALTER TABLE badges ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE user_badges ALTER COLUMN id SET NOT NULL;
ALTER TABLE user_badges ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE user_badges ALTER COLUMN badge_id SET NOT NULL;
ALTER TABLE user_badges ALTER COLUMN tenant_id SET NOT NULL;

-- =============================================================================
-- STEP 11: Add int64 primary key constraints
-- =============================================================================
ALTER TABLE badges ADD PRIMARY KEY (id);
ALTER TABLE user_badges ADD PRIMARY KEY (id);

-- =============================================================================
-- STEP 12: Recreate int64 foreign key constraints
-- =============================================================================
ALTER TABLE user_badges ADD CONSTRAINT fk_user_badges_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_badges ADD CONSTRAINT fk_user_badges_badge 
  FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE;

ALTER TABLE user_badges ADD CONSTRAINT fk_user_badges_approved_by 
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- =============================================================================
-- STEP 13: Recreate int64 indexes
-- =============================================================================
CREATE INDEX idx_badges_tenant ON badges(tenant_id);
CREATE INDEX idx_badges_category ON badges(category);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX idx_user_badges_tenant ON user_badges(tenant_id);
CREATE INDEX idx_user_badges_status ON user_badges(approval_status);
CREATE INDEX idx_user_badges_approved_by ON user_badges(approved_by) WHERE approved_by IS NOT NULL;
CREATE INDEX idx_user_badges_cooldown ON user_badges(cooldown_until) WHERE cooldown_until IS NOT NULL;

CREATE UNIQUE INDEX idx_user_badges_unique ON user_badges(tenant_id, user_id, badge_id);

-- =============================================================================
-- STEP 14: Rollback user_achievement_badges (if exists)
-- =============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_achievement_badges') THEN
        -- Add int64 columns
        ALTER TABLE user_achievement_badges ADD COLUMN id_int BIGSERIAL;
        ALTER TABLE user_achievement_badges ADD COLUMN user_id_int BIGINT;
        ALTER TABLE user_achievement_badges ADD COLUMN badge_id_int BIGINT;
        ALTER TABLE user_achievement_badges ADD COLUMN tenant_id_int BIGINT;

        -- Populate int64 columns
        WITH numbered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY awarded_at) as row_num
            FROM user_achievement_badges
        )
        UPDATE user_achievement_badges uab
        SET id_int = n.row_num
        FROM numbered n
        WHERE uab.id = n.id;

        UPDATE user_achievement_badges uab
        SET user_id_int = u.id_int
        FROM users u
        WHERE uab.user_id = u.id;

        UPDATE user_achievement_badges uab
        SET badge_id_int = b.id
        FROM badges b
        WHERE uab.badge_id = b.id;

        UPDATE user_achievement_badges SET tenant_id_int = (
            ('x' || substring(tenant_id::text, 1, 8))::bit(32)::bigint
        );

        -- Drop UUID constraints and columns
        ALTER TABLE user_achievement_badges DROP CONSTRAINT IF EXISTS user_achievement_badges_pkey;
        ALTER TABLE user_achievement_badges DROP CONSTRAINT IF EXISTS fk_user_achievement_badges_user;
        ALTER TABLE user_achievement_badges DROP CONSTRAINT IF EXISTS fk_user_achievement_badges_badge;

        ALTER TABLE user_achievement_badges DROP COLUMN id;
        ALTER TABLE user_achievement_badges DROP COLUMN user_id;
        ALTER TABLE user_achievement_badges DROP COLUMN badge_id;
        ALTER TABLE user_achievement_badges DROP COLUMN tenant_id;

        -- Rename int64 columns
        ALTER TABLE user_achievement_badges RENAME COLUMN id_int TO id;
        ALTER TABLE user_achievement_badges RENAME COLUMN user_id_int TO user_id;
        ALTER TABLE user_achievement_badges RENAME COLUMN badge_id_int TO badge_id;
        ALTER TABLE user_achievement_badges RENAME COLUMN tenant_id_int TO tenant_id;

        -- Add constraints
        ALTER TABLE user_achievement_badges ALTER COLUMN id SET NOT NULL;
        ALTER TABLE user_achievement_badges ALTER COLUMN user_id SET NOT NULL;
        ALTER TABLE user_achievement_badges ALTER COLUMN badge_id SET NOT NULL;
        ALTER TABLE user_achievement_badges ALTER COLUMN tenant_id SET NOT NULL;

        ALTER TABLE user_achievement_badges ADD PRIMARY KEY (id);

        ALTER TABLE user_achievement_badges ADD CONSTRAINT fk_user_achievement_badges_user 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

        ALTER TABLE user_achievement_badges ADD CONSTRAINT fk_user_achievement_badges_badge 
          FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE;
    END IF;
END $$;

COMMIT;

-- =============================================================================
-- WARNING
-- =============================================================================
-- This rollback script has limitations:
-- 1. Original int64 IDs are lost - new sequential IDs are assigned
-- 2. If users table is UUID-only, rollback will fail
-- 3. Any data created after UUID migration cannot be rolled back
-- 4. Foreign key relationships may be broken if IDs don't match
-- 
-- Recommendation: Test UUID migration thoroughly before production deployment
-- Consider creating a full database backup before running this migration
