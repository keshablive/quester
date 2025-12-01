// T211-T215: KMS Service Implementation
// Package: server/internal/services
// Purpose: High-level KMS service with DEK caching, encryption/decryption, audit logging
//
// Features:
// - T211: GenerateDataKey - Creates new DEK encrypted by KEK
// - T212: EncryptSecret - AES-256-GCM encryption with DEK
// - T213: DecryptSecret - Decryption with version support
// - T214: DEK caching - In-memory cache with 1-hour TTL
// - T215: Structured audit logging - All key operations logged

package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/config"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"
	"gorm.io/gorm"
)

// KMSService handles encryption operations with KMS
type KMSService struct {
	client      KMSClient
	config      *config.KMSConfig
	dekCache    *DEKCache
	auditLogger *KMSAuditLogger
	repo        *repositories.EncryptionKeyRepository
}

// NewKMSService creates a new KMS service
func NewKMSService(cfg *config.KMSConfig, repo *repositories.EncryptionKeyRepository) (*KMSService, error) {
	client, err := NewKMSClient(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create KMS client: %w", err)
	}

	service := &KMSService{
		client:      client,
		config:      cfg,
		dekCache:    NewDEKCache(time.Duration(cfg.DEKCacheTTL) * time.Second),
		auditLogger: NewKMSAuditLogger(cfg.AuditLogEnable, cfg.AuditLogPath),
		repo:        repo,
	}

	return service, nil
}

// ============================================================================
// T212: EncryptSecret - Encrypts plaintext secret using envelope encryption
// ============================================================================

// EncryptSecret encrypts a plaintext secret using envelope encryption
// Returns: ciphertext (base64), encrypted DEK, encryption metadata, error
func (s *KMSService) EncryptSecret(ctx context.Context, plaintext string, userID uuid.UUID) (string, []byte, *EncryptionMetadata, error) {
	// Get active DEK (from cache or generate new)
	encKey, plaintextDEK, err := s.getOrGenerateActiveDEK(ctx)
	if err != nil {
		s.auditLogger.LogFailure("EncryptSecret", userID, err)
		return "", nil, nil, fmt.Errorf("failed to get DEK: %w", err)
	}

	// Encrypt plaintext with DEK using AES-256-GCM
	ciphertext, err := EncryptWithDEK(plaintextDEK, []byte(plaintext))
	if err != nil {
		s.auditLogger.LogFailure("EncryptSecret", userID, err)
		return "", nil, nil, fmt.Errorf("failed to encrypt: %w", err)
	}

	metadata := &EncryptionMetadata{
		Algorithm:   encKey.Algorithm,
		KeyVersion:  encKey.Version,
		KeyID:       encKey.KeyID,
		EncryptedAt: time.Now(),
	}

	// Audit log (no plaintext!)
	s.auditLogger.LogEncryption(userID, encKey.KeyID, encKey.Version)

	return ciphertext, encKey.EncryptedDEK, metadata, nil
}

// ============================================================================
// T213: DecryptSecret - Decrypts ciphertext with version support
// ============================================================================

// DecryptSecret decrypts a ciphertext using the specified DEK version
func (s *KMSService) DecryptSecret(ctx context.Context, ciphertext string, encryptedDEK []byte, keyVersion int, userID uuid.UUID) (string, error) {
	// Validate inputs
	if len(ciphertext) == 0 {
		err := fmt.Errorf("ciphertext too short")
		s.auditLogger.LogFailure("DecryptSecret", userID, err)
		return "", err
	}
	if len(encryptedDEK) == 0 {
		err := fmt.Errorf("encrypted DEK is empty")
		s.auditLogger.LogFailure("DecryptSecret", userID, err)
		return "", err
	}

	// Validate key version exists in database (prevents replay attacks with fake versions)
	count, err := s.repo.CountByVersion(ctx, keyVersion)
	if err != nil {
		s.auditLogger.LogFailure("DecryptSecret", userID, err)
		return "", err
	}
	if count == 0 {
		err := fmt.Errorf("key version %d does not exist", keyVersion)
		s.auditLogger.LogFailure("DecryptSecret", userID, err)
		return "", err
	}

	// Create cache key from encrypted DEK hash (prevents tampering)
	dekHash := sha256.Sum256(encryptedDEK)
	cacheKey := fmt.Sprintf("dek:%s", hex.EncodeToString(dekHash[:16])) // Use first 16 bytes of hash

	// Try to get DEK from cache first
	plaintextDEK, found := s.dekCache.Get(cacheKey)

	if !found {
		// Cache miss - decrypt DEK using KMS
		var err error
		plaintextDEK, err = s.client.Decrypt(ctx, encryptedDEK)
		if err != nil {
			s.auditLogger.LogFailure("DecryptSecret", userID, err)
			return "", fmt.Errorf("failed to decrypt DEK: %w", err)
		}

		// Validate decrypted DEK length (AES-256 = 32 bytes)
		if len(plaintextDEK) != 32 {
			err := fmt.Errorf("invalid DEK length: expected 32, got %d", len(plaintextDEK))
			s.auditLogger.LogFailure("DecryptSecret", userID, err)
			return "", err
		}

		// Cache the plaintext DEK
		s.dekCache.Set(cacheKey, plaintextDEK)
	}

	// Decrypt ciphertext with DEK
	plaintext, err := DecryptWithDEK(plaintextDEK, ciphertext)
	if err != nil {
		s.auditLogger.LogFailure("DecryptSecret", userID, err)
		return "", fmt.Errorf("failed to decrypt: %w", err)
	}

	// Audit log (no plaintext!)
	s.auditLogger.LogDecryption(userID, fmt.Sprintf("dek-v%d", keyVersion), keyVersion)

	return string(plaintext), nil
}

