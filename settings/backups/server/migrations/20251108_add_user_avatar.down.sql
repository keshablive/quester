-- Migration: Remove avatar field from users table
-- Date: 2025-11-08
-- Description: Rollback migration that added avatar column

-- Drop index first
DROP INDEX IF EXISTS idx_users_avatar;

-- Remove avatar column
ALTER TABLE users DROP COLUMN IF EXISTS avatar;
