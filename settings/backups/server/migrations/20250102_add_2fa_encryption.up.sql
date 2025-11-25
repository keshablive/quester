-- T205: Add encryption fields to two_factor_auths table
-- Migration: 20250102_add_2fa_encryption.sql
-- Purpose: Add KMS envelope encryption support for 2FA secrets

-- Add encryption-related columns
ALTER TABLE two_factor_auths
ADD COLUMN encrypted_secret_ciphertext TEXT,
ADD COLUMN encrypted_secret_dek BYTEA,
ADD COLUMN encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
ADD COLUMN encryption_key_version INT DEFAULT 1,
ADD COLUMN encrypted_at TIMESTAMP,
ADD COLUMN decrypted_at TIMESTAMP;

-- Add index for key version lookups
CREATE INDEX idx_two_factor_auths_key_version ON two_factor_auths(encryption_key_version);

-- Add index for encrypted_at for rotation queries
CREATE INDEX idx_two_factor_auths_encrypted_at ON two_factor_auths(encrypted_at);

-- Add comment
COMMENT ON COLUMN two_factor_auths.encrypted_secret_ciphertext IS 'AES-256-GCM ciphertext of the 2FA secret (Base32)';
COMMENT ON COLUMN two_factor_auths.encrypted_secret_dek IS 'Data Encryption Key (DEK) encrypted by Key Encryption Key (KEK) from KMS';
COMMENT ON COLUMN two_factor_auths.encryption_algorithm IS 'Encryption algorithm used (AES-256-GCM for GDPR/SOC2 compliance)';
COMMENT ON COLUMN two_factor_auths.encryption_key_version IS 'Version of DEK used for encryption (supports key rotation)';
COMMENT ON COLUMN two_factor_auths.encrypted_at IS 'Timestamp when secret was last encrypted/re-encrypted';
COMMENT ON COLUMN two_factor_auths.decrypted_at IS 'Timestamp when secret was last decrypted (for audit)';

-- Migration note: Existing secrets in plaintext will need encryption
-- Use server/cmd/migrate/encrypt_2fa_secrets.go to migrate existing records
