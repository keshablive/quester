-- Rollback instructor badge fields (T012)

DROP INDEX IF EXISTS idx_user_badges_awarded_by;
ALTER TABLE user_badges DROP CONSTRAINT IF EXISTS fk_user_badges_awarded_by;
ALTER TABLE user_badges DROP COLUMN IF EXISTS award_message;
ALTER TABLE user_badges DROP COLUMN IF EXISTS awarded_by;
