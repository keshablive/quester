-- Create marketplace_listings table
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,
    
    -- Listing details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    listing_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    
    -- Inventory
    quantity INT,
    sold_count INT NOT NULL DEFAULT 0,
    
    -- References
    course_id BIGINT,
    quest_id BIGINT,
    badge_id BIGINT,
    
    -- Media
    image_urls JSONB,
    video_url VARCHAR(500),
    
    -- Metadata
    tags JSONB,
    metadata JSONB,
    
    -- Ratings
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    published_at TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_marketplace_listings_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_marketplace_listings_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    CONSTRAINT fk_marketplace_listings_quest FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE SET NULL,
    CONSTRAINT fk_marketplace_listings_badge FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE SET NULL
);

-- Create indexes for marketplace_listings
CREATE INDEX idx_marketplace_listings_tenant ON marketplace_listings(tenant_id);
CREATE INDEX idx_marketplace_listings_seller ON marketplace_listings(seller_id);
CREATE INDEX idx_marketplace_listings_type ON marketplace_listings(listing_type);
CREATE INDEX idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX idx_marketplace_listings_course ON marketplace_listings(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX idx_marketplace_listings_quest ON marketplace_listings(quest_id) WHERE quest_id IS NOT NULL;
CREATE INDEX idx_marketplace_listings_badge ON marketplace_listings(badge_id) WHERE badge_id IS NOT NULL;
CREATE INDEX idx_marketplace_listings_deleted_at ON marketplace_listings(deleted_at);
CREATE INDEX idx_marketplace_listings_search ON marketplace_listings USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_marketplace_listings_tags ON marketplace_listings USING GIN(tags);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    
    -- Parties
    buyer_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,
    listing_id BIGINT NOT NULL,
    
    -- Transaction details
    status VARCHAR(20) NOT NULL DEFAULT 'initiated',
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    commission_amount DECIMAL(10,2) NOT NULL,
    seller_payout DECIMAL(10,2) NOT NULL,
    
    -- Payment gateway
    payment_gateway VARCHAR(20) NOT NULL,
    payment_id VARCHAR(255),
    payment_details JSONB,
    
    -- Escrow tracking
    escrow_held_at TIMESTAMP,
    delivery_confirmed_at TIMESTAMP,
    funds_released_at TIMESTAMP,
    auto_release_date TIMESTAMP,
    
    -- Dispute tracking
    dispute_opened_at TIMESTAMP,
    dispute_reason TEXT,
    dispute_status VARCHAR(20),
    dispute_resolved_at TIMESTAMP,
    dispute_resolution TEXT,
    dispute_resolved_by BIGINT,
    
    -- Metadata
    notes TEXT,
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_transactions_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_transactions_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_transactions_listing FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE
);

-- Create indexes for transactions
CREATE INDEX idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON transactions(seller_id);
CREATE INDEX idx_transactions_listing ON transactions(listing_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_payment_id ON transactions(payment_id);
CREATE INDEX idx_transactions_auto_release ON transactions(auto_release_date) WHERE auto_release_date IS NOT NULL AND status = 'delivered';
CREATE INDEX idx_transactions_deleted_at ON transactions(deleted_at);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- Create reviews table for marketplace listings
CREATE TABLE IF NOT EXISTS marketplace_reviews (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    listing_id BIGINT NOT NULL,
    transaction_id BIGINT NOT NULL,
    reviewer_id BIGINT NOT NULL,
    
    -- Review details
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    review_text TEXT,
    
    -- Response
    seller_response TEXT,
    seller_responded_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_marketplace_reviews_listing FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    CONSTRAINT fk_marketplace_reviews_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_marketplace_reviews_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Ensure one review per transaction
    CONSTRAINT uq_marketplace_reviews_transaction UNIQUE (transaction_id)
);

-- Create indexes for marketplace_reviews
CREATE INDEX idx_marketplace_reviews_tenant ON marketplace_reviews(tenant_id);
CREATE INDEX idx_marketplace_reviews_listing ON marketplace_reviews(listing_id);
CREATE INDEX idx_marketplace_reviews_reviewer ON marketplace_reviews(reviewer_id);
CREATE INDEX idx_marketplace_reviews_deleted_at ON marketplace_reviews(deleted_at);

-- Create trigger to update average_rating and total_reviews on marketplace_listings
CREATE OR REPLACE FUNCTION update_listing_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE marketplace_listings
        SET 
            average_rating = (
                SELECT COALESCE(AVG(rating), 0)
                FROM marketplace_reviews
                WHERE listing_id = NEW.listing_id AND deleted_at IS NULL
            ),
            total_reviews = (
                SELECT COUNT(*)
                FROM marketplace_reviews
                WHERE listing_id = NEW.listing_id AND deleted_at IS NULL
            )
        WHERE id = NEW.listing_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE marketplace_listings
        SET 
            average_rating = (
                SELECT COALESCE(AVG(rating), 0)
                FROM marketplace_reviews
                WHERE listing_id = OLD.listing_id AND deleted_at IS NULL
            ),
            total_reviews = (
                SELECT COUNT(*)
                FROM marketplace_reviews
                WHERE listing_id = OLD.listing_id AND deleted_at IS NULL
            )
        WHERE id = OLD.listing_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_listing_rating
AFTER INSERT OR UPDATE OR DELETE ON marketplace_reviews
FOR EACH ROW
EXECUTE FUNCTION update_listing_rating();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_marketplace_listings_updated_at
BEFORE UPDATE ON marketplace_listings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_marketplace_reviews_updated_at
BEFORE UPDATE ON marketplace_reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
