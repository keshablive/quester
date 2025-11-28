-- T402: Create backup_codes table for 2FA recovery codes
-- Purpose: Store hashed backup codes for account recovery when TOTP device is unavailable

CREATE TABLE IF NOT EXISTS backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create index for fast user lookup
CREATE INDEX idx_backup_codes_user_id ON backup_codes(user_id);

-- Create index for soft deletes
CREATE INDEX idx_backup_codes_deleted_at ON backup_codes(deleted_at);

-- Comments for documentation
COMMENT ON TABLE backup_codes IS '2FA backup/recovery codes (10 per user, single-use, hashed with bcrypt)';
COMMENT ON COLUMN backup_codes.code_hash IS 'Bcrypt hash of 8-character alphanumeric backup code';
COMMENT ON COLUMN backup_codes.used IS 'Whether this code has been consumed (single-use only)';
COMMENT ON COLUMN backup_codes.used_at IS 'Timestamp when code was used for recovery';
