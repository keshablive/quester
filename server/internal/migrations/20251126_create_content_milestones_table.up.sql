-- Content Milestones table
-- FR-009: Award content creator bonuses at engagement milestones (10, 50, 100+ likes)
-- US5: Content Creator Rewards

CREATE TABLE IF NOT EXISTS content_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Content reference
    content_type VARCHAR(50) NOT NULL, -- 'Post'
    content_id UUID NOT NULL,
    author_id UUID NOT NULL, -- Content creator who receives the bonus
    
    -- Milestone details
    milestone_type VARCHAR(50) NOT NULL, -- 'trending', 'viral', 'legendary'
    threshold INT NOT NULL, -- Likes count that triggered this milestone
    xp_bonus INT NOT NULL, -- XP awarded
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_milestone_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_milestone_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_milestone_content_type CHECK (content_type IN ('Post')),
    CONSTRAINT chk_milestone_type CHECK (milestone_type IN ('trending', 'viral', 'legendary')),
    
    -- Prevent duplicate milestones (one per content per milestone type)
    CONSTRAINT uq_content_milestone UNIQUE (tenant_id, content_type, content_id, milestone_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_milestone_tenant ON content_milestones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_milestone_author ON content_milestones(tenant_id, author_id);
CREATE INDEX IF NOT EXISTS idx_milestone_content ON content_milestones(tenant_id, content_type, content_id);

-- Comments
COMMENT ON TABLE content_milestones IS 'Tracks engagement milestones awarded to content creators';
COMMENT ON COLUMN content_milestones.milestone_type IS 'trending=10 likes (25 XP), viral=50 likes (100 XP), legendary=100 likes (250 XP)';
COMMENT ON COLUMN content_milestones.threshold IS 'The like count that triggered this milestone';
