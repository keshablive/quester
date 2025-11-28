-- Rollback: Remove GIN indexes and full-text search functionality

-- Drop search functions
DROP FUNCTION IF EXISTS search_classified_ads(UUID, TEXT, INT, INT);
DROP FUNCTION IF EXISTS search_properties(UUID, TEXT, INT, INT);
DROP FUNCTION IF EXISTS search_courses(UUID, TEXT, INT, INT);

-- Drop triggers and functions for classified ads
DROP TRIGGER IF EXISTS classified_ads_search_vector_update ON classified_ads;
DROP FUNCTION IF EXISTS classified_ads_search_vector_trigger();
DROP INDEX IF EXISTS idx_classified_ads_search_vector;
ALTER TABLE classified_ads DROP COLUMN IF EXISTS search_vector;

-- Drop triggers and functions for properties
DROP TRIGGER IF EXISTS properties_search_vector_update ON properties;
DROP FUNCTION IF EXISTS properties_search_vector_trigger();
DROP INDEX IF EXISTS idx_properties_search_vector;
ALTER TABLE properties DROP COLUMN IF EXISTS search_vector;

-- Drop triggers and functions for courses
DROP TRIGGER IF EXISTS courses_search_vector_update ON courses;
DROP FUNCTION IF EXISTS courses_search_vector_trigger();
DROP INDEX IF EXISTS idx_courses_search_vector;
ALTER TABLE courses DROP COLUMN IF EXISTS search_vector;
