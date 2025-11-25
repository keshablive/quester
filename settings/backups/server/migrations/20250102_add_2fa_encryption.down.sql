-- T205: Rollback encryption fields from two_factor_auths table
-- Migration: 20250102_add_2fa_encryption.down.sql

-- Drop indexes
DROP INDEX IF EXISTS idx_two_factor_auths_encrypted_at;
DROP INDEX IF EXISTS idx_two_factor_auths_key_version;

-- Drop encryption columns
ALTER TABLE two_factor_auths
DROP COLUMN IF EXISTS decrypted_at,
DROP COLUMN IF EXISTS encrypted_at,
DROP COLUMN IF EXISTS encryption_key_version,
DROP COLUMN IF EXISTS encryption_algorithm,
DROP COLUMN IF EXISTS encrypted_secret_dek,
DROP COLUMN IF EXISTS encrypted_secret_ciphertext;
