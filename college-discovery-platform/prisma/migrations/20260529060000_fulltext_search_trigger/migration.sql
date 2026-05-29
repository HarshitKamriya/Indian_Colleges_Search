-- Create trigger to auto-update searchVector on INSERT/UPDATE
CREATE OR REPLACE FUNCTION college_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.city, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.state, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER college_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "College"
  FOR EACH ROW EXECUTE FUNCTION college_search_vector_update();
