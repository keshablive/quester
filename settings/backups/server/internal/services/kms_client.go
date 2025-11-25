// T210: KMS Client Interface and Factory
// Package: server/internal/services
// Purpose: Multi-provider KMS client factory supporting AWS, GCP, Vault, Mock

package services

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"

	"github.com/yourusername/quester/internal/config"
)

// KMSClient defines the interface for KMS operations
type KMSClient interface {
	// GenerateDataKey creates a new DEK (Data Encryption Key)
	// Returns: plaintext DEK, encrypted DEK (by KEK), error
	GenerateDataKey(ctx context.Context, keyID string) ([]byte, []byte, error)

	// Decrypt decrypts an encrypted DEK using the KMS KEK (Key Encryption Key)
	// Returns: plaintext DEK, error
	Decrypt(ctx context.Context, encryptedDEK []byte) ([]byte, error)

	// GetKeyARN returns the KMS key ARN/ID
	GetKeyARN() string

	// GetProvider returns the provider name (aws, gcp, vault, mock)
	GetProvider() string
}

// NewKMSClient creates a KMS client based on the configuration
func NewKMSClient(cfg *config.KMSConfig) (KMSClient, error) {
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("invalid KMS config: %w", err)
	}

	switch cfg.Provider {
	case "aws":
		return newAWSKMSClient(cfg)
	case "gcp":
		return newGCPKMSClient(cfg)
	case "vault":
		return newVaultKMSClient(cfg)
	case "mock":
		return newMockKMSClient(cfg)
	default:
		return nil, fmt.Errorf("unsupported KMS provider: %s", cfg.Provider)
	}
}

// ============================================================================
// Mock KMS Client (for testing)
// ============================================================================

type mockKMSClient struct {
	keyARN    string
	masterKey []byte // Simulates the KEK
}

func newMockKMSClient(cfg *config.KMSConfig) (KMSClient, error) {
	// Generate a fixed master key for testing (32 bytes for AES-256)
	masterKey := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, masterKey); err != nil {
		return nil, fmt.Errorf("failed to generate mock master key: %w", err)
	}

	return &mockKMSClient{
		keyARN:    cfg.GetKeyARN(),
		masterKey: masterKey,
	}, nil
}

func (m *mockKMSClient) GenerateDataKey(ctx context.Context, keyID string) ([]byte, []byte, error) {
	// Generate a random 32-byte DEK
	plaintextDEK := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, plaintextDEK); err != nil {
		return nil, nil, fmt.Errorf("failed to generate DEK: %w", err)
	}

	// "Encrypt" the DEK with the master key using AES-GCM
	block, err := aes.NewCipher(m.masterKey)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, nil, fmt.Errorf("failed to generate nonce: %w", err)
	}

	encryptedDEK := gcm.Seal(nonce, nonce, plaintextDEK, nil)

	return plaintextDEK, encryptedDEK, nil
}

func (m *mockKMSClient) Decrypt(ctx context.Context, encryptedDEK []byte) ([]byte, error) {
	block, err := aes.NewCipher(m.masterKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(encryptedDEK) < nonceSize {
		return nil, fmt.Errorf("invalid encrypted DEK: too short")
	}

	nonce, ciphertext := encryptedDEK[:nonceSize], encryptedDEK[nonceSize:]
	plaintextDEK, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt DEK: %w", err)
	}

	return plaintextDEK, nil
}

func (m *mockKMSClient) GetKeyARN() string {
	return m.keyARN
}

func (m *mockKMSClient) GetProvider() string {
	return "mock"
}

// ============================================================================
// AWS KMS Client (placeholder - implement when AWS SDK is available)
// ============================================================================

type awsKMSClient struct {
	keyARN string
	region string
}

func newAWSKMSClient(cfg *config.KMSConfig) (KMSClient, error) {
	// TODO: Initialize AWS KMS SDK client
	// Example:
	//   sess, err := session.NewSession(&aws.Config{
	//       Region: aws.String(cfg.AWSRegion),
	//   })
	//   if err != nil {
	//       return nil, err
	//   }
	//   kmsClient := kms.New(sess)

	return &awsKMSClient{
		keyARN: cfg.GetKeyARN(),
		region: cfg.AWSRegion,
	}, nil
}

