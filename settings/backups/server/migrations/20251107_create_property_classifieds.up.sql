-- Create property and classifieds tables for real estate niche
-- Supports property listings with geocoding and short-term classified ads

-- Properties table (real estate listings)
CREATE TABLE IF NOT EXISTS properties (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    owner_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    address VARCHAR(500) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(50),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    price DECIMAL(12,2) NOT NULL,
    property_type VARCHAR(50), -- 'house', 'apartment', 'condo', 'land', 'commercial'
    bedrooms INT DEFAULT 0,
    bathrooms INT DEFAULT 0,
    square_feet INT,
    photo_urls JSONB,
    amenities JSONB, -- Array of amenity strings
    virtual_tour_url VARCHAR(500),
    view_count INT DEFAULT 0,
    favorite_count INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'pending_geocoding', 'sold', 'inactive'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_properties_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_property_price CHECK (price >= 0),
    CONSTRAINT chk_property_type CHECK (property_type IN ('house', 'apartment', 'condo', 'land', 'commercial')),
    CONSTRAINT chk_property_bedrooms CHECK (bedrooms >= 0),
    CONSTRAINT chk_property_bathrooms CHECK (bathrooms >= 0),
    CONSTRAINT chk_property_status CHECK (status IN ('active', 'pending_geocoding', 'sold', 'inactive')),
    CONSTRAINT chk_property_view_count CHECK (view_count >= 0),
    CONSTRAINT chk_property_favorite_count CHECK (favorite_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_properties_tenant ON properties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(latitude, longitude, tenant_id);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price, tenant_id);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type, tenant_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_properties_deleted ON properties(deleted_at);

COMMENT ON TABLE properties IS 'Real estate property listings with geocoding support';
COMMENT ON COLUMN properties.status IS 'pending_geocoding: async job processing address → lat/lng';

-- Classified ads table (short-term advertisements)
CREATE TABLE IF NOT EXISTS classified_ads (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'for_sale', 'wanted', 'services', 'jobs', 'housing'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10,2),
    photo_urls JSONB,
    contact_info VARCHAR(500),
    location VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'sold', 'expired', 'removed'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_classified_ads_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_classified_category CHECK (category IN ('for_sale', 'wanted', 'services', 'jobs', 'housing')),
    CONSTRAINT chk_classified_status CHECK (status IN ('active', 'sold', 'expired', 'removed')),
    CONSTRAINT chk_classified_view_count CHECK (view_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_classified_ads_tenant ON classified_ads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_classified_ads_user ON classified_ads(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_classified_ads_category ON classified_ads(category, tenant_id);
CREATE INDEX IF NOT EXISTS idx_classified_ads_expires ON classified_ads(expires_at, tenant_id);
CREATE INDEX IF NOT EXISTS idx_classified_ads_status ON classified_ads(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_classified_ads_deleted ON classified_ads(deleted_at);

COMMENT ON TABLE classified_ads IS 'Short-term classified advertisements (30-day expiration)';
COMMENT ON COLUMN classified_ads.expires_at IS 'Auto-expire after 30 days, cron job marks as expired';
