CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_activities_tenant 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_activities_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Validate activity type
    CONSTRAINT chk_activities_type 
        CHECK (activity_type IN (
            'post_created', 'post_liked', 'post_commented', 'post_shared',
            'user_followed', 'badge_earned', 'course_completed', 'stream_started'
        ))
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_activities_tenant ON activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(tenant_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(tenant_id, created_at DESC);

-- Composite index for user activity feed
CREATE INDEX IF NOT EXISTS idx_activities_user_created ON activities(tenant_id, user_id, created_at DESC);

-- Index for entity lookups
CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(tenant_id, entity_type, entity_id);

-- JSONB index for metadata queries
CREATE INDEX IF NOT EXISTS idx_activities_metadata ON activities USING gin(metadata);
