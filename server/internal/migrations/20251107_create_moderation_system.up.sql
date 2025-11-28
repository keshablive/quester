-- Create moderation tables: reports, moderation_actions
-- Supports content reporting and moderator action tracking

-- Reports table (user-submitted content reports)
CREATE TABLE IF NOT EXISTS reports (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    reporter_id BIGINT NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- 'Post', 'Comment', 'User', 'Message', 'Property'
    content_id BIGINT NOT NULL,
    reason VARCHAR(50) NOT NULL, -- 'spam', 'harassment', 'inappropriate', 'misinformation', 'other'
    description TEXT,
    priority INT DEFAULT 0, -- 0-100, auto-calculated based on report count
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewing', 'resolved', 'dismissed'
    assigned_to_id BIGINT,
    resolved_at TIMESTAMP,
    resolution TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_reports_assigned_to FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_report_content_type CHECK (content_type IN ('Post', 'Comment', 'User', 'Message', 'Property')),
    CONSTRAINT chk_report_reason CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'misinformation', 'other')),
    CONSTRAINT chk_report_priority CHECK (priority >= 0 AND priority <= 100),
    CONSTRAINT chk_report_status CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed'))
);

CREATE INDEX IF NOT EXISTS idx_reports_tenant ON reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_content ON reports(content_type, content_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_priority ON reports(priority DESC, created_at, tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_assigned_to ON reports(assigned_to_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_deleted ON reports(deleted_at);

COMMENT ON TABLE reports IS 'User-submitted content reports with priority scoring';
COMMENT ON COLUMN reports.priority IS 'Auto-calculated 0-100 based on report count, reporter reputation';

-- Moderation actions table (audit log of moderator decisions)
CREATE TABLE IF NOT EXISTS moderation_actions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    moderator_id BIGINT NOT NULL,
    report_id BIGINT,
    content_type VARCHAR(50) NOT NULL,
    content_id BIGINT NOT NULL,
    target_user_id BIGINT,
    action_type VARCHAR(20) NOT NULL, -- 'approve', 'remove', 'warn', 'ban_3day', 'ban_30day', 'ban_permanent'
    reason TEXT,
    expires_at TIMESTAMP, -- For temporary bans
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_mod_actions_moderator FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_mod_actions_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL,
    CONSTRAINT fk_mod_actions_target_user FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_mod_action_type CHECK (action_type IN ('approve', 'remove', 'warn', 'ban_3day', 'ban_30day', 'ban_permanent'))
);

CREATE INDEX IF NOT EXISTS idx_mod_actions_tenant ON moderation_actions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mod_actions_moderator ON moderation_actions(moderator_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_mod_actions_report ON moderation_actions(report_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_mod_actions_target_user ON moderation_actions(target_user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_mod_actions_action_type ON moderation_actions(action_type, tenant_id);
CREATE INDEX IF NOT EXISTS idx_mod_actions_deleted ON moderation_actions(deleted_at);

COMMENT ON TABLE moderation_actions IS 'Audit log of moderator decisions with escalation tracking';
COMMENT ON COLUMN moderation_actions.action_type IS 'Escalation: 3 warns → 3day, 2nd → 30day, 3rd → permanent';
