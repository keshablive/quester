-- Create notification tables: notifications, notification_preferences
-- Supports multi-channel notifications (in-app, push, email) with preferences

-- Notifications table (user alert records)
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'message', 'deadline', 'achievement', 'social', 'system'
    title VARCHAR(255) NOT NULL,
    content TEXT,
    action_url VARCHAR(500),
    priority VARCHAR(20) DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
    read_at TIMESTAMP,
    delivered_channels JSONB, -- Array: ['in_app', 'push', 'email']
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_notification_event_type CHECK (event_type IN ('message', 'deadline', 'achievement', 'social', 'system')),
    CONSTRAINT chk_notification_priority CHECK (priority IN ('critical', 'high', 'medium', 'low'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC, tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_at, tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON notifications(expires_at, tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_deleted ON notifications(deleted_at);

COMMENT ON TABLE notifications IS 'User notifications with multi-channel delivery (in-app, push, email)';
COMMENT ON COLUMN notifications.expires_at IS 'Auto-expire after 30 days (default)';

-- Notification preferences table (channel preferences per event type)
CREATE TABLE IF NOT EXISTS notification_preferences (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT FALSE,
    do_not_disturb_start TIME, -- e.g., 22:00
    do_not_disturb_end TIME, -- e.g., 07:00
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_notif_prefs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_event_type_pref UNIQUE (user_id, event_type, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_tenant ON notification_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_deleted ON notification_preferences(deleted_at);

COMMENT ON TABLE notification_preferences IS 'User notification channel preferences by event type';
COMMENT ON COLUMN notification_preferences.email_enabled IS 'Default FALSE to reduce spam';
