-- Add delivery tracking fields to notifications table
-- Migration: 20251118_add_notification_delivery_tracking

-- Add delivery tracking fields
ALTER TABLE notifications
ADD COLUMN delivered_at TIMESTAMP,
ADD COLUMN delivery_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN delivery_error TEXT,
ADD COLUMN delivery_channel VARCHAR(50),
ADD COLUMN retry_count INTEGER DEFAULT 0,
ADD COLUMN last_retry_at TIMESTAMP;

-- Add indexes for delivery status queries
CREATE INDEX idx_notifications_delivery_status ON notifications(delivery_status) WHERE delivery_status IS NOT NULL;
CREATE INDEX idx_notifications_retry ON notifications(retry_count, delivery_status) WHERE delivery_status = 'failed';

-- Add comments for documentation
COMMENT ON COLUMN notifications.delivered_at IS 'Timestamp when notification was successfully delivered';
COMMENT ON COLUMN notifications.delivery_status IS 'Delivery status: pending, delivered, failed, bounced';
COMMENT ON COLUMN notifications.delivery_error IS 'Error message if delivery failed';
COMMENT ON COLUMN notifications.delivery_channel IS 'Channel used for delivery: in_app, email, push, sms';
COMMENT ON COLUMN notifications.retry_count IS 'Number of delivery retry attempts';
COMMENT ON COLUMN notifications.last_retry_at IS 'Timestamp of last retry attempt';
