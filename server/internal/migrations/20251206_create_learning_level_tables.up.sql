-- Learning Levels table (T005)
-- Defines XP thresholds for each level
-- FR-006: Level-based progression system with escalating thresholds

CREATE TABLE IF NOT EXISTS learning_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Level definition
    level_number INT NOT NULL,
    level_name VARCHAR(100) NOT NULL,
    min_xp INT NOT NULL,
    max_xp INT, -- NULL for max level
    
    -- Rewards
    badge_id UUID, -- Optional badge awarded at this level
    
    -- Display
    icon_url VARCHAR(500),
    color_hex VARCHAR(7), -- e.g., '#FF5733'
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_learning_levels_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Unique per level per tenant
    CONSTRAINT uq_learning_levels UNIQUE (tenant_id, level_number),
    
    -- Constraints
    CONSTRAINT chk_learning_level_positive CHECK (level_number > 0),
    CONSTRAINT chk_learning_level_xp CHECK (min_xp >= 0 AND (max_xp IS NULL OR max_xp > min_xp))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learning_levels_tenant ON learning_levels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_learning_levels_xp ON learning_levels(tenant_id, min_xp);

-- Insert default learning levels (using UUID for default tenant, will need to be inserted per tenant)
-- These are template levels that can be copied for each tenant

COMMENT ON TABLE learning_levels IS 'Defines XP thresholds and rewards for each learning level per tenant';

-- Note: Default levels should be seeded per tenant during tenant creation
-- Example level progression:
-- Level 1: Beginner (0-99 XP)
-- Level 2: Novice (100-299 XP)
-- Level 3: Apprentice (300-599 XP)
-- Level 4: Intermediate (600-999 XP)
-- Level 5: Skilled (1000-1499 XP)
-- Level 6: Proficient (1500-2099 XP)
-- Level 7: Advanced (2100-2799 XP)
-- Level 8: Expert (2800-3599 XP)
-- Level 9: Master (3600-4499 XP)
-- Level 10: Grandmaster (4500+ XP)
