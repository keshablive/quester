-- Drop helper functions
DROP FUNCTION IF EXISTS find_classifieds_nearby(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);
DROP FUNCTION IF EXISTS find_properties_nearby(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_classified_ads_updated_at ON classified_ads;
DROP TRIGGER IF EXISTS trigger_properties_updated_at ON properties;

-- Drop trigger functions
DROP FUNCTION IF EXISTS update_classified_ads_updated_at();
DROP FUNCTION IF EXISTS update_properties_updated_at();

-- Drop tables (cascade will remove all indexes and constraints)
DROP TABLE IF EXISTS classified_ads CASCADE;
DROP TABLE IF EXISTS properties CASCADE;

-- Note: We don't drop PostGIS extension as it might be used by other tables
-- DROP EXTENSION IF EXISTS postgis;
