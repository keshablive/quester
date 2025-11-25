-- Migration: Create achievements tables
-- Description: Add achievement system with multi-step progress tracking
-- Date: 2025-11-06

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon_url VARCHAR(500) NOT NULL,
    category VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    target_count INTEGER NOT NULL DEFAULT 1,
    hidden BOOLEAN NOT NULL DEFAULT false,
    xp_reward INTEGER NOT NULL DEFAULT 0,
    badge_id UUID,
    difficulty VARCHAR(20) NOT NULL DEFAULT 'medium',
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_achievements_badge FOREIGN KEY (badge_id) 
        REFERENCES badges(uuid) ON DELETE SET NULL,
    CONSTRAINT chk_achievements_target_count CHECK (target_count >= 1),
    CONSTRAINT chk_achievements_xp_reward CHECK (xp_reward >= 0),
    CONSTRAINT chk_achievements_category CHECK (category IN (
        'learning', 'social', 'mastery', 'explorer', 'streak', 'milestone'
    )),
    CONSTRAINT chk_achievements_type CHECK (type IN (
        'count', 'streak', 'collection', 'milestone', 'threshold'
    )),
    CONSTRAINT chk_achievements_difficulty CHECK (difficulty IN (
        'easy', 'medium', 'hard', 'epic'
    ))
);

-- Create indexes for achievements
CREATE INDEX idx_achievements_tenant ON achievements(tenant_id);
CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_badge ON achievements(badge_id);
CREATE INDEX idx_achievements_active ON achievements(active);

-- Create achievement_steps table for multi-step achievements
CREATE TABLE IF NOT EXISTS achievement_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    achievement_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_achievement_steps_achievement FOREIGN KEY (achievement_id)
        REFERENCES achievements(id) ON DELETE CASCADE
);

-- Create index for achievement steps
CREATE INDEX idx_achievement_steps_achievement ON achievement_steps(achievement_id);

-- Create user_achievements table for progress tracking
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    achievement_id UUID NOT NULL,
    current_count INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP,
    first_progress_at TIMESTAMP,
    last_progress_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_user_achievements_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_achievements_achievement FOREIGN KEY (achievement_id)
        REFERENCES achievements(id) ON DELETE CASCADE,
    CONSTRAINT chk_user_achievements_current_count CHECK (current_count >= 0),
    CONSTRAINT uq_user_achievement UNIQUE (user_id, achievement_id)
);

-- Create indexes for user_achievements
CREATE INDEX idx_user_achievements_tenant ON user_achievements(tenant_id);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement ON user_achievements(achievement_id);
CREATE INDEX idx_user_achievements_completed ON user_achievements(completed);
CREATE INDEX idx_user_achievements_user_completed ON user_achievements(user_id, completed);

