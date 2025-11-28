-- Drop triggers
DROP TRIGGER IF EXISTS trigger_validate_badge_auto_award ON badges;
DROP TRIGGER IF EXISTS trigger_badges_updated_at ON badges;

-- Drop functions
DROP FUNCTION IF EXISTS validate_badge_auto_award();
DROP FUNCTION IF EXISTS update_badges_updated_at();

-- Drop indexes for user_badges
DROP INDEX IF EXISTS idx_user_badges_unique;
DROP INDEX IF EXISTS idx_user_badges_status;
DROP INDEX IF EXISTS idx_user_badges_user;

-- Drop indexes for badges
DROP INDEX IF EXISTS idx_badges_category;
DROP INDEX IF EXISTS idx_badges_tenant;

-- Drop tables
DROP TABLE IF EXISTS user_badges;
DROP TABLE IF EXISTS badges;
