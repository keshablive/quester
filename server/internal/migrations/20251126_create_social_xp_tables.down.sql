-- Rollback social XP tables

DROP INDEX IF EXISTS idx_social_xp_rate_user;
DROP TABLE IF EXISTS social_xp_rate_limits;

DROP INDEX IF EXISTS idx_user_social_stats_xp;
DROP INDEX IF EXISTS idx_user_social_stats_tenant;
DROP TABLE IF EXISTS user_social_stats;

DROP INDEX IF EXISTS idx_social_xp_unique_action;
DROP INDEX IF EXISTS idx_social_xp_processed;
DROP INDEX IF EXISTS idx_social_xp_created;
DROP INDEX IF EXISTS idx_social_xp_action;
DROP INDEX IF EXISTS idx_social_xp_user;
DROP INDEX IF EXISTS idx_social_xp_tenant;
DROP TABLE IF EXISTS social_xp_transactions;
