-- Fix courses search vector trigger to use correct column names
-- The trigger was referencing 'name' and 'category' but table has 'title' (no category)

-- Drop existing trigger
DROP TRIGGER IF EXISTS courses_search_vector_update ON courses;

-- Recreate trigger function with correct column names
CREATE OR REPLACE FUNCTION courses_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.difficulty::text, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER courses_search_vector_update
  BEFORE INSERT OR UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION courses_search_vector_trigger();

-- Update existing rows to populate search_vector
UPDATE courses SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(difficulty::text, '')), 'C');
