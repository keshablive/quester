-- Rollback: Drop achievements tables
-- Description: Remove achievement system tables
-- Date: 2025-11-06

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_user_achievement_step_progress_updated_at ON user_achievement_step_progress;
DROP TRIGGER IF EXISTS trigger_user_achievements_updated_at ON user_achievements;
DROP TRIGGER IF EXISTS trigger_achievements_updated_at ON achievements;

-- Drop function
DROP FUNCTION IF EXISTS update_achievements_updated_at();

-- Drop tables in reverse order (respecting foreign keys)
DROP TABLE IF EXISTS user_achievement_step_progress CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievement_steps CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
