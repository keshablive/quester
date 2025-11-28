-- Rollback learning streak tables (T004)

DROP INDEX IF EXISTS idx_streak_milestones_user;
DROP TABLE IF EXISTS learning_streak_milestones;

DROP INDEX IF EXISTS idx_learning_streaks_last_activity;
DROP INDEX IF EXISTS idx_learning_streaks_current;
DROP INDEX IF EXISTS idx_learning_streaks_user;
DROP INDEX IF EXISTS idx_learning_streaks_tenant;
DROP TABLE IF EXISTS learning_streaks;
