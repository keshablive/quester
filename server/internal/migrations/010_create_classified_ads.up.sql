-- Migration: Create classified_ads table for Feature #002
-- Version: 010
-- Description: Classified ads marketplace with geo-search and category filtering

-- Create classified_ads table
CREATE TABLE IF NOT EXISTS classified_ads (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    
    -- Ad Content
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    
    -- Ad Type & Status
    ad_type VARCHAR(50) NOT NULL CHECK (ad_type IN ('for_sale', 'for_rent', 'wanted', 'services', 'jobs')),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'sold', 'expired', 'suspended', 'deleted')),
    
    -- Location (PostGIS GEOGRAPHY for geo-search)
    location GEOGRAPHY(POINT, 4326),
    address JSONB,
    
    -- Pricing
    price DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'INR',
    price_negotiable BOOLEAN DEFAULT true,
    
    -- Media
    images TEXT[],
    video_urls TEXT[],
    
    -- Contact Information
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    contact_preference VARCHAR(50) DEFAULT 'phone' CHECK (contact_preference IN ('phone', 'email', 'both')),
    
    -- Metadata
    tags TEXT[],
    attributes JSONB DEFAULT '{}',
    
    -- Statistics
    view_count INTEGER DEFAULT 0,
    contact_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    
    -- Expiration & Renewal
    published_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    renewed_count INTEGER DEFAULT 0,
    last_renewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Moderation
    moderation_status VARCHAR(50) DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
    moderated_by BIGINT,
    moderated_at TIMESTAMP WITH TIME ZONE,
    moderation_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign Keys
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (moderated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for classified_ads
CREATE INDEX IF NOT EXISTS idx_classified_ads_tenant_id ON classified_ads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_classified_ads_user_id ON classified_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_classified_ads_category ON classified_ads(category);
CREATE INDEX IF NOT EXISTS idx_classified_ads_ad_type ON classified_ads(ad_type);
CREATE INDEX IF NOT EXISTS idx_classified_ads_status ON classified_ads(status);
CREATE INDEX IF NOT EXISTS idx_classified_ads_moderation_status ON classified_ads(moderation_status);
CREATE INDEX IF NOT EXISTS idx_classified_ads_created_at ON classified_ads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_classified_ads_published_at ON classified_ads(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_classified_ads_expires_at ON classified_ads(expires_at);

-- Spatial index for geo-queries (PostGIS GIST index)
CREATE INDEX IF NOT EXISTS idx_classified_ads_location ON classified_ads USING GIST(location);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_classified_ads_tenant_status ON classified_ads(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_classified_ads_category_status ON classified_ads(category, status);
CREATE INDEX IF NOT EXISTS idx_classified_ads_user_status ON classified_ads(user_id, status);

-- Full-text search index for title and description
CREATE INDEX IF NOT EXISTS idx_classified_ads_search 
ON classified_ads USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_classified_ads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_classified_ads_updated_at
    BEFORE UPDATE ON classified_ads
    FOR EACH ROW
    EXECUTE FUNCTION update_classified_ads_updated_at();

-- Add comments for documentation
COMMENT ON TABLE classified_ads IS 'Classified ads marketplace with geo-search and category filtering (Feature #002)';
COMMENT ON COLUMN classified_ads.location IS 'PostGIS GEOGRAPHY point for geo-spatial queries (latitude/longitude)';
COMMENT ON COLUMN classified_ads.verification_score IS 'AI-based verification score (0-100) for ad authenticity';
COMMENT ON COLUMN classified_ads.contact_count IS 'Number of times contact information was viewed/clicked';
COMMENT ON COLUMN classified_ads.renewed_count IS 'Number of times ad has been renewed (extends expiry by 30 days)';
