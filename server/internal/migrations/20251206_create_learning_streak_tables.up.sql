-- Learning Streaks table (T003)
-- Tracks daily learning streaks per user
-- FR-016: Track streaks with user timezone awareness
-- FR-017: Award bonus XP for streak milestones

CREATE TABLE IF NOT EXISTS learning_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Streak tracking
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    
    -- Timezone-aware date tracking
    last_activity_date DATE NOT NULL, -- Date in user's timezone
    last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Grace period (allows 1 day miss before reset)
    grace_period_used BOOLEAN NOT NULL DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_learning_streaks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_learning_streaks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Unique per user per tenant
    CONSTRAINT uq_learning_streaks UNIQUE (tenant_id, user_id),
    
    -- Constraints
    CONSTRAINT chk_learning_streak_positive CHECK (current_streak >= 0 AND longest_streak >= 0),
    CONSTRAINT chk_learning_streak_longest CHECK (longest_streak >= current_streak)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learning_streaks_tenant ON learning_streaks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_learning_streaks_user ON learning_streaks(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_learning_streaks_current ON learning_streaks(tenant_id, current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_learning_streaks_last_activity ON learning_streaks(last_activity_date);

-- Streak milestones table for tracking which milestones were claimed
CREATE TABLE IF NOT EXISTS learning_streak_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Milestone details
    milestone_days INT NOT NULL, -- 7, 14, 30, 60, 100
    xp_awarded INT NOT NULL,
    
    -- Timestamps
    claimed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_streak_milestones_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_streak_milestones_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Unique per milestone per user per tenant
    CONSTRAINT uq_streak_milestones UNIQUE (tenant_id, user_id, milestone_days)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_streak_milestones_user ON learning_streak_milestones(tenant_id, user_id);

COMMENT ON TABLE learning_streaks IS 'Tracks daily learning activity streaks per user with timezone awareness';
COMMENT ON TABLE learning_streak_milestones IS 'Records claimed streak milestone bonuses to prevent duplicate claims';
