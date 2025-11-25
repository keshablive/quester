-- Migration: Drop classified_ads table
-- Version: 010
-- Description: Rollback classified ads marketplace

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_update_classified_ads_updated_at ON classified_ads;
DROP FUNCTION IF EXISTS update_classified_ads_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_classified_ads_search;
DROP INDEX IF EXISTS idx_classified_ads_user_status;
DROP INDEX IF EXISTS idx_classified_ads_category_status;
DROP INDEX IF EXISTS idx_classified_ads_tenant_status;
DROP INDEX IF EXISTS idx_classified_ads_location;
DROP INDEX IF EXISTS idx_classified_ads_expires_at;
DROP INDEX IF EXISTS idx_classified_ads_published_at;
DROP INDEX IF EXISTS idx_classified_ads_created_at;
DROP INDEX IF EXISTS idx_classified_ads_moderation_status;
DROP INDEX IF EXISTS idx_classified_ads_status;
DROP INDEX IF EXISTS idx_classified_ads_ad_type;
DROP INDEX IF EXISTS idx_classified_ads_category;
DROP INDEX IF EXISTS idx_classified_ads_user_id;
DROP INDEX IF EXISTS idx_classified_ads_tenant_id;

-- Drop table
DROP TABLE IF EXISTS classified_ads;
