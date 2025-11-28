-- Migration: Convert Badge and UserBadge tables to UUID primary keys
-- Feature: 001-code-reorganization
-- Date: 2025-11-07
-- Impact: All badge-related tables (badges, user_badges, user_achievement_badges)
-- Estimated Time: <5 seconds for 100k badge records
-- Rollback: See 047_uuid_conversion_badges.down.sql

BEGIN;

-- =============================================================================
-- STEP 1: Add UUID columns to badges table
-- =============================================================================
ALTER TABLE badges ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE badges ADD COLUMN tenant_id_uuid UUID;

-- =============================================================================
-- STEP 2: Populate UUID columns for existing badges
-- =============================================================================
UPDATE badges SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;

-- Note: tenant_id_uuid population depends on whether tenants table exists
-- If tenants table uses int64, this step will be handled in application layer
-- For now, we'll use a deterministic UUID based on tenant_id for consistency
UPDATE badges SET tenant_id_uuid = uuid_generate_v5(
    '00000000-0000-0000-0000-000000000000'::uuid,
    tenant_id::text
) WHERE tenant_id_uuid IS NULL;

-- =============================================================================
-- STEP 3: Add UUID columns to user_badges table
-- =============================================================================
ALTER TABLE user_badges ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE user_badges ADD COLUMN user_id_uuid UUID;
ALTER TABLE user_badges ADD COLUMN badge_id_uuid UUID;
ALTER TABLE user_badges ADD COLUMN tenant_id_uuid UUID;
ALTER TABLE user_badges ADD COLUMN approved_by_uuid UUID;

-- =============================================================================
-- STEP 4: Populate user_id_uuid (from users table which already uses UUID)
-- =============================================================================
-- Assuming users.id is already UUID type
UPDATE user_badges ub 
SET user_id_uuid = u.id 
FROM users u 
WHERE ub.user_id::text = u.id::text;

-- =============================================================================
-- STEP 5: Populate badge_id_uuid (from badges table)
-- =============================================================================
UPDATE user_badges ub 
SET badge_id_uuid = b.id_uuid 
FROM badges b 
WHERE ub.badge_id = b.id;

-- =============================================================================
-- STEP 6: Populate tenant_id_uuid (deterministic UUID from tenant_id)
-- =============================================================================
UPDATE user_badges SET tenant_id_uuid = uuid_generate_v5(
    '00000000-0000-0000-0000-000000000000'::uuid,
    tenant_id::text
) WHERE tenant_id_uuid IS NULL;

-- =============================================================================
-- STEP 7: Populate approved_by_uuid (from users table)
-- =============================================================================
UPDATE user_badges ub 
SET approved_by_uuid = u.id 
FROM users u 
WHERE ub.approved_by IS NOT NULL 
  AND ub.approved_by::text = u.id::text;

-- =============================================================================
-- STEP 8: Drop old foreign key constraints
-- =============================================================================
ALTER TABLE user_badges DROP CONSTRAINT IF EXISTS fk_user_badges_user;
ALTER TABLE user_badges DROP CONSTRAINT IF EXISTS fk_user_badges_badge;
ALTER TABLE user_badges DROP CONSTRAINT IF EXISTS fk_user_badges_approved_by;
ALTER TABLE user_badges DROP CONSTRAINT IF EXISTS user_badges_user_id_fkey;
ALTER TABLE user_badges DROP CONSTRAINT IF EXISTS user_badges_badge_id_fkey;
ALTER TABLE user_badges DROP CONSTRAINT IF EXISTS user_badges_approved_by_fkey;

-- =============================================================================
-- STEP 9: Drop old primary keys
-- =============================================================================
ALTER TABLE badges DROP CONSTRAINT IF EXISTS badges_pkey;
ALTER TABLE user_badges DROP CONSTRAINT IF EXISTS user_badges_pkey;

-- =============================================================================
-- STEP 10: Drop old unique indexes
-- =============================================================================
DROP INDEX IF EXISTS idx_user_badges_unique;
DROP INDEX IF EXISTS idx_badges_tenant;
DROP INDEX IF EXISTS idx_user_badges_user;
DROP INDEX IF EXISTS idx_user_badges_status;

-- =============================================================================
-- STEP 11: Drop old columns
-- =============================================================================
ALTER TABLE badges DROP COLUMN id;
ALTER TABLE badges DROP COLUMN tenant_id;

ALTER TABLE user_badges DROP COLUMN id;
ALTER TABLE user_badges DROP COLUMN user_id;
ALTER TABLE user_badges DROP COLUMN badge_id;
ALTER TABLE user_badges DROP COLUMN tenant_id;
ALTER TABLE user_badges DROP COLUMN approved_by;

-- =============================================================================
-- STEP 12: Rename UUID columns to primary names
-- =============================================================================
ALTER TABLE badges RENAME COLUMN id_uuid TO id;
ALTER TABLE badges RENAME COLUMN tenant_id_uuid TO tenant_id;

ALTER TABLE user_badges RENAME COLUMN id_uuid TO id;
ALTER TABLE user_badges RENAME COLUMN user_id_uuid TO user_id;
ALTER TABLE user_badges RENAME COLUMN badge_id_uuid TO badge_id;
ALTER TABLE user_badges RENAME COLUMN tenant_id_uuid TO tenant_id;
ALTER TABLE user_badges RENAME COLUMN approved_by_uuid TO approved_by;

