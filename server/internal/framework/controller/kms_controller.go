// T218-T220: KMS Admin Endpoints
// Package: server/internal/controllers
// Purpose: Admin endpoints for KMS management (key rotation, key listing, audit logs)

package controller

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/config"
	"github.com/keshablive/quester/internal/framework/database"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/repository"
	"github.com/keshablive/quester/internal/framework/service"
)

// KMSController handles KMS admin endpoints
type KMSController struct {
	kmsService *service.KMSService
}

// NewKMSController creates a new KMS controller
func NewKMSController() (*KMSController, error) {
	kmsConfig, err := config.LoadKMSConfig()
	if err != nil {
		return nil, err
	}

	// Create repository for encryption key management
	encKeyRepo := repository.NewEncryptionKeyRepository(database.DB)
	kmsService, err := service.NewKMSService(kmsConfig, encKeyRepo)
	if err != nil {
		return nil, err
	}

	return &KMSController{
		kmsService: kmsService,
	}, nil
}

// ============================================================================
// T218: POST /api/v1/admin/kms/rotate-dek - Manually trigger DEK rotation
// ============================================================================

type RotateDEKResponse struct {
	Success   bool               `json:"success"`
	Message   string             `json:"message"`
	OldKey    *EncryptionKeyInfo `json:"old_key,omitempty"`
	NewKey    *EncryptionKeyInfo `json:"new_key"`
	RotatedAt time.Time          `json:"rotated_at"`
}

type EncryptionKeyInfo struct {
	KeyID     string     `json:"key_id"`
	Version   int        `json:"version"`
	Algorithm string     `json:"algorithm"`
	Status    string     `json:"status"`
	CreatedAt time.Time  `json:"created_at"`
	RotatedAt *time.Time `json:"rotated_at,omitempty"`
}

func (kc *KMSController) RotateDEK(c *fiber.Ctx) error {
	ctx := context.Background()

	// Get current active key before rotation
	var oldKey models.EncryptionKey
	err := database.DB.Where("status = ?", models.KeyStatusActive).First(&oldKey).Error

	var oldKeyInfo *EncryptionKeyInfo
	if err == nil {
		oldKeyInfo = &EncryptionKeyInfo{
			KeyID:     oldKey.KeyID,
			Version:   oldKey.Version,
			Algorithm: oldKey.Algorithm,
			Status:    oldKey.Status,
			CreatedAt: oldKey.CreatedAt,
		}
	}

	// Perform rotation
	newKey, err := kc.kmsService.RotateDEK(ctx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to rotate DEK",
			"error":   err.Error(),
		})
	}

	return c.JSON(RotateDEKResponse{
		Success: true,
		Message: "DEK rotated successfully",
		OldKey:  oldKeyInfo,
		NewKey: &EncryptionKeyInfo{
			KeyID:     newKey.KeyID,
			Version:   newKey.Version,
			Algorithm: newKey.Algorithm,
			Status:    newKey.Status,
			CreatedAt: newKey.CreatedAt,
		},
		RotatedAt: time.Now(),
	})
}

// ============================================================================
// T219: GET /api/v1/admin/kms/keys - List all encryption keys
// ============================================================================

type ListKeysResponse struct {
	Success bool                `json:"success"`
	Keys    []EncryptionKeyInfo `json:"keys"`
	Total   int                 `json:"total"`
}

func (kc *KMSController) ListKeys(c *fiber.Ctx) error {
	// Get pagination parameters
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 50)

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	offset := (page - 1) * limit

	// Query encryption keys
	var keys []models.EncryptionKey
	var total int64

	query := database.DB.Model(&models.EncryptionKey{}).Order("version DESC")

	// Filter by status if provided
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	query.Count(&total)

	if err := query.Limit(limit).Offset(offset).Find(&keys).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to list keys",
			"error":   err.Error(),
		})
	}

	// Convert to response format
	keyInfos := make([]EncryptionKeyInfo, len(keys))
	for i, key := range keys {
		keyInfos[i] = EncryptionKeyInfo{
			KeyID:     key.KeyID,
			Version:   key.Version,
			Algorithm: key.Algorithm,
			Status:    key.Status,
			CreatedAt: key.CreatedAt,
			RotatedAt: key.RotatedAt,
		}
	}

	return c.JSON(ListKeysResponse{
		Success: true,
		Keys:    keyInfos,
		Total:   int(total),
	})
}

