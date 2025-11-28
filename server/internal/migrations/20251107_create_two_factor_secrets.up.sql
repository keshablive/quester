-- Create two_factor_secrets table for TOTP-based 2FA
-- Stores encrypted TOTP secrets and backup codes for user authentication

CREATE TABLE IF NOT EXISTS two_factor_secrets (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    secret VARCHAR(255) NOT NULL, -- Encrypted TOTP secret (AES-256)
    is_enabled BOOLEAN DEFAULT FALSE,
    enabled_at TIMESTAMP,
    backup_codes TEXT, -- JSON array of bcrypt-hashed backup codes
    backup_codes_used INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_2fa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT uq_user_tenant_2fa UNIQUE (user_id, tenant_id),
    CONSTRAINT chk_backup_codes_used CHECK (backup_codes_used >= 0 AND backup_codes_used <= 10)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_2fa_tenant ON two_factor_secrets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_2fa_user ON two_factor_secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_deleted ON two_factor_secrets(deleted_at);
CREATE INDEX IF NOT EXISTS idx_2fa_enabled ON two_factor_secrets(is_enabled, tenant_id) WHERE is_enabled = TRUE;

-- Comments for documentation
COMMENT ON TABLE two_factor_secrets IS 'TOTP secrets and backup codes for two-factor authentication (RFC 6238)';
COMMENT ON COLUMN two_factor_secrets.secret IS 'Encrypted 32-character base32 TOTP secret (AES-256)';
COMMENT ON COLUMN two_factor_secrets.backup_codes IS 'JSON array of 10 bcrypt-hashed backup codes';
COMMENT ON COLUMN two_factor_secrets.backup_codes_used IS 'Count of used backup codes (max 10)';
