-- Rollback learning XP tables (T002)

DROP INDEX IF EXISTS idx_user_learning_stats_xp;
DROP INDEX IF EXISTS idx_user_learning_stats_tenant;
DROP TABLE IF EXISTS user_learning_stats;

DROP INDEX IF EXISTS idx_learning_xp_unique_action;
DROP INDEX IF EXISTS idx_learning_xp_processed;
DROP INDEX IF EXISTS idx_learning_xp_created;
DROP INDEX IF EXISTS idx_learning_xp_action;
DROP INDEX IF EXISTS idx_learning_xp_user;
DROP INDEX IF EXISTS idx_learning_xp_tenant;
DROP TABLE IF EXISTS learning_xp_transactions;

-- Note: Not removing timezone from users as it may be used by other features
