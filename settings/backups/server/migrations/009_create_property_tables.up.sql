-- Enable PostGIS extension for geographic queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create properties table with PostGIS GEOGRAPHY type
CREATE TABLE IF NOT EXISTS properties (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    owner_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    property_type VARCHAR(50) NOT NULL CHECK (property_type IN ('residential', 'commercial', 'land', 'industrial')),
    listing_type VARCHAR(50) NOT NULL CHECK (listing_type IN ('for_sale', 'for_rent')),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'sold', 'rented', 'expired', 'suspended')),
    
    -- PostGIS GEOGRAPHY column for location (WGS84 coordinate system)
    location GEOGRAPHY(POINT, 4326),
    address JSONB,
    
    -- Pricing
    price DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    
    -- Property details
    bedrooms INTEGER,
    bathrooms INTEGER,
    area_sqft DECIMAL(10, 2),
    year_built INTEGER,
    
    -- Media
    images TEXT[],
    virtual_tour_urls TEXT[],
    
    -- Documents & Verification
    documents JSONB DEFAULT '[]',
    verification_score DECIMAL(5, 2) DEFAULT 0,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    amenities TEXT[],
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    
    -- Statistics
    view_count INTEGER DEFAULT 0,
    contact_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    
    -- Expiration
    published_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign keys
    CONSTRAINT fk_properties_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_properties_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create classified ads table
