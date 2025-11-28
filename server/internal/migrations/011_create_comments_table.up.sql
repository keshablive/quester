CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    parent_id UUID,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_comments_tenant 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_post 
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_parent 
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_comments_tenant ON comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(tenant_id, post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(tenant_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON comments(deleted_at);

-- Composite index for post comments queries
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(tenant_id, post_id, created_at DESC) 
    WHERE deleted_at IS NULL AND parent_id IS NULL;

-- Index for comment replies
CREATE INDEX IF NOT EXISTS idx_comments_parent_created ON comments(tenant_id, parent_id, created_at ASC) 
    WHERE deleted_at IS NULL AND parent_id IS NOT NULL;
