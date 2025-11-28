-- Migration 010: Create social engagement tables
-- User Story 8: Social Features with AI Moderation

-- Create moderation_configs table for per-content-type thresholds
CREATE TABLE IF NOT EXISTS moderation_configs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- quest, course, video, property, etc.
    auto_remove_threshold DECIMAL(5, 2) NOT NULL DEFAULT 95.0, -- >95% confidence = auto-reject
    review_threshold DECIMAL(5, 2) NOT NULL DEFAULT 70.0, -- 70-95% = flag for review
    auto_approve_threshold DECIMAL(5, 2) NOT NULL DEFAULT 70.0, -- <70% = auto-approve
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_moderation_configs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Unique constraint: one config per content type per tenant
    CONSTRAINT uk_moderation_config_unique UNIQUE (tenant_id, content_type)
);

-- Create interactions table (polymorphic for likes, comments, shares, ratings)
CREATE TABLE IF NOT EXISTS interactions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    target_type VARCHAR(50) NOT NULL, -- quest, course, lesson, video, property, listing, badge
    target_id BIGINT NOT NULL,
    interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('like', 'comment', 'share', 'rate')),
    content TEXT, -- Comment text or share message
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Star rating (1-5)
    parent_interaction_id BIGINT, -- For nested comments (unlimited depth)
    depth INTEGER NOT NULL DEFAULT 0, -- Nesting level (0 = top-level)
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
    moderation_confidence DECIMAL(5, 2), -- AI confidence score (0-100)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_interactions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_interactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_interactions_parent FOREIGN KEY (parent_interaction_id) REFERENCES interactions(id) ON DELETE CASCADE
);

