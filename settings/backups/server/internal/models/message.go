package models

import (
	"time"

	"gorm.io/gorm"
)

// Message represents a chat message between users
type Message struct {
	ID          string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID    string         `gorm:"type:uuid;not null;index:idx_messages_tenant" json:"tenant_id"`
	SenderID    string         `gorm:"type:uuid;not null;index:idx_messages_sender" json:"sender_id"`
	RecipientID string         `gorm:"type:uuid;not null;index:idx_messages_recipient" json:"recipient_id"`
	GroupID     *string        `gorm:"type:uuid;index:idx_messages_group" json:"group_id,omitempty"`
	MessageType string         `gorm:"type:varchar(50);not null;default:'text'" json:"message_type"` // text, image, video, file
	Content     string         `gorm:"type:text;not null" json:"content"`
	MediaURL    *string        `gorm:"type:text" json:"media_url,omitempty"`
	Metadata    map[string]any `gorm:"type:jsonb" json:"metadata,omitempty"`
	ReadAt      *time.Time     `json:"read_at,omitempty"`
	DeliveredAt *time.Time     `json:"delivered_at,omitempty"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
	CreatedAt   time.Time      `gorm:"not null;default:now();index:idx_messages_created" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"not null;default:now()" json:"updated_at"`

	// Relationships
	Sender    *User `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
	Recipient *User `gorm:"foreignKey:RecipientID" json:"recipient,omitempty"`
}

// TableName specifies the table name for Message model
func (Message) TableName() string {
	return "messages"
}

// BeforeCreate hook to validate message before creation
func (m *Message) BeforeCreate(tx *gorm.DB) error {
	if m.Content == "" && m.MediaURL == nil {
		return gorm.ErrInvalidData
	}
	return nil
}

// MarkAsDelivered marks the message as delivered
func (m *Message) MarkAsDelivered() {
	now := time.Now()
	m.DeliveredAt = &now
}

// MarkAsRead marks the message as read
func (m *Message) MarkAsRead() {
	now := time.Now()
	m.ReadAt = &now
	if m.DeliveredAt == nil {
		m.DeliveredAt = &now
	}
}

// IsRead checks if message has been read
func (m *Message) IsRead() bool {
	return m.ReadAt != nil
}

// IsDelivered checks if message has been delivered
func (m *Message) IsDelivered() bool {
	return m.DeliveredAt != nil
}

// IsGroupMessage checks if this is a group chat message
func (m *Message) IsGroupMessage() bool {
	return m.GroupID != nil
}

// MessageType constants
const (
	MessageTypeText  = "text"
	MessageTypeImage = "image"
	MessageTypeVideo = "video"
	MessageTypeFile  = "file"
	MessageTypeAudio = "audio"
)

// Group represents a chat group/channel
type Group struct {
	ID          string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID    string         `gorm:"type:uuid;not null;index:idx_groups_tenant" json:"tenant_id"`
	Name        string         `gorm:"type:varchar(255);not null" json:"name"`
	Description *string        `gorm:"type:text" json:"description,omitempty"`
	AvatarURL   *string        `gorm:"type:text" json:"avatar_url,omitempty"`
	CreatedBy   string         `gorm:"type:uuid;not null" json:"created_by"`
	GroupType   string         `gorm:"type:varchar(50);not null;default:'private'" json:"group_type"` // private, public
	MaxMembers  int            `gorm:"not null;default:100" json:"max_members"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
	CreatedAt   time.Time      `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"not null;default:now()" json:"updated_at"`

	// Relationships
	Creator  *User         `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Members  []GroupMember `gorm:"foreignKey:GroupID" json:"members,omitempty"`
	Messages []Message     `gorm:"foreignKey:GroupID" json:"messages,omitempty"`
}

// TableName specifies the table name for Group model
func (Group) TableName() string {
	return "groups"
}

// GroupType constants
const (
	GroupTypePrivate = "private"
	GroupTypePublic  = "public"
)

// GroupMember represents group membership
type GroupMember struct {
	ID        string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID  string         `gorm:"type:uuid;not null;index:idx_group_members_tenant" json:"tenant_id"`
	GroupID   string         `gorm:"type:uuid;not null;index:idx_group_members_group" json:"group_id"`
	UserID    string         `gorm:"type:uuid;not null;index:idx_group_members_user" json:"user_id"`
	Role      string         `gorm:"type:varchar(50);not null;default:'member'" json:"role"` // admin, moderator, member
	JoinedAt  time.Time      `gorm:"not null;default:now()" json:"joined_at"`
	LeftAt    *time.Time     `json:"left_at,omitempty"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
	CreatedAt time.Time      `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt time.Time      `gorm:"not null;default:now()" json:"updated_at"`

	// Relationships
	Group *Group `gorm:"foreignKey:GroupID" json:"group,omitempty"`
	User  *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName specifies the table name for GroupMember model
func (GroupMember) TableName() string {
	return "group_members"
}

// GroupRole constants
const (
	GroupRoleAdmin     = "admin"
	GroupRoleModerator = "moderator"
	GroupRoleMember    = "member"
)

// IsAdmin checks if member has admin role
func (gm *GroupMember) IsAdmin() bool {
	return gm.Role == GroupRoleAdmin
}

// IsModerator checks if member has moderator role
func (gm *GroupMember) IsModerator() bool {
	return gm.Role == GroupRoleModerator
}

// CanModerate checks if member can moderate (admin or moderator)
func (gm *GroupMember) CanModerate() bool {
	return gm.IsAdmin() || gm.IsModerator()
}

// IsActive checks if member is currently in the group
func (gm *GroupMember) IsActive() bool {
	return gm.LeftAt == nil
}
