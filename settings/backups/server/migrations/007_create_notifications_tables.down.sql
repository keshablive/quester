-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_create_notification_settings ON users;

-- Drop functions
DROP FUNCTION IF EXISTS create_default_notification_settings();
DROP FUNCTION IF EXISTS cleanup_old_notifications(INTEGER);
DROP FUNCTION IF EXISTS get_unread_notification_count(UUID, UUID);
DROP FUNCTION IF EXISTS refresh_notification_stats();

-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS notification_stats;

-- Drop tables
DROP TABLE IF EXISTS fcm_tokens CASCADE;
DROP TABLE IF EXISTS notification_settings CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