-- Create moderation_queue table for flagged content
CREATE TABLE IF NOT EXISTS moderation_queue (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    interaction_id BIGINT NOT NULL,
    reporter_id BIGINT, -- User who reported (if manual report)
    reason TEXT NOT NULL,
    ai_categories JSONB, -- OpenAI categories {"hate": 0.85, "sexual": 0.1}
    reviewed_by BIGINT, -- Moderator who reviewed
    reviewed_at TIMESTAMP WITH TIME ZONE, -- Review timestamp
    action VARCHAR(20) CHECK (action IN ('approved', 'removed', 'warned', 'banned')),
    moderator_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_moderation_queue_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_moderation_queue_interaction FOREIGN KEY (interaction_id) REFERENCES interactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_moderation_queue_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_moderation_queue_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Unique constraint: one queue entry per interaction
    CONSTRAINT uk_moderation_queue_interaction UNIQUE (interaction_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================

-- Moderation Configs Indexes
CREATE INDEX IF NOT EXISTS idx_moderation_configs_tenant ON moderation_configs(tenant_id);

-- Interactions Indexes
CREATE INDEX IF NOT EXISTS idx_interactions_tenant ON interactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user ON interactions(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_target ON interactions(tenant_id, target_type, target_id); -- Composite index for target queries
CREATE INDEX IF NOT EXISTS idx_interactions_parent ON interactions(parent_interaction_id) WHERE parent_interaction_id IS NOT NULL; -- Partial index for nested comments
CREATE INDEX IF NOT EXISTS idx_interactions_moderation ON interactions(tenant_id, moderation_status); -- For filtering by status
CREATE INDEX IF NOT EXISTS idx_interactions_created ON interactions(created_at DESC); -- For sorting by recency
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(interaction_type); -- For filtering by type

-- Moderation Queue Indexes
CREATE INDEX IF NOT EXISTS idx_moderation_queue_tenant ON moderation_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_reporter ON moderation_queue(reporter_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_reviewer ON moderation_queue(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_reviewed ON moderation_queue(tenant_id, reviewed_at); -- For filtering pending/reviewed
CREATE INDEX IF NOT EXISTS idx_moderation_queue_pending ON moderation_queue(tenant_id) WHERE reviewed_at IS NULL; -- Partial index for pending items
CREATE INDEX IF NOT EXISTS idx_moderation_queue_created ON moderation_queue(created_at DESC); -- For sorting by submission time

-- JSONB GIN index for ai_categories for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_moderation_queue_ai_categories ON moderation_queue USING GIN (ai_categories);

-- ============================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_moderation_configs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_interactions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_moderation_configs_timestamp ON moderation_configs;
CREATE TRIGGER trigger_update_moderation_configs_timestamp
    BEFORE UPDATE ON moderation_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_moderation_configs_timestamp();

DROP TRIGGER IF EXISTS trigger_update_interactions_timestamp ON interactions;
CREATE TRIGGER trigger_update_interactions_timestamp
    BEFORE UPDATE ON interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_interactions_timestamp();

-- ============================================
-- DEFAULT MODERATION CONFIGS FOR SEED DATA
-- ============================================

-- Insert default moderation configs (will be created per tenant during tenant setup)
-- These are example thresholds that can be customized per content type
COMMENT ON TABLE moderation_configs IS 'Per-content-type AI moderation thresholds. Confidence > auto_remove_threshold = auto-reject, between review_threshold and auto_remove_threshold = flag for review, < auto_approve_threshold = auto-approve';
COMMENT ON TABLE interactions IS 'Polymorphic social interactions (likes, comments, shares, ratings) on any content type. Supports unlimited comment nesting via parent_interaction_id';
COMMENT ON TABLE moderation_queue IS 'Queue for content flagged by AI or users for manual moderator review. Tracks AI category scores and moderator decisions';

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

-- Moderation Configs Comments
COMMENT ON COLUMN moderation_configs.content_type IS 'Type of content: quest, course, video, property, etc.';
COMMENT ON COLUMN moderation_configs.auto_remove_threshold IS 'AI confidence > this value = auto-reject (default 95%)';
COMMENT ON COLUMN moderation_configs.review_threshold IS 'AI confidence between review and remove threshold = flag for human review (default 70-95%)';
COMMENT ON COLUMN moderation_configs.auto_approve_threshold IS 'AI confidence < this value = auto-approve (default 70%)';

-- Interactions Comments
COMMENT ON COLUMN interactions.target_type IS 'Polymorphic target entity type (quest, course, lesson, video, property, listing, badge)';
COMMENT ON COLUMN interactions.target_id IS 'ID of the target entity';
COMMENT ON COLUMN interactions.interaction_type IS 'Type of interaction: like, comment, share, rate';
COMMENT ON COLUMN interactions.content IS 'Comment text or share message (nullable for likes/ratings)';
COMMENT ON COLUMN interactions.rating IS 'Star rating 1-5 (only for rate interaction_type)';
COMMENT ON COLUMN interactions.parent_interaction_id IS 'Parent comment ID for nested replies (unlimited depth)';
COMMENT ON COLUMN interactions.depth IS 'Nesting level: 0 = top-level, 1 = first reply, 2 = reply to reply, etc.';
COMMENT ON COLUMN interactions.moderation_status IS 'Moderation state: pending, approved, rejected, flagged';
COMMENT ON COLUMN interactions.moderation_confidence IS 'AI confidence score 0-100 from OpenAI Moderation API';

-- Moderation Queue Comments
COMMENT ON COLUMN moderation_queue.interaction_id IS 'The interaction being reviewed';
COMMENT ON COLUMN moderation_queue.reporter_id IS 'User who reported (null for AI-flagged)';
COMMENT ON COLUMN moderation_queue.reason IS 'Reason for flagging (AI reason or user report reason)';
COMMENT ON COLUMN moderation_queue.ai_categories IS 'OpenAI Moderation API categories JSONB: {"hate": 0.85, "sexual": 0.1, "violence": 0.3}';
COMMENT ON COLUMN moderation_queue.reviewed_by IS 'Moderator who reviewed this item';
COMMENT ON COLUMN moderation_queue.reviewed_at IS 'Timestamp when reviewed (null = pending)';
COMMENT ON COLUMN moderation_queue.action IS 'Moderator decision: approved, removed, warned, banned';
COMMENT ON COLUMN moderation_queue.moderator_notes IS 'Notes from moderator about their decision';

-- ============================================
-- SAMPLE QUERIES FOR TESTING
-- ============================================

-- Query: Get all interactions for a specific quest
-- SELECT * FROM interactions WHERE tenant_id = 1 AND target_type = 'quest' AND target_id = 123 ORDER BY created_at DESC;

-- Query: Get nested comments for a specific interaction (recursive)
-- WITH RECURSIVE comment_tree AS (
--     SELECT *, 0 AS level FROM interactions WHERE id = 456
--     UNION ALL
--     SELECT i.*, ct.level + 1 FROM interactions i
--     INNER JOIN comment_tree ct ON i.parent_interaction_id = ct.id
-- )
-- SELECT * FROM comment_tree ORDER BY level, created_at;

-- Query: Get pending moderation items
-- SELECT mq.*, i.content FROM moderation_queue mq
-- INNER JOIN interactions i ON mq.interaction_id = i.id
-- WHERE mq.tenant_id = 1 AND mq.reviewed_at IS NULL
-- ORDER BY mq.created_at ASC;

-- Query: Get moderation stats by category
-- SELECT 
--     (ai_categories->>'hate')::DECIMAL AS hate_score,
--     COUNT(*) as count
-- FROM moderation_queue
-- WHERE tenant_id = 1 AND ai_categories->>'hate' IS NOT NULL
-- GROUP BY hate_score
-- ORDER BY hate_score DESC;
