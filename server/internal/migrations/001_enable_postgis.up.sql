-- Enable PostGIS extension for geographic data (property listings, location-based features)
-- Required for: US7 (Property Management) location queries, radius search
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS version
SELECT PostGIS_Version();
