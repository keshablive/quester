-- Rollback C2: UUID Migration for Marketplace Models
-- WARNING: This rollback requires manual data verification

-- Step 1: Drop new UUID constraints and indexes
DROP INDEX IF EXISTS idx_marketplace_listings_seller;
DROP INDEX IF EXISTS idx_transactions_buyer;
DROP INDEX IF EXISTS idx_transactions_seller;

ALTER TABLE marketplace_listings DROP CONSTRAINT IF EXISTS fk_marketplace_listings_seller;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS fk_transactions_buyer;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS fk_transactions_seller;

-- Step 2: Add back old uint columns
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS seller_id_uint INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS buyer_id_uint INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS seller_id_uint INTEGER;

-- Step 3: Migrate data back from UUID to uint
-- This assumes users table has both id (uuid) and a legacy integer ID
-- Adjust mapping logic based on your User model

UPDATE marketplace_listings ml
SET seller_id_uint = u.legacy_id
FROM users u
WHERE ml.seller_id = u.id;

UPDATE transactions t
SET buyer_id_uint = u.legacy_id,
    seller_id_uint = s.legacy_id
FROM users u, users s
WHERE t.buyer_id = u.id
  AND t.seller_id = s.id;

-- Step 4: Drop UUID columns and rename
ALTER TABLE marketplace_listings DROP COLUMN seller_id;
ALTER TABLE marketplace_listings RENAME COLUMN seller_id_uint TO seller_id;

ALTER TABLE transactions DROP COLUMN buyer_id;
ALTER TABLE transactions DROP COLUMN seller_id;
ALTER TABLE transactions RENAME COLUMN buyer_id_uint TO buyer_id;
ALTER TABLE transactions RENAME COLUMN seller_id_uint TO seller_id;

-- Step 5: Restore old constraints
ALTER TABLE marketplace_listings ALTER COLUMN seller_id SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN buyer_id SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN seller_id SET NOT NULL;

-- Step 6: Recreate indexes
CREATE INDEX idx_marketplace_listings_seller ON marketplace_listings(seller_id);
CREATE INDEX idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON transactions(seller_id);
