-- Rollback payout tracking fields
-- Migration: 20251118_add_payout_tracking_fields

-- Remove payout fields from transactions
ALTER TABLE transactions
DROP COLUMN IF EXISTS payout_completed_at,
DROP COLUMN IF EXISTS payout_initiated_at,
DROP COLUMN IF EXISTS payout_amount,
DROP COLUMN IF EXISTS payout_status,
DROP COLUMN IF EXISTS payout_id;

-- Remove payment account field from users
ALTER TABLE users
DROP COLUMN IF EXISTS payment_account_id;

-- Drop index
DROP INDEX IF EXISTS idx_transactions_payout_status;
