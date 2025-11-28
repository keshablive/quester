-- Rollback learning level tables (T006)

DROP INDEX IF EXISTS idx_learning_levels_xp;
DROP INDEX IF EXISTS idx_learning_levels_tenant;
DROP TABLE IF EXISTS learning_levels;
