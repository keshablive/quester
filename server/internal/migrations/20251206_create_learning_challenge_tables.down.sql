-- Rollback learning challenge tables (T008)

DROP INDEX IF EXISTS idx_user_challenges_unique;
DROP INDEX IF EXISTS idx_user_challenges_expires;
DROP INDEX IF EXISTS idx_user_challenges_active;
DROP INDEX IF EXISTS idx_user_challenges_date;
DROP INDEX IF EXISTS idx_user_challenges_user;
DROP INDEX IF EXISTS idx_user_challenges_tenant;
DROP TABLE IF EXISTS user_learning_challenges;

DROP INDEX IF EXISTS idx_challenge_templates_type;
DROP INDEX IF EXISTS idx_challenge_templates_active;
DROP INDEX IF EXISTS idx_challenge_templates_tenant;
DROP TABLE IF EXISTS learning_challenge_templates;
