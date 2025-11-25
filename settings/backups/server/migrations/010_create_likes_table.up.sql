CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    post_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_likes_tenant 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_likes_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_likes_post 
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    
    -- Prevent duplicate likes
    CONSTRAINT uq_likes_tenant_user_post 
        UNIQUE (tenant_id, user_id, post_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_likes_tenant ON likes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(tenant_id, post_id);
CREATE INDEX IF NOT EXISTS idx_likes_created_at ON likes(tenant_id, created_at DESC);

-- Composite index for post likes queries
CREATE INDEX IF NOT EXISTS idx_likes_post_created ON likes(tenant_id, post_id, created_at DESC);
