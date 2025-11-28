-- Social XP Transactions table
-- Records each XP award from social interactions for tracking and anti-gaming
-- FR-001: Award XP for social actions (posts, likes, comments, follows, shares)
-- FR-002: Track unique interactions to prevent XP gaming
-- FR-004: Track social-specific XP separately for social leaderboard

CREATE TABLE IF NOT EXISTS social_xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Action details
    action_type VARCHAR(50) NOT NULL, -- 'post', 'like', 'comment', 'follow', 'share'
    xp_amount INT NOT NULL,
    
    -- Content reference (for duplicate prevention)
    content_type VARCHAR(50), -- 'Post', 'Comment', 'User' (for follows)
    content_id UUID,
    
    -- Metadata
    description VARCHAR(255),
    processed BOOLEAN NOT NULL DEFAULT false, -- For async queue processing
    processed_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_social_xp_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_social_xp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_social_xp_action_type CHECK (action_type IN ('post', 'like', 'comment', 'follow', 'share', 'milestone', 'achievement', 'challenge')),
    CONSTRAINT chk_social_xp_amount CHECK (xp_amount > 0)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_social_xp_tenant ON social_xp_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_social_xp_user ON social_xp_transactions(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_social_xp_action ON social_xp_transactions(tenant_id, action_type);
CREATE INDEX IF NOT EXISTS idx_social_xp_created ON social_xp_transactions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_xp_processed ON social_xp_transactions(processed) WHERE processed = false;

-- Unique constraint for duplicate prevention (one XP per user-content-action)
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_xp_unique_action 
    ON social_xp_transactions(tenant_id, user_id, action_type, content_type, content_id) 
    WHERE content_id IS NOT NULL;

-- User social stats table for aggregated social XP tracking
CREATE TABLE IF NOT EXISTS user_social_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- XP totals
    total_social_xp INT NOT NULL DEFAULT 0,
    
    -- Activity counts (for achievement tracking)
    posts_count INT NOT NULL DEFAULT 0,
    likes_given_count INT NOT NULL DEFAULT 0,
    likes_received_count INT NOT NULL DEFAULT 0,
    comments_count INT NOT NULL DEFAULT 0,
    followers_count INT NOT NULL DEFAULT 0,
    following_count INT NOT NULL DEFAULT 0,
    shares_count INT NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_user_social_stats_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_social_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Unique per user per tenant
    CONSTRAINT uq_user_social_stats UNIQUE (tenant_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_social_stats_tenant ON user_social_stats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_social_stats_xp ON user_social_stats(tenant_id, total_social_xp DESC);

-- Rate limiting table for XP actions
CREATE TABLE IF NOT EXISTS social_xp_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Rate tracking
    action_count INT NOT NULL DEFAULT 0,
    window_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_social_xp_rate_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_social_xp_rate_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Unique per user per tenant
    CONSTRAINT uq_social_xp_rate UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_social_xp_rate_user ON social_xp_rate_limits(tenant_id, user_id);

-- Comments
COMMENT ON TABLE social_xp_transactions IS 'Records XP awards from social feed interactions';
COMMENT ON COLUMN social_xp_transactions.action_type IS 'Type of social action: post, like, comment, follow, share, milestone, achievement, challenge';
COMMENT ON COLUMN social_xp_transactions.content_id IS 'Reference to content for duplicate prevention (post_id, comment_id, user_id for follows)';
COMMENT ON TABLE user_social_stats IS 'Aggregated social activity stats per user for leaderboards and achievements';
COMMENT ON TABLE social_xp_rate_limits IS 'Rate limiting for XP actions (max 100/hour per FR-012)';
