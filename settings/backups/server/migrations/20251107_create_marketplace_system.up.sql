-- Create marketplace tables: marketplace_listings, transactions, wallets, wallet_ledgers, marketplace_reviews
-- Supports product listings, Stripe payments, wallet management, and reviews

-- Marketplace listings table
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL, -- 'course', 'quest_pack', 'template'
    content_id BIGINT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    pricing_model VARCHAR(20), -- 'free', 'one_time', 'subscription'
    preview_media_urls JSONB,
    purchase_count INT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    review_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_marketplace_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_marketplace_price CHECK (price >= 0),
    CONSTRAINT chk_marketplace_content_type CHECK (content_type IN ('course', 'quest_pack', 'template')),
    CONSTRAINT chk_marketplace_pricing_model CHECK (pricing_model IN ('free', 'one_time', 'subscription')),
    CONSTRAINT chk_marketplace_rating CHECK (rating >= 0 AND rating <= 5),
    CONSTRAINT chk_marketplace_purchase_count CHECK (purchase_count >= 0),
    CONSTRAINT chk_marketplace_review_count CHECK (review_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_tenant ON marketplace_listings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON marketplace_listings(seller_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_price ON marketplace_listings(price, tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_rating ON marketplace_listings(rating DESC, tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_active ON marketplace_listings(is_active, tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_featured ON marketplace_listings(is_featured, created_at DESC, tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_deleted ON marketplace_listings(deleted_at);

COMMENT ON TABLE marketplace_listings IS 'Marketplace product listings for courses, quest packs, and templates';

-- Transactions table (purchase records with Stripe integration)
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    buyer_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,
    listing_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    commission DECIMAL(10,2) NOT NULL, -- Platform fee (15%)
    currency VARCHAR(3) DEFAULT 'USD',
    payment_id VARCHAR(255) UNIQUE, -- Stripe payment_intent ID
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'refunded', 'failed'
    refunded_at TIMESTAMP,
    refund_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_transactions_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_transactions_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_transactions_listing FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    CONSTRAINT chk_transaction_amount CHECK (amount > 0),
    CONSTRAINT chk_transaction_commission CHECK (commission >= 0),
    CONSTRAINT chk_transaction_status CHECK (status IN ('pending', 'completed', 'refunded', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON transactions(seller_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_listing ON transactions(listing_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_id ON transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_deleted ON transactions(deleted_at);

COMMENT ON TABLE transactions IS 'Purchase records with Stripe payment tracking (15% commission)';
COMMENT ON COLUMN transactions.commission IS 'Platform commission (15% of amount)';

-- Wallets table (user balance tracking)
CREATE TABLE IF NOT EXISTS wallets (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    balance DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    pending_balance DECIMAL(10,2) DEFAULT 0.00, -- Held funds (7-day hold)
    currency VARCHAR(3) DEFAULT 'USD',
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    total_withdrawals DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_tenant_wallet UNIQUE (user_id, tenant_id),
    CONSTRAINT chk_wallet_balance CHECK (balance >= 0),
    CONSTRAINT chk_wallet_pending_balance CHECK (pending_balance >= 0),
    CONSTRAINT chk_wallet_earnings CHECK (total_earnings >= 0),
    CONSTRAINT chk_wallet_withdrawals CHECK (total_withdrawals >= 0)
);

CREATE INDEX IF NOT EXISTS idx_wallets_tenant ON wallets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_wallets_deleted ON wallets(deleted_at);

COMMENT ON TABLE wallets IS 'User wallet balance tracking with 7-day hold on pending funds';

-- Wallet ledger table (audit trail)
CREATE TABLE IF NOT EXISTS wallet_ledgers (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    wallet_id BIGINT NOT NULL,
    transaction_id BIGINT,
    type VARCHAR(20) NOT NULL, -- 'credit', 'debit', 'hold', 'release'
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    description VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_ledger_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
    CONSTRAINT fk_ledger_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
    CONSTRAINT chk_ledger_type CHECK (type IN ('credit', 'debit', 'hold', 'release'))
);

CREATE INDEX IF NOT EXISTS idx_ledger_tenant ON wallet_ledgers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_wallet ON wallet_ledgers(wallet_id, created_at DESC, tenant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_transaction ON wallet_ledgers(transaction_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_deleted ON wallet_ledgers(deleted_at);

COMMENT ON TABLE wallet_ledgers IS 'Immutable audit trail for all wallet transactions';

-- Marketplace reviews table
CREATE TABLE IF NOT EXISTS marketplace_reviews (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    listing_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    rating INT NOT NULL, -- 1-5 stars
    title VARCHAR(255),
    content TEXT,
    photo_urls JSONB,
    helpful_count INT DEFAULT 0,
    seller_reply TEXT,
    replied_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_reviews_listing FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_listing_user_review UNIQUE (listing_id, user_id, tenant_id),
    CONSTRAINT chk_review_rating CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT chk_review_content_length CHECK (char_length(content) <= 2000),
    CONSTRAINT chk_review_helpful_count CHECK (helpful_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_reviews_tenant ON marketplace_reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_listing ON marketplace_reviews(listing_id, created_at DESC, tenant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON marketplace_reviews(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_deleted ON marketplace_reviews(deleted_at);

COMMENT ON TABLE marketplace_reviews IS 'User reviews and ratings for marketplace products (1-5 stars)';
