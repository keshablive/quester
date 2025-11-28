-- Add payout tracking fields to transactions table
-- Migration: 20251118_add_payout_tracking_fields

-- Add payout fields to transactions
ALTER TABLE transactions 
ADD COLUMN payout_id VARCHAR(255),
ADD COLUMN payout_status VARCHAR(20),
ADD COLUMN payout_amount DECIMAL(10,2),
ADD COLUMN payout_initiated_at TIMESTAMP,
ADD COLUMN payout_completed_at TIMESTAMP;

-- Add payment account field to users
ALTER TABLE users
ADD COLUMN payment_account_id VARCHAR(255);

-- Add index for payout status lookups
CREATE INDEX idx_transactions_payout_status ON transactions(payout_status) WHERE payout_status IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN transactions.payout_id IS 'Payment gateway transfer/payout ID (Razorpay/Stripe)';
COMMENT ON COLUMN transactions.payout_status IS 'Payout status: pending, completed, failed';
COMMENT ON COLUMN transactions.payout_amount IS 'Amount paid out to seller (after platform fee)';
COMMENT ON COLUMN users.payment_account_id IS 'Connected account ID for receiving payouts (Razorpay/Stripe)';
