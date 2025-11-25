-- Create messaging system tables: conversations, conversation_participants, messages, message_reactions
-- Supports direct and group messaging with real-time delivery

-- Conversations table (group or 1:1 message threads)
CREATE TABLE IF NOT EXISTS conversations (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255), -- NULL for direct conversations
    type VARCHAR(20) NOT NULL DEFAULT 'direct', -- 'direct', 'group'
    creator_id BIGINT NOT NULL,
    last_message_at TIMESTAMP,
    last_message_text VARCHAR(500),
    participant_count INT DEFAULT 2,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_conversations_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_conversation_type CHECK (type IN ('direct', 'group')),
    CONSTRAINT chk_participant_count CHECK (participant_count >= 2 AND participant_count <= 50)
);

CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_creator ON conversations(creator_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC, tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_deleted ON conversations(deleted_at);

COMMENT ON TABLE conversations IS 'Group or 1:1 message threads';
COMMENT ON COLUMN conversations.name IS 'Required for groups, NULL for direct conversations';

-- Conversation participants table (join table for membership)
CREATE TABLE IF NOT EXISTS conversation_participants (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    conversation_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(20) DEFAULT 'member', -- 'admin', 'member'
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP,
    unread_count INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_conv_participants_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_conv_participants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_conversation_participant UNIQUE (conversation_id, user_id, tenant_id),
    CONSTRAINT chk_participant_role CHECK (role IN ('admin', 'member')),
    CONSTRAINT chk_unread_count CHECK (unread_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_tenant ON conversation_participants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conversation ON conversation_participants(conversation_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_deleted ON conversation_participants(deleted_at);

COMMENT ON TABLE conversation_participants IS 'Join table for conversation membership with roles';

-- Messages table (individual messages with encryption support)
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    conversation_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    content TEXT NOT NULL, -- Encrypted with AES-256
    content_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'video', 'audio', 'file'
    media_url VARCHAR(500),
    reply_to_id BIGINT,
    edited_at TIMESTAMP,
    deleted_at TIMESTAMP,
    deleted_for_all BOOLEAN DEFAULT FALSE,
    read_by_count INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_reply_to FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL,
    CONSTRAINT chk_message_content_type CHECK (content_type IN ('text', 'image', 'video', 'audio', 'file')),
    CONSTRAINT chk_message_content_length CHECK (char_length(content) <= 2000),
    CONSTRAINT chk_read_by_count CHECK (read_by_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC, tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages(deleted_at);

COMMENT ON TABLE messages IS 'Individual messages with AES-256 encryption at rest';
COMMENT ON COLUMN messages.content IS 'Encrypted message content (AES-256)';
COMMENT ON COLUMN messages.deleted_for_all IS 'TRUE if sender deleted within 1 hour';

-- Message reactions table (emoji reactions)
CREATE TABLE IF NOT EXISTS message_reactions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    message_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    emoji VARCHAR(10) NOT NULL, -- Unicode emoji
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_msg_reactions_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_reactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_message_user_emoji UNIQUE (message_id, user_id, emoji, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_msg_reactions_tenant ON message_reactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_msg_reactions_message ON message_reactions(message_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_msg_reactions_user ON message_reactions(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_msg_reactions_deleted ON message_reactions(deleted_at);

COMMENT ON TABLE message_reactions IS 'Emoji reactions on messages (one per user per emoji)';
