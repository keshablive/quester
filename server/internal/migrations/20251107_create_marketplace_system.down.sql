-- Rollback marketplace system tables

DROP TABLE IF EXISTS marketplace_reviews CASCADE;
DROP TABLE IF EXISTS wallet_ledgers CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS marketplace_listings CASCADE;
