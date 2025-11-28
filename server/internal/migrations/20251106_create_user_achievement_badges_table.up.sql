-- Create user_achievement_badges table for UUID-based achievement → badge mapping
-- This table tracks which badges were unlocked via achievements (independent of legacy badge system)

CREATE TABLE IF NOT EXISTS user_achievement_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    achievement_id UUID NOT NULL,
    badge_id UUID NOT NULL,
    awarded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_uab_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_uab_achievement FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    
    -- Prevent duplicate badge awards for same achievement
    CONSTRAINT uq_user_achievement_badge UNIQUE (user_id, achievement_id, badge_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_uab_tenant ON user_achievement_badges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_uab_user ON user_achievement_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_uab_achievement ON user_achievement_badges(achievement_id);
CREATE INDEX IF NOT EXISTS idx_uab_badge ON user_achievement_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_uab_awarded_at ON user_achievement_badges(awarded_at DESC);

-- Comment for documentation
COMMENT ON TABLE user_achievement_badges IS 'UUID-based mapping between achievements and unlocked badges (independent of legacy int64 badge system)';
COMMENT ON COLUMN user_achievement_badges.badge_id IS 'Badge UUID from achievement.badge_id (may not map to legacy badges table yet)';