-- Create user_achievement_step_progress table
CREATE TABLE IF NOT EXISTS user_achievement_step_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_achievement_id UUID NOT NULL,
    achievement_step_id UUID NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_user_achievement_step_progress_user_ach FOREIGN KEY (user_achievement_id)
        REFERENCES user_achievements(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_achievement_step_progress_step FOREIGN KEY (achievement_step_id)
        REFERENCES achievement_steps(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_achievement_step UNIQUE (user_achievement_id, achievement_step_id)
);

-- Create indexes for user_achievement_step_progress
CREATE INDEX idx_user_achievement_step_user_ach ON user_achievement_step_progress(user_achievement_id);
CREATE INDEX idx_user_achievement_step_step ON user_achievement_step_progress(achievement_step_id);

-- Create updated_at trigger for achievements
CREATE OR REPLACE FUNCTION update_achievements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_achievements_updated_at
    BEFORE UPDATE ON achievements
    FOR EACH ROW
    EXECUTE FUNCTION update_achievements_updated_at();

-- Create updated_at trigger for user_achievements
CREATE TRIGGER trigger_user_achievements_updated_at
    BEFORE UPDATE ON user_achievements
    FOR EACH ROW
    EXECUTE FUNCTION update_achievements_updated_at();

-- Create updated_at trigger for user_achievement_step_progress
CREATE TRIGGER trigger_user_achievement_step_progress_updated_at
    BEFORE UPDATE ON user_achievement_step_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_achievements_updated_at();

-- Insert seed achievements (learning category examples)
INSERT INTO achievements (tenant_id, name, description, icon_url, category, type, target_count, hidden, xp_reward, difficulty, sort_order)
VALUES
    -- Learning achievements
    (gen_random_uuid(), 'First Steps', 'Complete your first lesson', 'https://example.com/badges/first-lesson.png', 'learning', 'milestone', 1, false, 10, 'easy', 1),
    (gen_random_uuid(), 'Knowledge Seeker', 'Complete 5 lessons', 'https://example.com/badges/5-lessons.png', 'learning', 'count', 5, false, 50, 'easy', 2),
    (gen_random_uuid(), 'Dedicated Learner', 'Complete 10 lessons', 'https://example.com/badges/10-lessons.png', 'learning', 'count', 10, false, 100, 'medium', 3),
    (gen_random_uuid(), 'Scholar', 'Complete 25 lessons', 'https://example.com/badges/25-lessons.png', 'learning', 'count', 25, false, 250, 'hard', 4),
    (gen_random_uuid(), 'Master Learner', 'Complete 50 lessons', 'https://example.com/badges/50-lessons.png', 'learning', 'count', 50, true, 500, 'epic', 5),
    
    -- Course achievements
    (gen_random_uuid(), 'Course Graduate', 'Complete your first course', 'https://example.com/badges/first-course.png', 'learning', 'milestone', 1, false, 100, 'medium', 10),
    (gen_random_uuid(), 'Lifelong Learner', 'Complete 3 courses', 'https://example.com/badges/3-courses.png', 'learning', 'count', 3, false, 300, 'medium', 11),
    (gen_random_uuid(), 'Expert Student', 'Complete 5 courses', 'https://example.com/badges/5-courses.png', 'learning', 'count', 5, false, 500, 'hard', 12),
    
    -- Streak achievements
    (gen_random_uuid(), 'Consistent Learner', 'Complete lessons 3 days in a row', 'https://example.com/badges/3-day-streak.png', 'streak', 'streak', 3, false, 30, 'easy', 20),
    (gen_random_uuid(), 'Weekly Warrior', 'Complete lessons 7 days in a row', 'https://example.com/badges/7-day-streak.png', 'streak', 'streak', 7, false, 70, 'medium', 21),
    (gen_random_uuid(), 'Unstoppable', 'Complete lessons 30 days in a row', 'https://example.com/badges/30-day-streak.png', 'streak', 'streak', 30, true, 300, 'epic', 22),
    
    -- XP threshold achievements
    (gen_random_uuid(), 'XP Novice', 'Earn 100 XP', 'https://example.com/badges/xp-100.png', 'milestone', 'threshold', 100, false, 10, 'easy', 30),
    (gen_random_uuid(), 'XP Apprentice', 'Earn 500 XP', 'https://example.com/badges/xp-500.png', 'milestone', 'threshold', 500, false, 50, 'medium', 31),
    (gen_random_uuid(), 'XP Master', 'Earn 1000 XP', 'https://example.com/badges/xp-1000.png', 'milestone', 'threshold', 1000, false, 100, 'hard', 32),
    (gen_random_uuid(), 'XP Legend', 'Earn 5000 XP', 'https://example.com/badges/xp-5000.png', 'milestone', 'threshold', 5000, true, 500, 'epic', 33);

COMMENT ON TABLE achievements IS 'Achievement definitions with progress tracking and rewards';
COMMENT ON TABLE achievement_steps IS 'Individual steps for multi-step achievements';
COMMENT ON TABLE user_achievements IS 'User progress towards achievements';
COMMENT ON TABLE user_achievement_step_progress IS 'User completion status for achievement steps';
