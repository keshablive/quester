// Two-Factor Authentication service
package services

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/base32"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
	"github.com/yourusername/quester/internal/config"
	fwconfig "github.com/yourusername/quester/internal/framework/config" // T223: For FeatureFlags
	"github.com/yourusername/quester/internal/framework/database"
	"github.com/yourusername/quester/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrTwoFactorNotEnabled       = errors.New("two-factor authentication is not enabled")
	ErrTwoFactorAlreadyEnabled   = errors.New("two-factor authentication is already enabled")
	ErrInvalidTwoFactorCode      = errors.New("invalid two-factor authentication code")
	ErrBackupCodeAlreadyUsed     = errors.New("backup code has already been used")
	ErrDeviceNotFound            = errors.New("trusted device not found")
	ErrCannotRevokeCurrentDevice = errors.New("cannot revoke current device")
)

// TwoFactorService handles 2FA operations
type TwoFactorService struct {
	kmsService *KMSService
	cfg        *fwconfig.Config
}

// NewTwoFactorService creates a new TwoFactorService
// T223: Now accepts Config to use FeatureFlags for KMS encryption enablement
func NewTwoFactorService(cfg *fwconfig.Config) *TwoFactorService {
	// Initialize KMS service
	kmsConfig, err := config.LoadKMSConfig()
	if err != nil {
		// Fallback to no encryption if KMS is not configured
		return &TwoFactorService{kmsService: nil, cfg: cfg}
	}

	kmsService, err := NewKMSService(kmsConfig)
	if err != nil {
		// Fallback to no encryption if KMS initialization fails
		return &TwoFactorService{kmsService: nil, cfg: cfg}
	}

	return &TwoFactorService{kmsService: kmsService, cfg: cfg}
}

// Enable2FAResponse contains setup data for 2FA
type Enable2FAResponse struct {
	Secret      string   `json:"secret"`
	QRCodeURL   string   `json:"qr_code_url"`
	BackupCodes []string `json:"backup_codes"`
}

// Enable generates a TOTP secret and backup codes for 2FA setup
func (s *TwoFactorService) Enable(userID uuid.UUID, email string) (*Enable2FAResponse, error) {
	// Check if 2FA is already enabled
	var existing models.User2FA
	if err := database.DB.Where("user_id = ? AND enabled = ?", userID, true).First(&existing).Error; err == nil {
		return nil, ErrTwoFactorAlreadyEnabled
	}

	// Generate TOTP secret
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "Quester",
		AccountName: email,
		SecretSize:  32,
		Algorithm:   otp.AlgorithmSHA1,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to generate TOTP secret: %w", err)
	}

	secret := key.Secret()
	qrCodeURL := key.URL()

	// Generate 10 backup codes
	backupCodes := make([]string, 10)
	for i := 0; i < 10; i++ {
		code, err := generateBackupCode()
		if err != nil {
			return nil, fmt.Errorf("failed to generate backup code: %w", err)
		}
		backupCodes[i] = code
	}

	// T216: Encrypt secret using KMS envelope encryption
	// T223: Use feature flag to determine if KMS should be used
	user2FA := models.User2FA{
		UserID:  userID,
		Enabled: false, // Not enabled until verified
	}

	// Get user's tenant_id for per-tenant feature flag check
	var user models.User
	if err := database.DB.Select("tenant_id").Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch user tenant: %w", err)
	}

	// Check if KMS encryption is enabled for this tenant (T223)
	useKMS := s.kmsService != nil && s.cfg != nil && s.cfg.FeatureFlags != nil &&
		s.cfg.FeatureFlags.IsKMSEnabled(user.TenantID.String())

	if useKMS {
		// Use KMS encryption (envelope encryption with DEK+KEK)
		ctx := context.Background()
		ciphertext, encryptedDEK, metadata, err := s.kmsService.EncryptSecret(ctx, secret, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to encrypt 2FA secret: %w", err)
		}

		now := time.Now()
		user2FA.EncryptedSecretCiphertext = ciphertext
		user2FA.EncryptedSecretDEK = encryptedDEK
		user2FA.EncryptionAlgorithm = metadata.Algorithm
		user2FA.EncryptionKeyVersion = metadata.KeyVersion
		user2FA.EncryptedAt = &now
	} else {
		// Fallback: Store as plaintext (LEGACY - should only happen in dev)
		user2FA.SecretEncrypted = secret
	}

	if err := database.DB.Create(&user2FA).Error; err != nil {
		return nil, fmt.Errorf("failed to store 2FA secret: %w", err)
	}

	// Store hashed backup codes
	for _, code := range backupCodes {
		hashedCode, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
		if err != nil {
			return nil, fmt.Errorf("failed to hash backup code: %w", err)
		}

		backupCode := models.BackupCode{
			UserID:   userID,
			CodeHash: string(hashedCode),
			Used:     false,
		}

		if err := database.DB.Create(&backupCode).Error; err != nil {
			return nil, fmt.Errorf("failed to store backup code: %w", err)
		}
	}

	return &Enable2FAResponse{
		Secret:      secret,
		QRCodeURL:   qrCodeURL,
		BackupCodes: backupCodes,
	}, nil
}

