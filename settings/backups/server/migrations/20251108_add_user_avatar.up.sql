-- Migration: Add avatar field to users table
-- Date: 2025-11-08
-- Description: Add avatar column to store S3 URL for user profile pictures

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(500);

-- Create index for efficient avatar queries (optional, useful for finding users with/without avatars)
CREATE INDEX IF NOT EXISTS idx_users_avatar ON users(avatar) WHERE avatar IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.avatar IS 'S3 URL to user avatar image';
