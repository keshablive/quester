-- Rollback daily challenges tables

DROP INDEX IF EXISTS idx_perfect_day_user;
DROP TABLE IF EXISTS perfect_day_bonuses;

DROP INDEX IF EXISTS idx_user_challenge_active;
DROP INDEX IF EXISTS idx_user_challenge_date;
DROP INDEX IF EXISTS idx_user_challenge_user;
DROP INDEX IF EXISTS idx_user_challenge_tenant;
DROP TABLE IF EXISTS user_daily_challenges;

DROP INDEX IF EXISTS idx_challenge_template_active;
DROP INDEX IF EXISTS idx_challenge_template_tenant;
DROP TABLE IF EXISTS daily_challenge_templates;
