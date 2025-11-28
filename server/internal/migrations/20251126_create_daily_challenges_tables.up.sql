-- Daily Challenges tables
-- FR-010: Generate daily social challenges that reset at midnight in user's local timezone
-- US6: Daily Social Challenges

-- Challenge templates (admin-defined challenge types)
CREATE TABLE IF NOT EXISTS daily_challenge_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Challenge definition
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'post', 'like', 'comment', 'follow', 'share'
    target_count INT NOT NULL, -- Number of actions required
    xp_reward INT NOT NULL, -- XP awarded on completion
    
    -- Display
    icon_name VARCHAR(50), -- Icon identifier for UI
    sort_order INT NOT NULL DEFAULT 0,
    
    -- Status
    active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_challenge_template_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_challenge_action_type CHECK (action_type IN ('post', 'like', 'comment', 'follow', 'share', 'any')),
    CONSTRAINT chk_challenge_target CHECK (target_count > 0),
    CONSTRAINT chk_challenge_reward CHECK (xp_reward > 0)
);

CREATE INDEX IF NOT EXISTS idx_challenge_template_tenant ON daily_challenge_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_challenge_template_active ON daily_challenge_templates(tenant_id, active) WHERE active = true;

-- User's daily challenges (assigned challenges for a specific day)
CREATE TABLE IF NOT EXISTS user_daily_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    challenge_template_id UUID NOT NULL,
    
    -- Progress tracking
    current_count INT NOT NULL DEFAULT 0,
    target_count INT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP,
    
    -- XP tracking
    xp_reward INT NOT NULL,
    xp_awarded BOOLEAN NOT NULL DEFAULT false,
    
    -- Time window (user's local day)
    challenge_date DATE NOT NULL, -- The date this challenge is for
    expires_at TIMESTAMP NOT NULL, -- When this challenge expires (midnight + 24h after first view)
    first_viewed_at TIMESTAMP, -- When user first saw this challenge (locks the 24h window)
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_user_challenge_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_challenge_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_challenge_template FOREIGN KEY (challenge_template_id) REFERENCES daily_challenge_templates(id) ON DELETE CASCADE,
    
    -- Unique constraint: one challenge instance per user per template per day
    CONSTRAINT uq_user_daily_challenge UNIQUE (tenant_id, user_id, challenge_template_id, challenge_date)
);

CREATE INDEX IF NOT EXISTS idx_user_challenge_tenant ON user_daily_challenges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_user ON user_daily_challenges(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_date ON user_daily_challenges(tenant_id, user_id, challenge_date);
CREATE INDEX IF NOT EXISTS idx_user_challenge_active ON user_daily_challenges(tenant_id, user_id, completed, expires_at) 
    WHERE completed = false;

-- Perfect day tracking (bonus for completing all daily challenges)
CREATE TABLE IF NOT EXISTS perfect_day_bonuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Bonus details
    challenge_date DATE NOT NULL,
    challenges_completed INT NOT NULL,
    xp_bonus INT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_perfect_day_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_perfect_day_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- One bonus per user per day
    CONSTRAINT uq_perfect_day UNIQUE (tenant_id, user_id, challenge_date)
);

CREATE INDEX IF NOT EXISTS idx_perfect_day_user ON perfect_day_bonuses(tenant_id, user_id);

-- Comments
COMMENT ON TABLE daily_challenge_templates IS 'Admin-defined templates for daily social challenges';
COMMENT ON TABLE user_daily_challenges IS 'User-specific daily challenge instances with progress tracking';
COMMENT ON COLUMN user_daily_challenges.first_viewed_at IS 'When user first viewed challenge; locks 24h completion window';
COMMENT ON TABLE perfect_day_bonuses IS 'Bonus XP awards for completing all daily challenges';
