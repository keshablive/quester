-- Drop triggers
DROP TRIGGER IF EXISTS trg_marketplace_listings_updated_at ON marketplace_listings;
DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS trg_marketplace_reviews_updated_at ON marketplace_reviews;
DROP TRIGGER IF EXISTS trg_update_listing_rating ON marketplace_reviews;

-- Drop functions
DROP FUNCTION IF EXISTS update_listing_rating();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables
DROP TABLE IF EXISTS marketplace_reviews CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS marketplace_listings CASCADE;
