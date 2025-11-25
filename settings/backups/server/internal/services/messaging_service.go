package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/repositories"
)

// MessagingService handles messaging business logic
type MessagingService struct {
	messageRepo     *repositories.MessageRepository
	groupRepo       *repositories.GroupRepository
	groupMemberRepo *repositories.GroupMemberRepository
	userRepo        *repositories.UserRepository
	db              *gorm.DB
}

// NewMessagingService creates a new messaging service
func NewMessagingService(db *gorm.DB) *MessagingService {
	return &MessagingService{
		messageRepo:     repositories.NewMessageRepository(db),
		groupRepo:       repositories.NewGroupRepository(db),
		groupMemberRepo: repositories.NewGroupMemberRepository(db),
		userRepo:        repositories.NewUserRepository(db),
		db:              db,
	}
}

// SendDirectMessage sends a message to a specific user
func (s *MessagingService) SendDirectMessage(ctx context.Context, tenantID, senderID, recipientID, content, mediaURL string, messageType string, metadata map[string]any) (*models.Message, error) {
	// Parse UUIDs
	senderUUID, err := uuid.Parse(senderID)
	if err != nil {
		return nil, fmt.Errorf("invalid sender ID: %w", err)
	}
	recipientUUID, err := uuid.Parse(recipientID)
	if err != nil {
		return nil, fmt.Errorf("invalid recipient ID: %w", err)
	}

	// Validate sender and recipient exist
	if _, err := s.userRepo.FindByID(ctx, senderUUID); err != nil {
		return nil, fmt.Errorf("sender not found: %w", err)
	}

	if _, err := s.userRepo.FindByID(ctx, recipientUUID); err != nil {
		return nil, fmt.Errorf("recipient not found: %w", err)
	}

	// Create message
	message := &models.Message{
		TenantID:    tenantID,
		SenderID:    senderID,
		RecipientID: recipientID,
		MessageType: messageType,
		Content:     content,
		MediaURL:    &mediaURL,
		Metadata:    metadata,
	}

	if err := s.messageRepo.Create(ctx, message); err != nil {
		return nil, fmt.Errorf("failed to create message: %w", err)
	}

	return message, nil
}

// SendGroupMessage sends a message to a group
func (s *MessagingService) SendGroupMessage(ctx context.Context, tenantID, senderID, groupID, content, mediaURL string, messageType string, metadata map[string]any) (*models.Message, error) {
	// Parse sender UUID
	senderUUID, err := uuid.Parse(senderID)
	if err != nil {
		return nil, fmt.Errorf("invalid sender ID: %w", err)
	}

	// Validate sender exists
	if _, err := s.userRepo.FindByID(ctx, senderUUID); err != nil {
		return nil, fmt.Errorf("sender not found: %w", err)
	}

	// Validate group exists
	group, err := s.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("group not found: %w", err)
	}

	// Check if sender is a member of the group
	isMember, err := s.groupMemberRepo.IsUserMember(ctx, groupID, senderID)
	if err != nil {
		return nil, fmt.Errorf("failed to check membership: %w", err)
	}

	if !isMember {
		return nil, errors.New("sender is not a member of the group")
	}

	// Check if group is at capacity
	memberCount, err := s.groupMemberRepo.GetMemberCount(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to get member count: %w", err)
	}

	if memberCount >= group.MaxMembers {
		return nil, errors.New("group is at capacity")
	}

	// Create message
	message := &models.Message{
		TenantID:    tenantID,
		SenderID:    senderID,
		GroupID:     &groupID,
		MessageType: messageType,
		Content:     content,
		MediaURL:    &mediaURL,
		Metadata:    metadata,
	}

	if err := s.messageRepo.Create(ctx, message); err != nil {
		return nil, fmt.Errorf("failed to create group message: %w", err)
	}

	return message, nil
}

// GetDirectMessages retrieves messages between two users with pagination
func (s *MessagingService) GetDirectMessages(ctx context.Context, tenantID, userID, recipientID string, page, limit int) ([]*models.Message, int64, error) {
	return s.messageRepo.FindDirectMessages(ctx, tenantID, userID, recipientID, page, limit)
}

// GetGroupMessages retrieves messages in a group with pagination
func (s *MessagingService) GetGroupMessages(ctx context.Context, tenantID, groupID string, page, limit int) ([]*models.Message, int64, error) {
	return s.messageRepo.FindGroupMessages(ctx, tenantID, groupID, page, limit)
}

