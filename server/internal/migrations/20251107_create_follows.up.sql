-- Create follows table for bidirectional user relationships
-- Supports social networking and follower/following features

CREATE TABLE IF NOT EXISTS follows (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    follower_id BIGINT NOT NULL, -- User who is following
    followee_id BIGINT NOT NULL, -- User being followed
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_follows_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_follows_followee FOREIGN KEY (followee_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT uq_follow_relationship UNIQUE (follower_id, followee_id, tenant_id),
    CONSTRAINT chk_no_self_follow CHECK (follower_id != followee_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_follows_tenant ON follows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_follows_deleted ON follows(deleted_at);

-- Comments
COMMENT ON TABLE follows IS 'Bidirectional user relationships for social networking';
COMMENT ON COLUMN follows.follower_id IS 'User who is following (initiator)';
COMMENT ON COLUMN follows.followee_id IS 'User being followed (target)';
COMMENT ON CONSTRAINT chk_no_self_follow ON follows IS 'Prevents users from following themselves';
