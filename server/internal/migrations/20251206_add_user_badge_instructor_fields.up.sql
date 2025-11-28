-- Add instructor badge fields (T011)
-- Allows instructors to award badges with attribution
-- FR-019: Instructor badge awards with message

-- Add awarded_by and award_message columns to user_badges table
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS awarded_by UUID;
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS award_message VARCHAR(500);

-- Add foreign key constraint for awarded_by
ALTER TABLE user_badges 
    ADD CONSTRAINT fk_user_badges_awarded_by 
    FOREIGN KEY (awarded_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add index for instructor queries
CREATE INDEX IF NOT EXISTS idx_user_badges_awarded_by ON user_badges(awarded_by) WHERE awarded_by IS NOT NULL;

COMMENT ON COLUMN user_badges.awarded_by IS 'User ID of instructor who awarded this badge (NULL for system awards)';
COMMENT ON COLUMN user_badges.award_message IS 'Personal message from instructor when awarding badge';