// ============================================================================
// T220: GET /api/v1/admin/kms/audit-log - Get KMS audit logs
// ============================================================================

type AuditLogResponse struct {
	Success bool            `json:"success"`
	Logs    []AuditLogEntry `json:"logs"`
	Total   int             `json:"total"`
	Message string          `json:"message,omitempty"`
}

type AuditLogEntry struct {
	Timestamp string    `json:"timestamp"`
	Operation string    `json:"operation"`
	UserID    uuid.UUID `json:"user_id,omitempty"`
	KeyID     string    `json:"key_id,omitempty"`
	Version   int       `json:"version,omitempty"`
	Success   bool      `json:"success"`
	Error     string    `json:"error,omitempty"`
}

func (kc *KMSController) GetAuditLog(c *fiber.Ctx) error {
	// TODO: Implement audit log retrieval from file or database
	// For now, return a message indicating it's stored in logs

	return c.JSON(AuditLogResponse{
		Success: true,
		Logs:    []AuditLogEntry{},
		Total:   0,
		Message: "Audit logs are stored in KMS audit log file (configured via KMS_AUDIT_LOG_PATH). Check server logs for entries prefixed with [KMS-Audit]",
	})

	// Production implementation would:
	// 1. Parse audit log file or query audit_logs table
	// 2. Apply filters (start_date, end_date, user_id, operation)
	// 3. Return paginated results
}

// ============================================================================
// Admin Stats - Additional endpoint for monitoring
// ============================================================================

type KMSStatsResponse struct {
	Success        bool       `json:"success"`
	ActiveKeyID    string     `json:"active_key_id"`
	ActiveVersion  int        `json:"active_version"`
	TotalKeys      int64      `json:"total_keys"`
	RotatedKeys    int64      `json:"rotated_keys"`
	ExpiredKeys    int64      `json:"expired_keys"`
	EncryptedUsers int64      `json:"encrypted_users"`
	PlaintextUsers int64      `json:"plaintext_users"`
	Provider       string     `json:"provider"`
	LastRotation   *time.Time `json:"last_rotation,omitempty"`
}

func (kc *KMSController) GetStats(c *fiber.Ctx) error {
	// Get active key
	var activeKey models.EncryptionKey
	activeKeyExists := database.DB.Where("status = ?", models.KeyStatusActive).
		First(&activeKey).Error == nil

	// Count keys by status
	var totalKeys, rotatedKeys, expiredKeys int64
	database.DB.Model(&models.EncryptionKey{}).Count(&totalKeys)
	database.DB.Model(&models.EncryptionKey{}).Where("status = ?", models.KeyStatusRotated).Count(&rotatedKeys)
	database.DB.Model(&models.EncryptionKey{}).Where("status = ?", models.KeyStatusExpired).Count(&expiredKeys)

	// Count encrypted vs plaintext secrets
	var encryptedUsers, plaintextUsers int64
	database.DB.Model(&models.User2FA{}).
		Where("encrypted_secret_ciphertext IS NOT NULL AND encrypted_secret_ciphertext != ''").
		Count(&encryptedUsers)
	database.DB.Model(&models.User2FA{}).
		Where("encrypted_secret_ciphertext IS NULL OR encrypted_secret_ciphertext = ''").
		Where("secret_encrypted IS NOT NULL AND secret_encrypted != ''").
		Count(&plaintextUsers)

	// Get KMS provider
	kmsConfig, _ := config.LoadKMSConfig()
	provider := "unknown"
	if kmsConfig != nil {
		provider = kmsConfig.Provider
	}

	stats := KMSStatsResponse{
		Success:        true,
		TotalKeys:      totalKeys,
		RotatedKeys:    rotatedKeys,
		ExpiredKeys:    expiredKeys,
		EncryptedUsers: encryptedUsers,
		PlaintextUsers: plaintextUsers,
		Provider:       provider,
	}

	if activeKeyExists {
		stats.ActiveKeyID = activeKey.KeyID
		stats.ActiveVersion = activeKey.Version
		stats.LastRotation = activeKey.RotatedAt
	}

	return c.JSON(stats)
}
