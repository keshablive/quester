-- Rollback user_achievement_badges table

DROP INDEX IF EXISTS idx_uab_awarded_at;
DROP INDEX IF EXISTS idx_uab_badge;
DROP INDEX IF EXISTS idx_uab_achievement;
DROP INDEX IF EXISTS idx_uab_user;
DROP INDEX IF EXISTS idx_uab_tenant;

DROP TABLE IF EXISTS user_achievement_badges;
