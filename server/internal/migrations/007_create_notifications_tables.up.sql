-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    icon_url TEXT,
    priority VARCHAR(50) NOT NULL DEFAULT 'normal',
    channels TEXT[] NOT NULL DEFAULT '{in_app}',
    metadata JSONB,
    read_at TIMESTAMP,
    sent_at TIMESTAMP,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_read ON notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_deleted ON notifications(deleted_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    channels JSONB NOT NULL DEFAULT '{"in_app": true, "email": true, "push": true, "sms": false}',
    preferences JSONB NOT NULL DEFAULT '{"messages": true, "badge_earned": true, "quest_update": true, "course_update": true, "payment": true, "system": true}',
    quiet_hours JSONB,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create unique constraint for one settings row per user per tenant
CREATE UNIQUE INDEX idx_notification_settings_tenant_user ON notification_settings(tenant_id, user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_settings_user ON notification_settings(user_id);
CREATE INDEX idx_notification_settings_deleted ON notification_settings(deleted_at);

-- Create FCM tokens table for push notifications
CREATE TABLE IF NOT EXISTS fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    token TEXT NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for FCM tokens
CREATE INDEX idx_fcm_tokens_tenant ON fcm_tokens(tenant_id);
CREATE INDEX idx_fcm_tokens_user ON fcm_tokens(user_id);
CREATE UNIQUE INDEX idx_fcm_tokens_token ON fcm_tokens(token) WHERE deleted_at IS NULL;
CREATE INDEX idx_fcm_tokens_device ON fcm_tokens(device_id);
CREATE INDEX idx_fcm_tokens_active ON fcm_tokens(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_fcm_tokens_deleted ON fcm_tokens(deleted_at);

-- Create function to auto-create default notification settings
CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO notification_settings (tenant_id, user_id)
    VALUES (NEW.tenant_id, NEW.id)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$;

-- Create trigger to auto-create notification settings for new users
CREATE TRIGGER trigger_create_notification_settings
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_settings();

-- Create function to cleanup old read notifications (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
    cutoff_date TIMESTAMP := NOW() - (retention_days || ' days')::INTERVAL;
BEGIN
    DELETE FROM notifications
    WHERE read_at IS NOT NULL
    AND read_at < cutoff_date
    AND deleted_at IS NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % old read notifications', deleted_count;
    RETURN deleted_count;
END;
$$;

-- Create function to get unread notification count per user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID, p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO unread_count
    FROM notifications
    WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND read_at IS NULL
    AND deleted_at IS NULL;
    
    RETURN unread_count;
END;
$$;

-- Create materialized view for notification statistics
CREATE MATERIALIZED VIEW notification_stats AS
SELECT
    tenant_id,
    user_id,
    notification_type,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE read_at IS NULL) AS unread_count,
    COUNT(*) FILTER (WHERE read_at IS NOT NULL) AS read_count,
    MAX(created_at) AS last_notification_at
FROM notifications
WHERE deleted_at IS NULL
GROUP BY tenant_id, user_id, notification_type;

-- Create index on materialized view
CREATE INDEX idx_notification_stats_user ON notification_stats(user_id);
CREATE INDEX idx_notification_stats_tenant ON notification_stats(tenant_id);
CREATE INDEX idx_notification_stats_type ON notification_stats(notification_type);

-- Create function to refresh notification stats
CREATE OR REPLACE FUNCTION refresh_notification_stats()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY notification_stats;
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'Stores user notifications across all channels';
COMMENT ON COLUMN notifications.notification_type IS 'Type: message, badge_earned, quest_update, course_update, payment, system, comment, like, follow, stream_start';
COMMENT ON COLUMN notifications.priority IS 'Priority level: low, normal, high, urgent';
COMMENT ON COLUMN notifications.channels IS 'Array of delivery channels: in_app, email, push, sms';
COMMENT ON COLUMN notifications.metadata IS 'Extensible JSONB field for additional notification data';
COMMENT ON COLUMN notifications.action_url IS 'Deep link URL when notification is tapped';

COMMENT ON TABLE notification_settings IS 'User preferences for notification delivery and types';
COMMENT ON COLUMN notification_settings.channels IS 'JSON object with boolean flags for each channel';
COMMENT ON COLUMN notification_settings.preferences IS 'JSON object with boolean flags for each notification type';
COMMENT ON COLUMN notification_settings.quiet_hours IS 'JSON object with enabled, start, end, timezone fields';

COMMENT ON TABLE fcm_tokens IS 'Firebase Cloud Messaging device tokens for push notifications';
COMMENT ON COLUMN fcm_tokens.device_type IS 'Device platform: ios, android, web';
COMMENT ON COLUMN fcm_tokens.is_active IS 'Whether token is still valid (deactivated if push fails)';
COMMENT ON COLUMN fcm_tokens.last_used_at IS 'Last time this token was used to send a notification';

COMMENT ON FUNCTION cleanup_old_notifications(INTEGER) IS 'Deletes read notifications older than specified days (default 90)';
COMMENT ON FUNCTION get_unread_notification_count(UUID, UUID) IS 'Returns count of unread notifications for a user';
COMMENT ON FUNCTION refresh_notification_stats() IS 'Refreshes materialized view with notification statistics';

-- Create initial notification settings for existing users
INSERT INTO notification_settings (tenant_id, user_id)
SELECT tenant_id, id
FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM notification_settings ns
    WHERE ns.user_id = users.id
    AND ns.tenant_id = users.tenant_id
);