// GetMessageByID retrieves a single message by ID
func (s *MessagingService) GetMessageByID(ctx context.Context, messageID, tenantID string) (*models.Message, error) {
	message, err := s.messageRepo.FindByID(ctx, messageID)
	if err != nil {
		return nil, err
	}

	if message.TenantID != tenantID {
		return nil, errors.New("message not found in tenant")
	}

	return message, nil
}

// MarkMessageAsDelivered marks a message as delivered
func (s *MessagingService) MarkMessageAsDelivered(ctx context.Context, messageID, tenantID, userID string) error {
	message, err := s.GetMessageByID(ctx, messageID, tenantID)
	if err != nil {
		return err
	}

	// Verify user is the recipient
	if message.RecipientID != userID {
		return errors.New("user is not the recipient")
	}

	if message.IsDelivered() {
		return nil // Already delivered
	}

	message.MarkAsDelivered()
	return s.messageRepo.Update(ctx, message)
}

// MarkMessageAsRead marks a message as read
func (s *MessagingService) MarkMessageAsRead(ctx context.Context, messageID, tenantID, userID string) error {
	message, err := s.GetMessageByID(ctx, messageID, tenantID)
	if err != nil {
		return err
	}

	// Verify user is the recipient
	if message.RecipientID != userID {
		return errors.New("user is not the recipient")
	}

	if message.IsRead() {
		return nil // Already read
	}

	message.MarkAsRead()
	return s.messageRepo.Update(ctx, message)
}

// MarkMultipleAsRead marks multiple messages as read
func (s *MessagingService) MarkMultipleAsRead(ctx context.Context, messageIDs []string, tenantID, userID string) error {
	return s.messageRepo.MarkMultipleAsRead(ctx, messageIDs, tenantID, userID)
}

// DeleteMessage soft deletes a message
func (s *MessagingService) DeleteMessage(ctx context.Context, messageID, tenantID, userID string) error {
	message, err := s.GetMessageByID(ctx, messageID, tenantID)
	if err != nil {
		return err
	}

	// Verify user is the sender
	if message.SenderID != userID {
		return errors.New("user is not the sender")
	}

	return s.messageRepo.Delete(ctx, messageID)
}

// GetUnreadCount gets the count of unread messages for a user
func (s *MessagingService) GetUnreadCount(ctx context.Context, tenantID, userID string) (int64, error) {
	return s.messageRepo.GetUnreadCount(ctx, tenantID, userID)
}

// GetMessageThreads gets all message threads for a user
func (s *MessagingService) GetMessageThreads(ctx context.Context, tenantID, userID string, page, limit int) ([]map[string]interface{}, error) {
	return s.messageRepo.GetMessageThreads(ctx, tenantID, userID, page, limit)
}

// CreateGroup creates a new group
func (s *MessagingService) CreateGroup(ctx context.Context, tenantID, creatorID, name, description, avatarURL, groupType string, maxMembers int) (*models.Group, error) {
	// Parse creator UUID
	creatorUUID, err := uuid.Parse(creatorID)
	if err != nil {
		return nil, fmt.Errorf("invalid creator ID: %w", err)
	}

	// Validate creator exists
	if _, err := s.userRepo.FindByID(ctx, creatorUUID); err != nil {
		return nil, fmt.Errorf("creator not found: %w", err)
	}

	// Create group
	group := &models.Group{
		TenantID:    tenantID,
		Name:        name,
		Description: &description,
		AvatarURL:   &avatarURL,
		CreatedBy:   creatorID,
		GroupType:   groupType,
		MaxMembers:  maxMembers,
	}

	if err := s.groupRepo.Create(ctx, group); err != nil {
		return nil, fmt.Errorf("failed to create group: %w", err)
	}

	// Add creator as admin
	member := &models.GroupMember{
		TenantID: tenantID,
		GroupID:  group.ID,
		UserID:   creatorID,
		Role:     models.GroupRoleAdmin,
		JoinedAt: time.Now(),
	}

	if err := s.groupMemberRepo.Create(ctx, member); err != nil {
		return nil, fmt.Errorf("failed to add creator to group: %w", err)
	}

	return group, nil
}

