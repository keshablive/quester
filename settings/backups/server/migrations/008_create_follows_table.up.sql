CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    follower_id UUID NOT NULL,
    following_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_follows_tenant 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_follows_follower 
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_follows_following 
        FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Prevent duplicate follows
    CONSTRAINT uq_follows_tenant_follower_following 
        UNIQUE (tenant_id, follower_id, following_id),
    
    -- Prevent self-follow
    CONSTRAINT chk_follows_not_self 
        CHECK (follower_id != following_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_follows_tenant ON follows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(tenant_id, follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(tenant_id, following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(tenant_id, created_at DESC);