// Verify confirms the TOTP setup and enables 2FA
func (s *TwoFactorService) Verify(userID uuid.UUID, code string) error {
	// Get user's 2FA record
	var user2FA models.User2FA
	if err := database.DB.Where("user_id = ?", userID).First(&user2FA).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrTwoFactorNotEnabled
		}
		return fmt.Errorf("failed to get 2FA record: %w", err)
	}

	// T216: Decrypt secret if encrypted with KMS
	var secret string
	if user2FA.IsEncrypted() && s.kmsService != nil {
		ctx := context.Background()
		decrypted, err := s.kmsService.DecryptSecret(
			ctx,
			user2FA.EncryptedSecretCiphertext,
			user2FA.EncryptedSecretDEK,
			user2FA.EncryptionKeyVersion,
			userID,
		)
		if err != nil {
			return fmt.Errorf("failed to decrypt 2FA secret: %w", err)
		}
		secret = decrypted

		// Update last decrypted timestamp
		now := time.Now()
		user2FA.DecryptedAt = &now
	} else {
		// Fallback: Use plaintext secret (LEGACY)
		secret = user2FA.SecretEncrypted
	}

	// Validate TOTP code
	valid := totp.Validate(code, secret)
	if !valid {
		return ErrInvalidTwoFactorCode
	}

	// Enable 2FA
	user2FA.Enabled = true
	if err := database.DB.Save(&user2FA).Error; err != nil {
		return fmt.Errorf("failed to enable 2FA: %w", err)
	}

	return nil
}

// Disable removes 2FA from user account
func (s *TwoFactorService) Disable(userID uuid.UUID) error {
	// Get user's 2FA record
	var user2FA models.User2FA
	if err := database.DB.Where("user_id = ? AND enabled = ?", userID, true).First(&user2FA).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrTwoFactorNotEnabled
		}
		return fmt.Errorf("failed to get 2FA record: %w", err)
	}

	// Delete 2FA record (soft delete)
	if err := database.DB.Delete(&user2FA).Error; err != nil {
		return fmt.Errorf("failed to disable 2FA: %w", err)
	}

	// Delete all backup codes
	if err := database.DB.Where("user_id = ?", userID).Delete(&models.BackupCode{}).Error; err != nil {
		return fmt.Errorf("failed to delete backup codes: %w", err)
	}

	// Revoke all trusted devices
	if err := database.DB.Where("user_id = ?", userID).Delete(&models.TrustedDevice{}).Error; err != nil {
		return fmt.Errorf("failed to revoke trusted devices: %w", err)
	}

	return nil
}

// ValidateCode checks if a TOTP code or backup code is valid
func (s *TwoFactorService) ValidateCode(userID uuid.UUID, code string) (bool, error) {
	// Get user's 2FA record
	var user2FA models.User2FA
	if err := database.DB.Where("user_id = ? AND enabled = ?", userID, true).First(&user2FA).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, ErrTwoFactorNotEnabled
		}
		return false, fmt.Errorf("failed to get 2FA record: %w", err)
	}

	// Try TOTP code first
	if len(code) == 6 {
		// T216: Decrypt secret if encrypted with KMS
		var secret string
		if user2FA.IsEncrypted() && s.kmsService != nil {
			ctx := context.Background()
			decrypted, err := s.kmsService.DecryptSecret(
				ctx,
				user2FA.EncryptedSecretCiphertext,
				user2FA.EncryptedSecretDEK,
				user2FA.EncryptionKeyVersion,
				userID,
			)
			if err != nil {
				return false, fmt.Errorf("failed to decrypt 2FA secret: %w", err)
			}
			secret = decrypted

			// Update last decrypted timestamp
			now := time.Now()
			user2FA.DecryptedAt = &now
			database.DB.Save(&user2FA)
		} else {
			// Fallback: Use plaintext secret (LEGACY)
			secret = user2FA.SecretEncrypted
		}

		valid := totp.Validate(code, secret)
		if valid {
			return true, nil
		}
	}

	// Try backup code
	if len(code) == 8 {
		var backupCodes []models.BackupCode
		if err := database.DB.Where("user_id = ? AND used = ?", userID, false).Find(&backupCodes).Error; err != nil {
			return false, fmt.Errorf("failed to get backup codes: %w", err)
		}

		for _, bc := range backupCodes {
			if err := bcrypt.CompareHashAndPassword([]byte(bc.CodeHash), []byte(code)); err == nil {
				// Mark backup code as used
				now := time.Now()
				bc.Used = true
				bc.UsedAt = &now
				if err := database.DB.Save(&bc).Error; err != nil {
					return false, fmt.Errorf("failed to mark backup code as used: %w", err)
				}
				return true, nil
			}
		}
	}

	return false, nil
}

// IsEnabled checks if 2FA is enabled for a user
func (s *TwoFactorService) IsEnabled(userID uuid.UUID) (bool, error) {
	var user2FA models.User2FA
	if err := database.DB.Where("user_id = ? AND enabled = ?", userID, true).First(&user2FA).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check 2FA status: %w", err)
	}
	return true, nil
}