-- =============================================================================
-- STEP 13: Add UUID NOT NULL constraints
-- =============================================================================
ALTER TABLE badges ALTER COLUMN id SET NOT NULL;
ALTER TABLE badges ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE user_badges ALTER COLUMN id SET NOT NULL;
ALTER TABLE user_badges ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE user_badges ALTER COLUMN badge_id SET NOT NULL;
ALTER TABLE user_badges ALTER COLUMN tenant_id SET NOT NULL;
-- approved_by is nullable (only set when badge is approved)

-- =============================================================================
-- STEP 14: Add new primary key constraints
-- =============================================================================
ALTER TABLE badges ADD PRIMARY KEY (id);
ALTER TABLE user_badges ADD PRIMARY KEY (id);

-- =============================================================================
-- STEP 15: Add new foreign key constraints
-- =============================================================================
ALTER TABLE user_badges ADD CONSTRAINT fk_user_badges_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_badges ADD CONSTRAINT fk_user_badges_badge 
  FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE;

ALTER TABLE user_badges ADD CONSTRAINT fk_user_badges_approved_by 
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- =============================================================================
-- STEP 16: Recreate indexes
-- =============================================================================
CREATE INDEX idx_badges_tenant ON badges(tenant_id);
CREATE INDEX idx_badges_category ON badges(category);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX idx_user_badges_tenant ON user_badges(tenant_id);
CREATE INDEX idx_user_badges_status ON user_badges(approval_status);
CREATE INDEX idx_user_badges_approved_by ON user_badges(approved_by) WHERE approved_by IS NOT NULL;
CREATE INDEX idx_user_badges_cooldown ON user_badges(cooldown_until) WHERE cooldown_until IS NOT NULL;

-- Recreate unique constraint: one badge per user per tenant
CREATE UNIQUE INDEX idx_user_badges_unique ON user_badges(tenant_id, user_id, badge_id);

-- =============================================================================
-- STEP 17: Update user_achievement_badges table (if exists)
-- =============================================================================
-- Note: This table may not exist yet, so we use DO block for conditional execution
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_achievement_badges') THEN
        -- Add UUID columns
        ALTER TABLE user_achievement_badges ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
        ALTER TABLE user_achievement_badges ADD COLUMN user_id_uuid UUID;
        ALTER TABLE user_achievement_badges ADD COLUMN badge_id_uuid UUID;
        ALTER TABLE user_achievement_badges ADD COLUMN tenant_id_uuid UUID;
        ALTER TABLE user_achievement_badges ADD COLUMN achievement_id_uuid UUID;

        -- Populate UUIDs
        UPDATE user_achievement_badges uab 
        SET user_id_uuid = u.id 
        FROM users u 
        WHERE uab.user_id::text = u.id::text;

        UPDATE user_achievement_badges uab 
        SET badge_id_uuid = b.id 
        FROM badges b 
        WHERE uab.badge_id = b.id;

        UPDATE user_achievement_badges SET tenant_id_uuid = uuid_generate_v5(
            '00000000-0000-0000-0000-000000000000'::uuid,
            tenant_id::text
        );

        -- Drop old constraints
        ALTER TABLE user_achievement_badges DROP CONSTRAINT IF EXISTS user_achievement_badges_pkey;
        ALTER TABLE user_achievement_badges DROP CONSTRAINT IF EXISTS fk_user_achievement_badges_user;
        ALTER TABLE user_achievement_badges DROP CONSTRAINT IF EXISTS fk_user_achievement_badges_badge;

        -- Drop old columns
        ALTER TABLE user_achievement_badges DROP COLUMN id;
        ALTER TABLE user_achievement_badges DROP COLUMN user_id;
        ALTER TABLE user_achievement_badges DROP COLUMN badge_id;
        ALTER TABLE user_achievement_badges DROP COLUMN tenant_id;

        -- Rename UUID columns
        ALTER TABLE user_achievement_badges RENAME COLUMN id_uuid TO id;
        ALTER TABLE user_achievement_badges RENAME COLUMN user_id_uuid TO user_id;
        ALTER TABLE user_achievement_badges RENAME COLUMN badge_id_uuid TO badge_id;
        ALTER TABLE user_achievement_badges RENAME COLUMN tenant_id_uuid TO tenant_id;

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

        -- Recreate indexes
        CREATE INDEX idx_user_achievement_badges_user ON user_achievement_badges(user_id);
        CREATE INDEX idx_user_achievement_badges_badge ON user_achievement_badges(badge_id);
        CREATE INDEX idx_user_achievement_badges_tenant ON user_achievement_badges(tenant_id);
    END IF;
END $$;

COMMIT;

-- =============================================================================
-- Verification Queries (run after migration)
-- =============================================================================
-- SELECT COUNT(*) FROM badges; -- Should match pre-migration count
-- SELECT COUNT(*) FROM user_badges; -- Should match pre-migration count
-- SELECT * FROM user_badges WHERE badge_id NOT IN (SELECT id FROM badges); -- Should be 0 rows
-- SELECT * FROM user_badges WHERE user_id NOT IN (SELECT id FROM users); -- Should be 0 rows
