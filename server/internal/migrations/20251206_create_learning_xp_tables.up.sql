-- Learning XP Transactions table (T001)
-- Records each XP award from learning activities
-- FR-001: Award XP for lesson/course completion
-- FR-002: Prevent duplicate XP awards
-- FR-003: Separate learning XP from social XP

-- Add timezone field to users if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) NOT NULL DEFAULT 'UTC';

-- Create learning_xp_transactions table
CREATE TABLE IF NOT EXISTS learning_xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Action details
    action_type VARCHAR(50) NOT NULL, -- 'lesson_completion', 'course_completion', 'streak_bonus', 'challenge', 'achievement'
    xp_amount INT NOT NULL,
    
    -- Content reference (for duplicate prevention)
    content_type VARCHAR(50), -- 'Lesson', 'Course', 'Challenge'
    content_id UUID,
    
    -- Metadata
    description VARCHAR(255),
    multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00, -- For streak/bonus multipliers
    
    -- Async processing
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_learning_xp_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_learning_xp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_learning_xp_action_type CHECK (action_type IN ('lesson_completion', 'course_completion', 'streak_bonus', 'challenge', 'achievement', 'level_up')),
    CONSTRAINT chk_learning_xp_amount CHECK (xp_amount > 0)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_learning_xp_tenant ON learning_xp_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_learning_xp_user ON learning_xp_transactions(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_learning_xp_action ON learning_xp_transactions(tenant_id, action_type);
CREATE INDEX IF NOT EXISTS idx_learning_xp_created ON learning_xp_transactions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_xp_processed ON learning_xp_transactions(processed) WHERE processed = false;

-- Unique constraint for duplicate prevention (one XP per user-content-action)
CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_xp_unique_action 
    ON learning_xp_transactions(tenant_id, user_id, action_type, content_type, content_id) 
    WHERE content_id IS NOT NULL;

-- User learning stats table for aggregated learning XP tracking
CREATE TABLE IF NOT EXISTS user_learning_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- XP totals
    total_learning_xp INT NOT NULL DEFAULT 0,
    
    -- Activity counts (for achievement tracking)
    lessons_completed INT NOT NULL DEFAULT 0,
    courses_completed INT NOT NULL DEFAULT 0,
    quizzes_passed INT NOT NULL DEFAULT 0,
    perfect_scores INT NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_user_learning_stats_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_learning_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Unique per user per tenant
    CONSTRAINT uq_user_learning_stats UNIQUE (tenant_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_learning_stats_tenant ON user_learning_stats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_stats_xp ON user_learning_stats(tenant_id, total_learning_xp DESC);

COMMENT ON TABLE learning_xp_transactions IS 'Records all XP earned through learning activities (lessons, courses, challenges)';
COMMENT ON TABLE user_learning_stats IS 'Aggregated learning statistics per user for leaderboards and achievements';
