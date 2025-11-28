// Repository interface contracts
package interfaces

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
)

// UserRepository defines the interface for user data access operations
// All methods are tenant-aware where applicable
type UserRepository interface {
	// CreateUser inserts a new user into the database
	// Automatically sets TenantID and validates uniqueness within tenant
	CreateUser(ctx context.Context, tenantID uuid.UUID, user *models.User) error

	// FindByEmail finds a user by email within a specific tenant
	// Returns error if user not found (tenant-scoped query)
	FindByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*models.User, error)

	// FindByID finds a user by ID (no tenant scoping - used for token validation)
	FindByID(ctx context.Context, userID uuid.UUID) (*models.User, error)

	// FindByUsername finds a user by username within a specific tenant
	FindByUsername(ctx context.Context, tenantID uuid.UUID, username string) (*models.User, error)

	// UpdateUser updates an existing user's fields
	UpdateUser(ctx context.Context, user *models.User) error

	// DeleteUser soft-deletes a user by ID within a specific tenant
	DeleteUser(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID) error

	// ListUsers retrieves paginated users within a tenant with optional filters
	ListUsers(ctx context.Context, tenantID uuid.UUID, limit, offset int, filters map[string]interface{}) ([]*models.User, int64, error)

	// UpdateLastLogin updates the last login timestamp for a user
	UpdateLastLogin(ctx context.Context, userID uuid.UUID, timestamp time.Time) error

	// GetUsersByRole retrieves all users with a specific role within a tenant
	GetUsersByRole(ctx context.Context, tenantID uuid.UUID, role string) ([]*models.User, error)

	// UpdateXP updates user's XP value (for gamification)
	UpdateXP(ctx context.Context, userID uuid.UUID, xpDelta int) error

	// GetUserStats retrieves aggregated statistics for a user (quests completed, badges earned, etc.)
	GetUserStats(ctx context.Context, userID uuid.UUID) (map[string]interface{}, error)
}

// QuestRepository defines the interface for quest data access operations
// All methods are tenant-aware where applicable
type QuestRepository interface {
	// Create creates a new quest in the database
	Create(ctx context.Context, quest *models.Quest) error

	// FindByID retrieves a quest by ID (tenant-scoped)
	FindByID(ctx context.Context, tenantID uuid.UUID, questID uuid.UUID) (*models.Quest, error)

	// FindAll retrieves all quests for a tenant with optional filters
	// Filters can include: status, type, creator_id, etc.
	FindAll(ctx context.Context, tenantID uuid.UUID, filters map[string]interface{}) ([]models.Quest, error)

	// Update updates an existing quest's fields
	Update(ctx context.Context, quest *models.Quest) error

	// Delete soft-deletes a quest by ID (tenant-scoped)
	Delete(ctx context.Context, tenantID uuid.UUID, questID uuid.UUID) error

	// GetQuestsByStatus retrieves all quests with a specific status within a tenant
	GetQuestsByStatus(ctx context.Context, tenantID uuid.UUID, status string) ([]models.Quest, error)

	// GetQuestsByCreatorID retrieves all quests created by a specific user
	GetQuestsByCreatorID(ctx context.Context, tenantID uuid.UUID, creatorID uuid.UUID) ([]models.Quest, error)

	// GetQuestsByBadgeID retrieves all quests that award a specific badge
	GetQuestsByBadgeID(ctx context.Context, tenantID uuid.UUID, badgeID uuid.UUID) ([]models.Quest, error)

	// CountQuestsByStatus counts the number of quests with a specific status
	CountQuestsByStatus(ctx context.Context, tenantID uuid.UUID, status string) (int64, error)

	// GetActiveQuests retrieves all active quests within a tenant
	GetActiveQuests(ctx context.Context, tenantID uuid.UUID) ([]models.Quest, error)
}

// PropertyRepository defines the interface for property data access operations
// Supports geospatial queries using PostGIS
type PropertyRepository interface {
	// Create inserts a new property into the database
	Create(ctx context.Context, property *models.Property) error

	// FindByID retrieves a property by ID (tenant-scoped)
	FindByID(ctx context.Context, tenantID uuid.UUID, propertyID uuid.UUID) (*models.Property, error)

	// FindAll retrieves all properties for a tenant with pagination
	FindAll(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]models.Property, int64, error)

	// Update updates an existing property's fields
	Update(ctx context.Context, property *models.Property) error

	// Delete soft-deletes a property by ID (tenant-scoped)
	Delete(ctx context.Context, tenantID uuid.UUID, propertyID uuid.UUID) error

	// SearchNearby searches for properties within a radius of a given location
	// Uses PostGIS ST_DWithin for efficient geospatial queries
	// radiusMeters: search radius in meters
	SearchNearby(ctx context.Context, tenantID uuid.UUID, latitude, longitude float64, radiusMeters float64) ([]models.Property, error)

	// GetPropertiesByOwnerID retrieves all properties owned by a specific user
	GetPropertiesByOwnerID(ctx context.Context, tenantID uuid.UUID, ownerID uuid.UUID) ([]models.Property, error)

	// GetPropertiesByStatus retrieves all properties with a specific status
	GetPropertiesByStatus(ctx context.Context, tenantID uuid.UUID, status string) ([]models.Property, error)

	// UpdatePropertyLocation updates the geospatial coordinates of a property
	UpdatePropertyLocation(ctx context.Context, propertyID uuid.UUID, latitude, longitude float64) error
}

