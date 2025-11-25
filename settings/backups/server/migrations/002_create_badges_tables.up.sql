-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon_url VARCHAR(500) NOT NULL,
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    points_threshold INT NOT NULL CHECK (points_threshold >= 0),
    auto_award BOOLEAN NOT NULL DEFAULT true,
    category VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for badges
CREATE INDEX idx_badges_tenant ON badges(tenant_id);
CREATE INDEX idx_badges_category ON badges(tenant_id, category);

-- Create user_badges table
CREATE TABLE IF NOT EXISTS user_badges (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id BIGINT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    approval_status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'revoked')),
    approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    earned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    evidence_url VARCHAR(500),
    notes TEXT
);

-- Create indexes for user_badges
CREATE INDEX idx_user_badges_user ON user_badges(tenant_id, user_id);
CREATE INDEX idx_user_badges_status ON user_badges(tenant_id, approval_status);
CREATE UNIQUE INDEX idx_user_badges_unique ON user_badges(tenant_id, user_id, badge_id);

-- Add trigger to update updated_at timestamp on badges
CREATE OR REPLACE FUNCTION update_badges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_badges_updated_at
BEFORE UPDATE ON badges
FOR EACH ROW
EXECUTE FUNCTION update_badges_updated_at();

-- Business rule validation: Auto-award logic
-- Badges with points_threshold < 100 MUST have auto_award = true
-- Badges with points_threshold >= 100 MUST have auto_award = false
CREATE OR REPLACE FUNCTION validate_badge_auto_award()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.points_threshold < 100 AND NEW.auto_award = false THEN
        RAISE EXCEPTION 'Badges with points_threshold < 100 must have auto_award = true';
    END IF;
    
    IF NEW.points_threshold >= 100 AND NEW.auto_award = true THEN
        RAISE EXCEPTION 'Badges with points_threshold >= 100 must have auto_award = false (requires admin approval)';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_badge_auto_award
BEFORE INSERT OR UPDATE ON badges
FOR EACH ROW
EXECUTE FUNCTION validate_badge_auto_award();
