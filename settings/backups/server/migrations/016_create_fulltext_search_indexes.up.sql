-- Migration: Add GIN indexes for full-text search on courses, properties, classifieds
-- Created: 2025-11-01

-- Add full-text search vectors for courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for full-text search on courses
CREATE INDEX IF NOT EXISTS idx_courses_search_vector ON courses USING GIN(search_vector);

-- Create trigger to automatically update search vector on courses
CREATE OR REPLACE FUNCTION courses_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER courses_search_vector_update BEFORE INSERT OR UPDATE
  ON courses FOR EACH ROW EXECUTE FUNCTION courses_search_vector_trigger();

-- Update existing course search vectors
UPDATE courses SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'C')
WHERE search_vector IS NULL;

-- Add full-text search vectors for properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for full-text search on properties
CREATE INDEX IF NOT EXISTS idx_properties_search_vector ON properties USING GIN(search_vector);

-- Create trigger to automatically update search vector on properties
CREATE OR REPLACE FUNCTION properties_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.address, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.state, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.property_type, '')), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER properties_search_vector_update BEFORE INSERT OR UPDATE
  ON properties FOR EACH ROW EXECUTE FUNCTION properties_search_vector_trigger();

-- Update existing property search vectors
UPDATE properties SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(address, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(city, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(state, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(property_type, '')), 'D')
WHERE search_vector IS NULL;

-- Add full-text search vectors for classified ads
ALTER TABLE classified_ads ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for full-text search on classified ads
CREATE INDEX IF NOT EXISTS idx_classified_ads_search_vector ON classified_ads USING GIN(search_vector);

-- Create trigger to automatically update search vector on classified ads
CREATE OR REPLACE FUNCTION classified_ads_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.tags::text, '')), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER classified_ads_search_vector_update BEFORE INSERT OR UPDATE
  ON classified_ads FOR EACH ROW EXECUTE FUNCTION classified_ads_search_vector_trigger();

-- Update existing classified ad search vectors
UPDATE classified_ads SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(tags::text, '')), 'D')
WHERE search_vector IS NULL;

-- Add comments
COMMENT ON COLUMN courses.search_vector IS 'Full-text search vector for courses (name, description, category)';
COMMENT ON COLUMN properties.search_vector IS 'Full-text search vector for properties (title, description, address, city, state, type)';
COMMENT ON COLUMN classified_ads.search_vector IS 'Full-text search vector for classified ads (title, description, category, tags)';

-- Create search functions for easy querying

-- Function to search courses
CREATE OR REPLACE FUNCTION search_courses(
  p_tenant_id UUID,
  p_search_query TEXT,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
) RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    ts_rank(c.search_vector, plainto_tsquery('english', p_search_query)) AS rank
  FROM courses c
  WHERE c.tenant_id = p_tenant_id
    AND c.deleted_at IS NULL
    AND c.search_vector @@ plainto_tsquery('english', p_search_query)
  ORDER BY rank DESC, c.name ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to search properties
CREATE OR REPLACE FUNCTION search_properties(
  p_tenant_id UUID,
  p_search_query TEXT,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
) RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.description,
    ts_rank(p.search_vector, plainto_tsquery('english', p_search_query)) AS rank
  FROM properties p
  WHERE p.tenant_id = p_tenant_id
    AND p.deleted_at IS NULL
    AND p.search_vector @@ plainto_tsquery('english', p_search_query)
  ORDER BY rank DESC, p.title ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to search classified ads
CREATE OR REPLACE FUNCTION search_classified_ads(
  p_tenant_id UUID,
  p_search_query TEXT,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
) RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.id,
    ca.title,
    ca.description,
    ts_rank(ca.search_vector, plainto_tsquery('english', p_search_query)) AS rank
  FROM classified_ads ca
  WHERE ca.tenant_id = p_tenant_id
    AND ca.deleted_at IS NULL
    AND ca.status = 'active'
    AND ca.search_vector @@ plainto_tsquery('english', p_search_query)
  ORDER BY rank DESC, ca.title ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
