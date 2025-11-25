CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    media_type VARCHAR(20) NOT NULL DEFAULT 'text',
    media_url VARCHAR(512),
    visibility VARCHAR(20) NOT NULL DEFAULT 'public',
    like_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    share_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_posts_tenant 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_posts_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Validate media type
    CONSTRAINT chk_posts_media_type 
        CHECK (media_type IN ('text', 'image', 'video')),
    
    -- Validate visibility
    CONSTRAINT chk_posts_visibility 
        CHECK (visibility IN ('public', 'followers', 'private')),
    
    -- Media URL required for image/video posts
    CONSTRAINT chk_posts_media_url 
        CHECK (
            (media_type = 'text') OR 
            (media_type IN ('image', 'video') AND media_url IS NOT NULL)
        )
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_posts_tenant ON posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(tenant_id, visibility);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_deleted_at ON posts(deleted_at);

-- Composite index for user feed queries
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(tenant_id, user_id, created_at DESC) 
    WHERE deleted_at IS NULL;

-- Index for public feed queries
CREATE INDEX IF NOT EXISTS idx_posts_public_created ON posts(tenant_id, visibility, created_at DESC) 
    WHERE deleted_at IS NULL AND visibility = 'public';
