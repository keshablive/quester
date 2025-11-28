-- Rollback notification delivery tracking
-- Migration: 20251118_add_notification_delivery_tracking

-- Drop indexes
DROP INDEX IF EXISTS idx_notifications_retry;
DROP INDEX IF EXISTS idx_notifications_delivery_status;

-- Remove delivery tracking fields
ALTER TABLE notifications
DROP COLUMN IF EXISTS last_retry_at,
DROP COLUMN IF EXISTS retry_count,
DROP COLUMN IF EXISTS delivery_channel,
DROP COLUMN IF EXISTS delivery_error,
DROP COLUMN IF EXISTS delivery_status,
DROP COLUMN IF EXISTS delivered_at;
