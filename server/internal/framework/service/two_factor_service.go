// Two-Factor Authentication service
package service

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
	"github.com/keshablive/quester/internal/framework/config"
	fwconfig "github.com/keshablive/quester/internal/framework/config" // T223: For FeatureFlags
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
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
	kmsService        *KMSService
	cfg               *fwconfig.Config
	twoFactorRepo     *repositories.TwoFactorRepository
	backupCodeRepo    *repositories.BackupCodeRepository
	trustedDeviceRepo *repositories.TrustedDeviceRepository
	authAuditLogRepo  *repositories.AuthAuditLogRepository
}

// NewTwoFactorService creates a new TwoFactorService
// T223: Now accepts Config to use FeatureFlags for KMS encryption enablement
func NewTwoFactorService(cfg *fwconfig.Config, twoFactorRepo *repositories.TwoFactorRepository, backupCodeRepo *repositories.BackupCodeRepository, trustedDeviceRepo *repositories.TrustedDeviceRepository, authAuditLogRepo *repositories.AuthAuditLogRepository, encKeyRepo *repositories.EncryptionKeyRepository) *TwoFactorService {
	// Initialize KMS service
	kmsConfig, err := config.LoadKMSConfig()
	if err != nil {
		// Fallback to no encryption if KMS is not configured
		return &TwoFactorService{
			kmsService:        nil,
			cfg:               cfg,
			twoFactorRepo:     twoFactorRepo,
			backupCodeRepo:    backupCodeRepo,
			trustedDeviceRepo: trustedDeviceRepo,
			authAuditLogRepo:  authAuditLogRepo,
		}
	}

	// Use injected encryption key repository for KMS
	kmsService, err := NewKMSService(kmsConfig, encKeyRepo)
	if err != nil {
		// Fallback to no encryption if KMS initialization fails
		return &TwoFactorService{
			kmsService:        nil,
			cfg:               cfg,
			twoFactorRepo:     twoFactorRepo,
			backupCodeRepo:    backupCodeRepo,
			trustedDeviceRepo: trustedDeviceRepo,
			authAuditLogRepo:  authAuditLogRepo,
		}
	}

	return &TwoFactorService{
		kmsService:        kmsService,
		cfg:               cfg,
		twoFactorRepo:     twoFactorRepo,
		backupCodeRepo:    backupCodeRepo,
		trustedDeviceRepo: trustedDeviceRepo,
		authAuditLogRepo:  authAuditLogRepo,
	}
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
	ctx := context.Background()
	_, err := s.twoFactorRepo.FindEnabledByUserID(ctx, userID)
	if err == nil {
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
	tenantID, err := s.twoFactorRepo.GetUserTenantID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user tenant: %w", err)
	}

	// Check if KMS encryption is enabled for this tenant (T223)
	useKMS := s.kmsService != nil && s.cfg != nil && s.cfg.FeatureFlags != nil &&
		s.cfg.FeatureFlags.IsKMSEnabled(tenantID.String())

	if useKMS {
		// Use KMS encryption (envelope encryption with DEK+KEK)
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

	if err := s.twoFactorRepo.Create(ctx, &user2FA); err != nil {
		return nil, err
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

		if err := s.backupCodeRepo.Create(ctx, &backupCode); err != nil {
			return nil, err
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
	ctx := context.Background()
	user2FA, err := s.twoFactorRepo.FindByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrTwoFactorNotEnabled
		}
		return err
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
	if err := s.twoFactorRepo.Update(ctx, user2FA); err != nil {
		return err
	}

	return nil
}

// Disable removes 2FA from user account
func (s *TwoFactorService) Disable(userID uuid.UUID) error {
	// Get user's 2FA record
	ctx := context.Background()
	user2FA, err := s.twoFactorRepo.FindEnabledByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrTwoFactorNotEnabled
		}
		return err
	}

	// Delete 2FA record (soft delete)
	if err := s.twoFactorRepo.Delete(ctx, user2FA); err != nil {
		return err
	}

	// Delete all backup codes
	if err := s.backupCodeRepo.DeleteByUserID(ctx, userID); err != nil {
		return err
	}

	// Revoke all trusted devices
	if err := s.trustedDeviceRepo.DeleteByUserID(ctx, userID); err != nil {
		return err
	}

	return nil
}

// ValidateCode checks if a TOTP code or backup code is valid
func (s *TwoFactorService) ValidateCode(userID uuid.UUID, code string) (bool, error) {
	// Get user's 2FA record
	ctx := context.Background()
	user2FA, err := s.twoFactorRepo.FindEnabledByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, ErrTwoFactorNotEnabled
		}
		return false, err
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
			s.twoFactorRepo.Update(ctx, user2FA)
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
		backupCodes, err := s.backupCodeRepo.FindUnusedByUserID(ctx, userID)
		if err != nil {
			return false, err
		}

		for _, bc := range backupCodes {
			if err := bcrypt.CompareHashAndPassword([]byte(bc.CodeHash), []byte(code)); err == nil {
				// Mark backup code as used
				now := time.Now()
				bc.Used = true
				bc.UsedAt = &now
				if err := s.backupCodeRepo.Update(ctx, &bc); err != nil {
					return false, err
				}
				return true, nil
			}
		}
	}

	return false, nil
}

// IsEnabled checks if 2FA is enabled for a user
func (s *TwoFactorService) IsEnabled(userID uuid.UUID) (bool, error) {
	ctx := context.Background()
	_, err := s.twoFactorRepo.FindEnabledByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
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
	ctx := context.Background()
	devices, err := s.trustedDeviceRepo.FindValidByUserID(ctx, userID)
	if err != nil {
		return nil, err
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

	ctx := context.Background()
	if err := s.trustedDeviceRepo.Create(ctx, &device); err != nil {
		return "", err
	}

	return trustToken, nil
}

// ValidateTrustToken checks if a device trust token is valid
func (s *TwoFactorService) ValidateTrustToken(userID uuid.UUID, trustToken string) (bool, error) {
	ctx := context.Background()
	device, err := s.trustedDeviceRepo.FindByTrustToken(ctx, userID, trustToken)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}

	// Check if expired
	if device.IsExpired() {
		// Delete expired device
		s.trustedDeviceRepo.Delete(ctx, device)
		return false, nil
	}

	// Update last used
	device.LastUsed = time.Now()
	s.trustedDeviceRepo.Update(ctx, device)

	return true, nil
}

// RevokeDevice removes a trusted device
func (s *TwoFactorService) RevokeDevice(userID uuid.UUID, deviceID string, currentDeviceFingerprint string) error {
	deviceUUID, err := uuid.Parse(deviceID)
	if err != nil {
		return fmt.Errorf("invalid device ID: %w", err)
	}

	ctx := context.Background()
	device, err := s.trustedDeviceRepo.FindByID(ctx, deviceUUID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrDeviceNotFound
		}
		return err
	}

	// Prevent revoking current device
	if device.DeviceFingerprint == currentDeviceFingerprint {
		return ErrCannotRevokeCurrentDevice
	}

	// Delete device
	if err := s.trustedDeviceRepo.Delete(ctx, device); err != nil {
		return err
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

	ctx := context.Background()
	if err := s.authAuditLogRepo.Create(ctx, &log); err != nil {
		return err
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
