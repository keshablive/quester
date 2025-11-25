-- Create social features tables: likes, comments, posts
-- Supports polymorphic likes, threaded comments, and user-generated posts

-- Likes table (polymorphic for posts, quests, courses, lessons)
CREATE TABLE IF NOT EXISTS likes (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- 'Post', 'Quest', 'Course', 'Lesson'
    content_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_like_unique UNIQUE (user_id, content_type, content_id, tenant_id),
    CONSTRAINT chk_like_content_type CHECK (content_type IN ('Post', 'Quest', 'Course', 'Lesson'))
);

CREATE INDEX IF NOT EXISTS idx_likes_tenant ON likes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_likes_content ON likes(content_type, content_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_likes_deleted ON likes(deleted_at);

COMMENT ON TABLE likes IS 'Polymorphic likes for posts, quests, courses, and lessons';
COMMENT ON COLUMN likes.content_type IS 'Type of content being liked (Post, Quest, Course, Lesson)';

-- Comments table (threaded with 3-level nesting support)
CREATE TABLE IF NOT EXISTS comments (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    content_id BIGINT NOT NULL,
    parent_id BIGINT, -- NULL for top-level comments
    content TEXT NOT NULL,
    edited_at TIMESTAMP,
    edit_history JSONB, -- Array of {content, timestamp}
    likes_count INT DEFAULT 0,
    replies_count INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    CONSTRAINT chk_comment_content_type CHECK (content_type IN ('Post', 'Quest', 'Course', 'Lesson')),
    CONSTRAINT chk_comment_length CHECK (char_length(content) <= 5000),
    CONSTRAINT chk_likes_count CHECK (likes_count >= 0),
    CONSTRAINT chk_replies_count CHECK (replies_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_comments_tenant ON comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_comments_content ON comments(content_type, content_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC, tenant_id);
CREATE INDEX IF NOT EXISTS idx_comments_deleted ON comments(deleted_at);

COMMENT ON TABLE comments IS 'Threaded comments with 3-level nesting support';
COMMENT ON COLUMN comments.parent_id IS 'NULL for top-level, references parent comment for replies';
COMMENT ON COLUMN comments.edit_history IS 'JSON array of edit records: [{content, timestamp}]';

-- Posts table (user-generated content with media)
CREATE TABLE IF NOT EXISTS posts (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    media_urls JSONB, -- Array of S3 URLs
    media_type VARCHAR(20) DEFAULT 'none', -- 'image', 'video', 'none'
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    shares_count INT DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_post_content_length CHECK (char_length(content) <= 5000),
    CONSTRAINT chk_post_media_type CHECK (media_type IN ('image', 'video', 'none')),
    CONSTRAINT chk_post_likes_count CHECK (likes_count >= 0),
    CONSTRAINT chk_post_comments_count CHECK (comments_count >= 0),
    CONSTRAINT chk_post_shares_count CHECK (shares_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_posts_tenant ON posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC, tenant_id);
CREATE INDEX IF NOT EXISTS idx_posts_flagged ON posts(is_flagged, tenant_id) WHERE is_flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_deleted ON posts(deleted_at);

COMMENT ON TABLE posts IS 'User-generated content posts with media attachments';
COMMENT ON COLUMN posts.media_urls IS 'JSON array of S3 URLs (max 10 per post)';
COMMENT ON COLUMN posts.is_flagged IS 'Auto-flagged by profanity filter or manual report';
