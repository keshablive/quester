-- Learning Challenge tables (T007)
-- Templates for daily challenges and user challenge instances
-- FR-023: Daily challenge generation and tracking
-- FR-024: Challenge progress and completion

-- Challenge templates (admin-defined challenge types)
CREATE TABLE IF NOT EXISTS learning_challenge_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Challenge definition
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NOT NULL,
    challenge_type VARCHAR(50) NOT NULL, -- 'lesson_count', 'xp_earned', 'time_spent', 'quiz_score'
    
    -- Target criteria
    target_value INT NOT NULL, -- e.g., 3 lessons, 100 XP
    target_course_id UUID, -- NULL for any course
    
    -- Rewards
    xp_reward INT NOT NULL,
    
    -- Display
    icon_url VARCHAR(500),
    difficulty VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'easy', 'medium', 'hard'
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_challenge_templates_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_challenge_type CHECK (challenge_type IN ('lesson_count', 'xp_earned', 'time_spent', 'quiz_score', 'streak_maintain')),
    CONSTRAINT chk_challenge_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard')),
    CONSTRAINT chk_challenge_target CHECK (target_value > 0),
    CONSTRAINT chk_challenge_reward CHECK (xp_reward > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_challenge_templates_tenant ON learning_challenge_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_challenge_templates_active ON learning_challenge_templates(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_challenge_templates_type ON learning_challenge_templates(tenant_id, challenge_type);

-- User challenge instances (daily challenges assigned to users)
CREATE TABLE IF NOT EXISTS user_learning_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    template_id UUID NOT NULL,
    
    -- Challenge progress
    current_progress INT NOT NULL DEFAULT 0,
    target_value INT NOT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'expired'
    
    -- Date tracking (user's local date)
    challenge_date DATE NOT NULL,
    
    -- Completion tracking
    completed_at TIMESTAMP,
    xp_awarded INT, -- NULL if not completed
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL, -- When challenge expires (end of user's day)
    
    -- Foreign keys
    CONSTRAINT fk_user_challenges_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_challenges_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_challenges_template FOREIGN KEY (template_id) REFERENCES learning_challenge_templates(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_challenge_status CHECK (status IN ('active', 'completed', 'expired')),
    CONSTRAINT chk_challenge_progress CHECK (current_progress >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_challenges_tenant ON user_learning_challenges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON user_learning_challenges(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_date ON user_learning_challenges(tenant_id, user_id, challenge_date);
CREATE INDEX IF NOT EXISTS idx_user_challenges_active ON user_learning_challenges(tenant_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_user_challenges_expires ON user_learning_challenges(expires_at) WHERE status = 'active';

-- Unique constraint: only one instance of a template per user per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_challenges_unique 
    ON user_learning_challenges(tenant_id, user_id, template_id, challenge_date);

COMMENT ON TABLE learning_challenge_templates IS 'Admin-defined templates for daily learning challenges';
COMMENT ON TABLE user_learning_challenges IS 'Individual user challenge instances with progress tracking';