// TransactionRepository defines the interface for transaction data access operations
// Handles financial transactions, escrow, and payment processing
type TransactionRepository interface {
	// Create inserts a new transaction into the database
	Create(ctx context.Context, transaction *models.Transaction) error

	// FindByID retrieves a transaction by ID (tenant-scoped)
	FindByID(ctx context.Context, tenantID uuid.UUID, transactionID uuid.UUID) (*models.Transaction, error)

	// FindAll retrieves all transactions for a tenant with optional filters
	// Filters can include: status, type, user_id, date_range, etc.
	FindAll(ctx context.Context, tenantID uuid.UUID, filters map[string]interface{}) ([]models.Transaction, error)

	// Update updates an existing transaction's fields
	Update(ctx context.Context, transaction *models.Transaction) error

	// Delete soft-deletes a transaction by ID (tenant-scoped)
	Delete(ctx context.Context, tenantID uuid.UUID, transactionID uuid.UUID) error

	// GetTransactionsByUserID retrieves all transactions for a specific user
	GetTransactionsByUserID(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID) ([]models.Transaction, error)

	// GetTransactionsByStatus retrieves all transactions with a specific status
	GetTransactionsByStatus(ctx context.Context, tenantID uuid.UUID, status string) ([]models.Transaction, error)

	// GetPendingEscrowTransactions retrieves all transactions in escrow state
	GetPendingEscrowTransactions(ctx context.Context, tenantID uuid.UUID) ([]models.Transaction, error)

	// UpdateTransactionStatus updates the status of a transaction (for escrow state changes)
	UpdateTransactionStatus(ctx context.Context, transactionID uuid.UUID, status string) error

	// GetUserBalance retrieves the current balance for a user
	GetUserBalance(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID) (float64, error)

	// GetTransactionsByDateRange retrieves transactions within a date range
	GetTransactionsByDateRange(ctx context.Context, tenantID uuid.UUID, startDate, endDate string) ([]models.Transaction, error)
}

// BadgeRepository defines the interface for badge data access operations
// Handles achievement badges and user badge assignments
type BadgeRepository interface {
	// Create inserts a new badge into the database
	Create(ctx context.Context, badge *models.Badge) error

	// FindByID retrieves a badge by ID (tenant-scoped)
	FindByID(ctx context.Context, tenantID uuid.UUID, badgeID uuid.UUID) (*models.Badge, error)

	// FindAll retrieves all badges for a tenant
	FindAll(ctx context.Context, tenantID uuid.UUID) ([]models.Badge, error)

	// Update updates an existing badge's fields
	Update(ctx context.Context, badge *models.Badge) error

	// Delete soft-deletes a badge by ID (tenant-scoped)
	Delete(ctx context.Context, tenantID uuid.UUID, badgeID uuid.UUID) error

	// GetBadgesByType retrieves all badges of a specific type
	GetBadgesByType(ctx context.Context, tenantID uuid.UUID, badgeType string) ([]models.Badge, error)

	// GetUserBadges retrieves all badges earned by a specific user
	GetUserBadges(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID) ([]models.UserBadge, error)

	// AwardBadgeToUser awards a badge to a user (creates UserBadge record)
	AwardBadgeToUser(ctx context.Context, userBadge *models.UserBadge) error

	// HasUserEarnedBadge checks if a user has earned a specific badge
	HasUserEarnedBadge(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID, badgeID uuid.UUID) (bool, error)

	// GetBadgeEarnCount retrieves the number of times a badge has been earned
	GetBadgeEarnCount(ctx context.Context, tenantID uuid.UUID, badgeID uuid.UUID) (int64, error)

	// RevokeBadgeFromUser removes a badge from a user
	RevokeBadgeFromUser(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID, badgeID uuid.UUID) error
}

// LeaderboardRepository defines the interface for leaderboard data access operations
// Handles leaderboard entries and rankings for competitive features
type LeaderboardRepository interface {
	// Create inserts a new leaderboard entry into the database
	Create(ctx context.Context, entry *models.Leaderboard) error

	// FindByID retrieves a leaderboard entry by ID (tenant-scoped)
	FindByID(ctx context.Context, tenantID uuid.UUID, entryID uuid.UUID) (*models.Leaderboard, error)

	// FindAll retrieves all leaderboard entries for a tenant with pagination
	FindAll(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]models.Leaderboard, int64, error)

	// Update updates an existing leaderboard entry's fields
	Update(ctx context.Context, entry *models.Leaderboard) error

	// Delete soft-deletes a leaderboard entry by ID (tenant-scoped)
	Delete(ctx context.Context, tenantID uuid.UUID, entryID uuid.UUID) error

	// GetTopPlayers retrieves the top N players by score
	GetTopPlayers(ctx context.Context, tenantID uuid.UUID, limit int) ([]models.Leaderboard, error)

	// GetUserRank retrieves the rank of a specific user on the leaderboard
	GetUserRank(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID) (int64, error)

	// GetLeaderboardByPeriod retrieves leaderboard entries for a specific period (daily, weekly, monthly, all-time)
	GetLeaderboardByPeriod(ctx context.Context, tenantID uuid.UUID, period string, limit int) ([]models.Leaderboard, error)

	// UpdateUserScore updates or creates a leaderboard entry for a user
	UpdateUserScore(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID, score int) error

	// GetUserLeaderboardEntry retrieves a user's leaderboard entry
	GetUserLeaderboardEntry(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID) (*models.Leaderboard, error)

	// ResetLeaderboard resets all scores for a specific period
	ResetLeaderboard(ctx context.Context, tenantID uuid.UUID, period string) error
}