CREATE TABLE IF NOT EXISTS classified_ads (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    poster_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    ad_type VARCHAR(50) NOT NULL CHECK (ad_type IN ('job', 'service', 'item', 'housing', 'event')),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'sold', 'expired', 'suspended')),
    
    -- Pricing (optional)
    price DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'INR',
    price_type VARCHAR(50), -- fixed, negotiable, free, hourly, monthly
    
    -- Location (optional for remote jobs/services)
    location GEOGRAPHY(POINT, 4326),
    location_text VARCHAR(200),
    
    -- Media
    images TEXT[],
    
    -- Contact
    contact_method VARCHAR(50) NOT NULL CHECK (contact_method IN ('email', 'phone', 'chat')),
    contact_info VARCHAR(200),
    
    -- Category-specific data
    category_data JSONB DEFAULT '{}',
    
    -- Metadata
    tags TEXT[],
    keywords TEXT[],
    
    -- Statistics
    view_count INTEGER DEFAULT 0,
    response_count INTEGER DEFAULT 0,
    
    -- Expiration
    published_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign keys
    CONSTRAINT fk_classified_ads_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_classified_ads_poster FOREIGN KEY (poster_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES FOR PROPERTIES
-- ============================================================================

-- PostGIS GIST index for efficient geo-spatial queries (critical for performance)
CREATE INDEX IF NOT EXISTS idx_properties_location_gist ON properties USING GIST (location);

-- Standard B-tree indexes
CREATE INDEX IF NOT EXISTS idx_properties_tenant ON properties(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_properties_expires ON properties(expires_at) WHERE deleted_at IS NULL AND status = 'active';

-- Composite index for common queries (property type + status + expiration)
CREATE INDEX IF NOT EXISTS idx_properties_active_listings ON properties(property_type, status, expires_at) 
    WHERE deleted_at IS NULL AND status = 'active' AND expires_at > CURRENT_TIMESTAMP;

-- JSONB GIN indexes for document searches
CREATE INDEX IF NOT EXISTS idx_properties_documents ON properties USING GIN (documents);
CREATE INDEX IF NOT EXISTS idx_properties_metadata ON properties USING GIN (metadata);

-- Array indexes for tags and amenities
CREATE INDEX IF NOT EXISTS idx_properties_tags ON properties USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_properties_amenities ON properties USING GIN (amenities);

-- Price range queries
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price) WHERE deleted_at IS NULL AND status = 'active';

-- Full-text search on title and description
CREATE INDEX IF NOT EXISTS idx_properties_search ON properties USING GIN (
    to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
);

-- ============================================================================
-- INDEXES FOR CLASSIFIED ADS
-- ============================================================================

-- PostGIS GIST index for location-based searches
CREATE INDEX IF NOT EXISTS idx_classified_ads_location_gist ON classified_ads USING GIST (location);

-- Standard B-tree indexes
CREATE INDEX IF NOT EXISTS idx_classified_ads_tenant ON classified_ads(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_classified_ads_poster ON classified_ads(poster_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_classified_ads_type ON classified_ads(ad_type) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_classified_ads_status ON classified_ads(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_classified_ads_expires ON classified_ads(expires_at) WHERE deleted_at IS NULL AND status = 'active';

-- Composite index for active ads by type
CREATE INDEX IF NOT EXISTS idx_classified_ads_active ON classified_ads(ad_type, status, expires_at)
    WHERE deleted_at IS NULL AND status = 'active' AND expires_at > CURRENT_TIMESTAMP;

-- JSONB GIN index for category data
CREATE INDEX IF NOT EXISTS idx_classified_ads_category_data ON classified_ads USING GIN (category_data);

-- Array indexes
CREATE INDEX IF NOT EXISTS idx_classified_ads_tags ON classified_ads USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_classified_ads_keywords ON classified_ads USING GIN (keywords);

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_classified_ads_search ON classified_ads USING GIN (
    to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(location_text, ''))
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to automatically update updated_at timestamp for properties
CREATE OR REPLACE FUNCTION update_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_properties_updated_at();

-- Trigger to automatically update updated_at timestamp for classified ads
CREATE OR REPLACE FUNCTION update_classified_ads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_classified_ads_updated_at
    BEFORE UPDATE ON classified_ads
    FOR EACH ROW
    EXECUTE FUNCTION update_classified_ads_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to find properties within a radius (meters)
-- Usage: SELECT * FROM find_properties_nearby(28.6139, 77.2090, 5000);
CREATE OR REPLACE FUNCTION find_properties_nearby(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
    id BIGINT,
    title VARCHAR,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        ST_Distance(p.location, ST_GeogFromText('POINT(' || lng || ' ' || lat || ')'))::DOUBLE PRECISION AS distance_meters
    FROM properties p
    WHERE 
        p.deleted_at IS NULL
        AND p.status = 'active'
        AND p.expires_at > CURRENT_TIMESTAMP
        AND ST_DWithin(
            p.location,
            ST_GeogFromText('POINT(' || lng || ' ' || lat || ')'),
            radius_meters
        )
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- Function to find classified ads within a radius
CREATE OR REPLACE FUNCTION find_classifieds_nearby(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
    id BIGINT,
    title VARCHAR,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        ST_Distance(c.location, ST_GeogFromText('POINT(' || lng || ' ' || lat || ')'))::DOUBLE PRECISION AS distance_meters
    FROM classified_ads c
    WHERE 
        c.deleted_at IS NULL
        AND c.status = 'active'
        AND c.expires_at > CURRENT_TIMESTAMP
        AND c.location IS NOT NULL
        AND ST_DWithin(
            c.location,
            ST_GeogFromText('POINT(' || lng || ' ' || lat || ')'),
            radius_meters
        )
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE properties IS 'Real estate property listings with PostGIS geo-search support';
COMMENT ON TABLE classified_ads IS 'Classified advertisements for jobs, services, items, etc.';
COMMENT ON COLUMN properties.location IS 'PostGIS GEOGRAPHY column storing WGS84 coordinates (longitude, latitude)';
COMMENT ON COLUMN properties.documents IS 'Array of uploaded documents for verification (ownership proof, ID, tax receipts)';
COMMENT ON COLUMN properties.verification_score IS 'AI confidence score from 0-100 based on OCR document verification';
COMMENT ON COLUMN properties.expires_at IS 'Property listings expire after 90 days from publication';
COMMENT ON COLUMN classified_ads.expires_at IS 'Classified ads expire after 30 days from publication';
COMMENT ON INDEX idx_properties_location_gist IS 'GIST spatial index for sub-200ms geo-search performance (P95 target)';
COMMENT ON FUNCTION find_properties_nearby IS 'Optimized function for geo-proximity search using ST_DWithin';
