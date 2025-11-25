-- C2: UUID Migration for Marketplace Models
-- WARNING: This is a breaking change requiring careful data migration
-- Migrates MarketplaceListing.SellerID and Transaction buyer/seller IDs from uint to UUID

-- Step 1: Add temporary UUID columns
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS seller_id_uuid UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS buyer_id_uuid UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS seller_id_uuid UUID;

-- Step 2: Migrate data from uint to UUID
-- This assumes users table has both id (uint) and a uuid column
-- Adjust the mapping logic based on your actual User model structure

-- Update marketplace_listings
UPDATE marketplace_listings ml
SET seller_id_uuid = u.id
FROM users u
WHERE ml.seller_id = u.id::text::integer;

-- Update transactions
UPDATE transactions t
SET buyer_id_uuid = u.id,
    seller_id_uuid = s.id
FROM users u, users s
WHERE t.buyer_id::text = u.id::text::integer
  AND t.seller_id::text = s.id::text::integer;

-- Step 3: Drop old columns and rename new ones
-- WARNING: This will cause downtime and break existing API contracts
ALTER TABLE marketplace_listings DROP COLUMN seller_id;
ALTER TABLE marketplace_listings RENAME COLUMN seller_id_uuid TO seller_id;

ALTER TABLE transactions DROP COLUMN buyer_id;
ALTER TABLE transactions DROP COLUMN seller_id;
ALTER TABLE transactions RENAME COLUMN buyer_id_uuid TO buyer_id;
ALTER TABLE transactions RENAME COLUMN seller_id_uuid TO seller_id;

-- Step 4: Add constraints
ALTER TABLE marketplace_listings 
  ALTER COLUMN seller_id SET NOT NULL,
  ADD CONSTRAINT fk_marketplace_listings_seller FOREIGN KEY (seller_id) REFERENCES users(id);

ALTER TABLE transactions
  ALTER COLUMN buyer_id SET NOT NULL,
  ALTER COLUMN seller_id SET NOT NULL,
  ADD CONSTRAINT fk_transactions_buyer FOREIGN KEY (buyer_id) REFERENCES users(id),
  ADD CONSTRAINT fk_transactions_seller FOREIGN KEY (seller_id) REFERENCES users(id);

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON transactions(seller_id);