func (a *awsKMSClient) GenerateDataKey(ctx context.Context, keyID string) ([]byte, []byte, error) {
	// TODO: Call AWS KMS GenerateDataKey API
	// Example:
	//   result, err := a.client.GenerateDataKeyWithContext(ctx, &kms.GenerateDataKeyInput{
	//       KeyId:         aws.String(a.keyARN),
	//       KeySpec:       aws.String("AES_256"),
	//   })
	//   return result.Plaintext, result.CiphertextBlob, err

	return nil, nil, fmt.Errorf("AWS KMS not yet implemented - use mock provider for testing")
}

func (a *awsKMSClient) Decrypt(ctx context.Context, encryptedDEK []byte) ([]byte, error) {
	// TODO: Call AWS KMS Decrypt API
	return nil, fmt.Errorf("AWS KMS not yet implemented - use mock provider for testing")
}

func (a *awsKMSClient) GetKeyARN() string {
	return a.keyARN
}

func (a *awsKMSClient) GetProvider() string {
	return "aws"
}

// ============================================================================
// GCP Cloud KMS Client (placeholder)
// ============================================================================

type gcpKMSClient struct {
	keyARN    string
	projectID string
}

func newGCPKMSClient(cfg *config.KMSConfig) (KMSClient, error) {
	// TODO: Initialize GCP KMS client
	return &gcpKMSClient{
		keyARN:    cfg.GetKeyARN(),
		projectID: cfg.GCPProjectID,
	}, nil
}

func (g *gcpKMSClient) GenerateDataKey(ctx context.Context, keyID string) ([]byte, []byte, error) {
	return nil, nil, fmt.Errorf("GCP KMS not yet implemented - use mock provider for testing")
}

func (g *gcpKMSClient) Decrypt(ctx context.Context, encryptedDEK []byte) ([]byte, error) {
	return nil, fmt.Errorf("GCP KMS not yet implemented - use mock provider for testing")
}

func (g *gcpKMSClient) GetKeyARN() string {
	return g.keyARN
}

func (g *gcpKMSClient) GetProvider() string {
	return "gcp"
}

// ============================================================================
// HashiCorp Vault Client (placeholder)
// ============================================================================

type vaultKMSClient struct {
	keyARN string
	addr   string
}

func newVaultKMSClient(cfg *config.KMSConfig) (KMSClient, error) {
	// TODO: Initialize Vault client
	return &vaultKMSClient{
		keyARN: cfg.GetKeyARN(),
		addr:   cfg.VaultAddr,
	}, nil
}

func (v *vaultKMSClient) GenerateDataKey(ctx context.Context, keyID string) ([]byte, []byte, error) {
	return nil, nil, fmt.Errorf("vault KMS not yet implemented - use mock provider for testing")
}

func (v *vaultKMSClient) Decrypt(ctx context.Context, encryptedDEK []byte) ([]byte, error) {
	return nil, fmt.Errorf("vault KMS not yet implemented - use mock provider for testing")
}

func (v *vaultKMSClient) GetKeyARN() string {
	return v.keyARN
}

func (v *vaultKMSClient) GetProvider() string {
	return "vault"
}

// ============================================================================
// Helper functions
// ============================================================================

// EncryptWithDEK encrypts plaintext using a DEK with AES-256-GCM
func EncryptWithDEK(plaintextDEK, plaintext []byte) (string, error) {
	block, err := aes.NewCipher(plaintextDEK)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// DecryptWithDEK decrypts ciphertext using a DEK with AES-256-GCM
func DecryptWithDEK(plaintextDEK []byte, ciphertextB64 string) ([]byte, error) {
	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextB64)
	if err != nil {
		return nil, fmt.Errorf("failed to decode ciphertext: %w", err)
	}

	block, err := aes.NewCipher(plaintextDEK)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt: %w", err)
	}

	return plaintext, nil
}