// ============================================================================
// T211: GenerateDataKey - Creates new DEK and stores in database
// ============================================================================

// getOrGenerateActiveDEK gets the active DEK or generates a new one
func (s *KMSService) getOrGenerateActiveDEK(ctx context.Context) (*models.EncryptionKey, []byte, error) {
	// Try to get active key from database
	encKeyPtr, err := s.repo.FindActive(ctx)

	if err == nil {
		// Active key found - check cache using encrypted DEK hash
		dekHash := sha256.Sum256(encKeyPtr.EncryptedDEK)
		cacheKey := fmt.Sprintf("dek:%s", hex.EncodeToString(dekHash[:16]))
		plaintextDEK, found := s.dekCache.Get(cacheKey)

		if found {
			return encKeyPtr, plaintextDEK, nil
		}

		// Cache miss - decrypt DEK
		plaintextDEK, err = s.client.Decrypt(ctx, encKeyPtr.EncryptedDEK)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to decrypt cached DEK: %w", err)
		}

		s.dekCache.Set(cacheKey, plaintextDEK)
		return encKeyPtr, plaintextDEK, nil
	}

	if err != gorm.ErrRecordNotFound {
		return nil, nil, fmt.Errorf("database error: %w", err)
	}

	// No active key - generate new one
	return s.GenerateNewDEK(ctx)
}

// GenerateNewDEK generates a new DEK and stores it in the database
func (s *KMSService) GenerateNewDEK(ctx context.Context) (*models.EncryptionKey, []byte, error) {
	// Generate DEK via KMS
	plaintextDEK, encryptedDEK, err := s.client.GenerateDataKey(ctx, s.client.GetKeyARN())
	if err != nil {
		return nil, nil, fmt.Errorf("KMS GenerateDataKey failed: %w", err)
	}

	// Get next version number
	maxVersion, err := s.repo.GetMaxVersion(ctx)
	if err != nil {
		return nil, nil, err
	}
	nextVersion := maxVersion + 1

	// Create encryption key record
	encKey := &models.EncryptionKey{
		KeyID:        fmt.Sprintf("dek-%s-%03d", time.Now().Format("2006"), nextVersion),
		Version:      nextVersion,
		EncryptedDEK: encryptedDEK,
		Algorithm:    models.AlgorithmAES256GCM,
		KMSProvider:  s.client.GetProvider(),
		KMSKeyARN:    s.client.GetKeyARN(),
		Status:       models.KeyStatusActive,
		CreatedAt:    time.Now(),
	}

	if err := s.repo.Create(ctx, encKey); err != nil {
		return nil, nil, err
	}

	// Cache the plaintext DEK using encrypted DEK hash
	dekHash := sha256.Sum256(encKey.EncryptedDEK)
	cacheKey := fmt.Sprintf("dek:%s", hex.EncodeToString(dekHash[:16]))
	s.dekCache.Set(cacheKey, plaintextDEK)

	// Audit log
	s.auditLogger.LogKeyGeneration(encKey.KeyID, encKey.Version)

	return encKey, plaintextDEK, nil
}

// RotateDEK rotates the active DEK (marks old as rotated, generates new)
func (s *KMSService) RotateDEK(ctx context.Context) (*models.EncryptionKey, error) {
	// Get current active key (or none if first call)
	currentKeyPtr, err := s.repo.FindActive(ctx)

	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("failed to get current key: %w", err)
	}

	// Mark current key as rotated (if exists)
	if err == nil {
		currentKeyPtr.MarkRotated()
		if err := s.repo.Update(ctx, currentKeyPtr); err != nil {
			return nil, err
		}
	}

	// Generate new DEK
	newKey, _, err := s.GenerateNewDEK(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to generate new DEK: %w", err)
	}

	// Audit log
	var oldKeyID string
	if currentKeyPtr != nil {
		oldKeyID = currentKeyPtr.KeyID
	}
	s.auditLogger.LogKeyRotation(oldKeyID, newKey.KeyID)

	return newKey, nil
}