// AddGroupMember adds a user to a group
func (s *MessagingService) AddGroupMember(ctx context.Context, tenantID, groupID, userID, adderID, role string) (*models.GroupMember, error) {
	// Validate group exists
	group, err := s.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("group not found: %w", err)
	}

	// Check if adder has permission
	adderMember, err := s.groupMemberRepo.FindByGroupAndUser(ctx, groupID, adderID)
	if err != nil {
		return nil, fmt.Errorf("adder is not a member: %w", err)
	}

	if !adderMember.CanModerate() {
		return nil, errors.New("adder does not have permission to add members")
	}

	// Check if user is already a member
	isMember, err := s.groupMemberRepo.IsUserMember(ctx, groupID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to check membership: %w", err)
	}

	if isMember {
		return nil, errors.New("user is already a member")
	}

	// Check if group is at capacity
	memberCount, err := s.groupMemberRepo.GetMemberCount(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to get member count: %w", err)
	}

	if memberCount >= group.MaxMembers {
		return nil, errors.New("group is at capacity")
	}

	// Parse user UUID
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	// Validate user exists
	if _, err := s.userRepo.FindByID(ctx, userUUID); err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Add member
	member := &models.GroupMember{
		TenantID: tenantID,
		GroupID:  groupID,
		UserID:   userID,
		Role:     role,
		JoinedAt: time.Now(),
	}

	if err := s.groupMemberRepo.Create(ctx, member); err != nil {
		return nil, fmt.Errorf("failed to add member: %w", err)
	}

	return member, nil
}

// RemoveGroupMember removes a user from a group
func (s *MessagingService) RemoveGroupMember(ctx context.Context, tenantID, groupID, userID, removerID string) error {
	// Check if remover has permission
	removerMember, err := s.groupMemberRepo.FindByGroupAndUser(ctx, groupID, removerID)
	if err != nil {
		return fmt.Errorf("remover is not a member: %w", err)
	}

	if !removerMember.CanModerate() && removerID != userID {
		return errors.New("remover does not have permission to remove members")
	}

	// Get member to remove
	member, err := s.groupMemberRepo.FindByGroupAndUser(ctx, groupID, userID)
	if err != nil {
		return fmt.Errorf("user is not a member: %w", err)
	}

	// Mark as left
	now := time.Now()
	member.LeftAt = &now
	return s.groupMemberRepo.Update(ctx, member)
}

// UpdateGroupMemberRole updates a member's role in a group
func (s *MessagingService) UpdateGroupMemberRole(ctx context.Context, tenantID, groupID, userID, updaterID, newRole string) error {
	// Check if updater has permission
	updaterMember, err := s.groupMemberRepo.FindByGroupAndUser(ctx, groupID, updaterID)
	if err != nil {
		return fmt.Errorf("updater is not a member: %w", err)
	}

	if !updaterMember.IsAdmin() {
		return errors.New("only admins can update member roles")
	}

	// Get member to update
	member, err := s.groupMemberRepo.FindByGroupAndUser(ctx, groupID, userID)
	if err != nil {
		return fmt.Errorf("user is not a member: %w", err)
	}

	// Update role
	member.Role = newRole
	return s.groupMemberRepo.Update(ctx, member)
}

// GetGroupMembers retrieves all members of a group
func (s *MessagingService) GetGroupMembers(ctx context.Context, tenantID, groupID string, page, limit int) ([]*models.GroupMember, int64, error) {
	return s.groupMemberRepo.FindByGroup(ctx, tenantID, groupID, page, limit)
}

// GetGroupByID retrieves a group by ID
func (s *MessagingService) GetGroupByID(ctx context.Context, groupID, tenantID string) (*models.Group, error) {
	group, err := s.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return nil, err
	}

	if group.TenantID != tenantID {
		return nil, errors.New("group not found in tenant")
	}

	return group, nil
}

// GetUserGroups retrieves all groups a user is a member of
func (s *MessagingService) GetUserGroups(ctx context.Context, tenantID, userID string, page, limit int) ([]*models.Group, int64, error) {
	return s.groupRepo.FindByUser(ctx, tenantID, userID, page, limit)
}

// SearchMessages searches for messages containing a keyword
func (s *MessagingService) SearchMessages(ctx context.Context, tenantID, userID, keyword string, page, limit int) ([]*models.Message, int64, error) {
	return s.messageRepo.Search(ctx, tenantID, userID, keyword, page, limit)
}

// GetMessageStats retrieves messaging statistics for a user
func (s *MessagingService) GetMessageStats(ctx context.Context, tenantID, userID string) (map[string]interface{}, error) {
	unreadCount, err := s.GetUnreadCount(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}

	totalSent, err := s.messageRepo.GetSentCount(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}

	totalReceived, err := s.messageRepo.GetReceivedCount(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"unread_count":   unreadCount,
		"total_sent":     totalSent,
		"total_received": totalReceived,
	}, nil
}