// TrustedDeviceInfo contains device information
type TrustedDeviceInfo struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	DeviceType string    `json:"device_type"`
	LastUsed   time.Time `json:"last_used"`
	CreatedAt  time.Time `json:"created_at"`
	IsCurrent  bool      `json:"is_current"`
}

// GetTrustedDevices returns all trusted devices for a user
func (s *TwoFactorService) GetTrustedDevices(userID uuid.UUID, currentDeviceFingerprint string) ([]TrustedDeviceInfo, error) {
	var devices []models.TrustedDevice
	if err := database.DB.Where("user_id = ? AND expires_at > ?", userID, time.Now()).
		Order("last_used DESC").
		Find(&devices).Error; err != nil {
		return nil, fmt.Errorf("failed to get trusted devices: %w", err)
	}

	result := make([]TrustedDeviceInfo, len(devices))
	for i, device := range devices {
		result[i] = TrustedDeviceInfo{
			ID:         device.ID.String(),
			Name:       device.DeviceName,
			DeviceType: device.DeviceType,
			LastUsed:   device.LastUsed,
			CreatedAt:  device.CreatedAt,
			IsCurrent:  device.DeviceFingerprint == currentDeviceFingerprint,
		}
	}

	return result, nil
}

// TrustDevice creates a trusted device entry
func (s *TwoFactorService) TrustDevice(userID uuid.UUID, deviceFingerprint, deviceName, deviceType string) (string, error) {
	// Generate trust token
	trustToken, err := generateTrustToken()
	if err != nil {
		return "", fmt.Errorf("failed to generate trust token: %w", err)
	}

	// Create trusted device (expires in 30 days)
	device := models.TrustedDevice{
		UserID:            userID,
		DeviceFingerprint: deviceFingerprint,
		DeviceName:        deviceName,
		DeviceType:        deviceType,
		TrustToken:        trustToken,
		ExpiresAt:         time.Now().Add(30 * 24 * time.Hour),
		LastUsed:          time.Now(),
	}

	if err := database.DB.Create(&device).Error; err != nil {
		return "", fmt.Errorf("failed to create trusted device: %w", err)
	}

	return trustToken, nil
}

// ValidateTrustToken checks if a device trust token is valid
func (s *TwoFactorService) ValidateTrustToken(userID uuid.UUID, trustToken string) (bool, error) {
	var device models.TrustedDevice
	if err := database.DB.Where("user_id = ? AND trust_token = ?", userID, trustToken).First(&device).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, fmt.Errorf("failed to validate trust token: %w", err)
	}

	// Check if expired
	if device.IsExpired() {
		// Delete expired device
		database.DB.Delete(&device)
		return false, nil
	}

	// Update last used
	device.LastUsed = time.Now()
	database.DB.Save(&device)

	return true, nil
}

// RevokeDevice removes a trusted device
func (s *TwoFactorService) RevokeDevice(userID uuid.UUID, deviceID string, currentDeviceFingerprint string) error {
	deviceUUID, err := uuid.Parse(deviceID)
	if err != nil {
		return fmt.Errorf("invalid device ID: %w", err)
	}

	var device models.TrustedDevice
	if err := database.DB.Where("id = ? AND user_id = ?", deviceUUID, userID).First(&device).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrDeviceNotFound
		}
		return fmt.Errorf("failed to get device: %w", err)
	}

	// Prevent revoking current device
	if device.DeviceFingerprint == currentDeviceFingerprint {
		return ErrCannotRevokeCurrentDevice
	}

	// Delete device
	if err := database.DB.Delete(&device).Error; err != nil {
		return fmt.Errorf("failed to revoke device: %w", err)
	}

	return nil
}

// LogAuditEvent creates an audit log entry
func (s *TwoFactorService) LogAuditEvent(userID uuid.UUID, eventType string, eventData map[string]interface{}, ipAddress, userAgent string) error {
	eventDataJSON, err := json.Marshal(eventData)
	if err != nil {
		return fmt.Errorf("failed to marshal event data: %w", err)
	}

	log := models.AuthAuditLog{
		UserID:    userID,
		EventType: eventType,
		EventData: string(eventDataJSON),
		IPAddress: ipAddress,
		UserAgent: userAgent,
	}

	if err := database.DB.Create(&log).Error; err != nil {
		return fmt.Errorf("failed to create audit log: %w", err)
	}

	return nil
}

// Helper functions

// generateBackupCode generates an 8-character alphanumeric backup code
func generateBackupCode() (string, error) {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Removed ambiguous characters
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}

	for i := 0; i < 8; i++ {
		b[i] = charset[int(b[i])%len(charset)]
	}

	return string(b), nil
}

// generateTrustToken generates a secure random trust token
func generateTrustToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base32.StdEncoding.EncodeToString(b), nil
}

// constantTimeCompare performs constant-time string comparison
func constantTimeCompare(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

// GenerateTOTPCode generates a TOTP code for testing purposes
// This is exported for use in tests only
func GenerateTOTPCode(secret string) (string, error) {
	return totp.GenerateCode(secret, time.Now())
}