// ============================================================================
// T214: DEK Cache - In-memory cache with TTL
// ============================================================================

type DEKCache struct {
	cache map[string]*cacheEntry
	ttl   time.Duration
	mu    sync.RWMutex
}

type cacheEntry struct {
	data      []byte
	expiresAt time.Time
}

func NewDEKCache(ttl time.Duration) *DEKCache {
	cache := &DEKCache{
		cache: make(map[string]*cacheEntry),
		ttl:   ttl,
	}

	// Start cleanup goroutine
	go cache.cleanup()

	return cache
}

func (c *DEKCache) Get(key string) ([]byte, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	entry, exists := c.cache[key]
	if !exists {
		return nil, false
	}

	if time.Now().After(entry.expiresAt) {
		return nil, false
	}

	return entry.data, true
}

func (c *DEKCache) Set(key string, data []byte) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.cache[key] = &cacheEntry{
		data:      data,
		expiresAt: time.Now().Add(c.ttl),
	}
}

func (c *DEKCache) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for key, entry := range c.cache {
			if now.After(entry.expiresAt) {
				delete(c.cache, key)
			}
		}
		c.mu.Unlock()
	}
}

// ============================================================================
// T215: Structured Audit Logging
// ============================================================================

type KMSAuditLogger struct {
	enabled bool
	logPath string
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

func NewKMSAuditLogger(enabled bool, logPath string) *KMSAuditLogger {
	return &KMSAuditLogger{
		enabled: enabled,
		logPath: logPath,
	}
}

func (l *KMSAuditLogger) LogEncryption(userID uuid.UUID, keyID string, version int) {
	if !l.enabled {
		return
	}

	entry := AuditLogEntry{
		Timestamp: time.Now().Format(time.RFC3339),
		Operation: "EncryptSecret",
		UserID:    userID,
		KeyID:     keyID,
		Version:   version,
		Success:   true,
	}

	l.write(entry)
}

func (l *KMSAuditLogger) LogDecryption(userID uuid.UUID, keyID string, version int) {
	if !l.enabled {
		return
	}

	entry := AuditLogEntry{
		Timestamp: time.Now().Format(time.RFC3339),
		Operation: "DecryptSecret",
		UserID:    userID,
		KeyID:     keyID,
		Version:   version,
		Success:   true,
	}

	l.write(entry)
}

func (l *KMSAuditLogger) LogKeyGeneration(keyID string, version int) {
	if !l.enabled {
		return
	}

	entry := AuditLogEntry{
		Timestamp: time.Now().Format(time.RFC3339),
		Operation: "GenerateDataKey",
		KeyID:     keyID,
		Version:   version,
		Success:   true,
	}

	l.write(entry)
}

func (l *KMSAuditLogger) LogKeyRotation(oldKeyID, newKeyID string) {
	if !l.enabled {
		return
	}

	entry := AuditLogEntry{
		Timestamp: time.Now().Format(time.RFC3339),
		Operation: "RotateDEK",
		KeyID:     fmt.Sprintf("%s -> %s", oldKeyID, newKeyID),
		Success:   true,
	}

	l.write(entry)
}

func (l *KMSAuditLogger) LogFailure(operation string, userID uuid.UUID, err error) {
	if !l.enabled {
		return
	}

	entry := AuditLogEntry{
		Timestamp: time.Now().Format(time.RFC3339),
		Operation: operation,
		UserID:    userID,
		Success:   false,
		Error:     err.Error(),
	}

	l.write(entry)
}

func (l *KMSAuditLogger) write(entry AuditLogEntry) {
	data, _ := json.Marshal(entry)

	// Log to stdout or file
	if l.logPath == "" || l.logPath == "stdout" {
		log.Printf("[KMS-Audit] %s\n", string(data))
	} else {
		// Note: File logging can be implemented using lumberjack for rotation
		// For now, fallback to stdout logging
		log.Printf("[KMS-Audit] %s\n", string(data))
	}
}

// ============================================================================
// Helper Types
// ============================================================================

type EncryptionMetadata struct {
	Algorithm   string    `json:"algorithm"`
	KeyVersion  int       `json:"key_version"`
	KeyID       string    `json:"key_id"`
	EncryptedAt time.Time `json:"encrypted_at"`
}
