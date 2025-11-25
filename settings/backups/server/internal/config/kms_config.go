// T209: KMS Configuration
// Package: server/internal/config
// Purpose: Configuration for Key Management Service (KMS) multi-provider support
//
// Supports: AWS KMS, GCP Cloud KMS, HashiCorp Vault, Mock (testing)

package config

import (
	"fmt"
	"os"
	"strings"
)

// KMSConfig holds configuration for KMS providers
type KMSConfig struct {
	// Provider type: "aws", "gcp", "vault", "mock"
	Provider string `json:"provider"`

	// AWS KMS Configuration
	AWSRegion    string `json:"aws_region,omitempty"`
	AWSKeyID     string `json:"aws_key_id,omitempty"`
	AWSAccessKey string `json:"-"` // Never log/serialize
	AWSSecretKey string `json:"-"` // Never log/serialize

	// GCP Cloud KMS Configuration
	GCPProjectID string `json:"gcp_project_id,omitempty"`
	GCPLocation  string `json:"gcp_location,omitempty"`
	GCPKeyRing   string `json:"gcp_key_ring,omitempty"`
	GCPKeyID     string `json:"gcp_key_id,omitempty"`
	GCPCredsJSON string `json:"-"` // Path to service account JSON

	// HashiCorp Vault Configuration
	VaultAddr      string `json:"vault_addr,omitempty"`
	VaultToken     string `json:"-"` // Never log/serialize
	VaultNamespace string `json:"vault_namespace,omitempty"`
	VaultPath      string `json:"vault_path,omitempty"` // Transit engine path
	VaultKeyName   string `json:"vault_key_name,omitempty"`

	// Mock Configuration (testing only)
	MockKeyID string `json:"mock_key_id,omitempty"`

	// DEK Cache Configuration
	DEKCacheTTL    int  `json:"dek_cache_ttl"`    // Seconds (default 3600 = 1 hour)
	DEKCacheEnable bool `json:"dek_cache_enable"` // Default true

	// Rotation Configuration
	DEKRotationDays int `json:"dek_rotation_days"` // Default 90 days

	// Audit Configuration
	AuditLogEnable bool   `json:"audit_log_enable"`         // Default true
	AuditLogPath   string `json:"audit_log_path,omitempty"` // File path or "stdout"
}

// LoadKMSConfig loads KMS configuration from environment variables
func LoadKMSConfig() (*KMSConfig, error) {
	provider := strings.ToLower(os.Getenv("KMS_PROVIDER"))
	if provider == "" {
		provider = "mock" // Default to mock for development
	}

	config := &KMSConfig{
		Provider:        provider,
		DEKCacheTTL:     getEnvInt("KMS_DEK_CACHE_TTL", 3600),
		DEKCacheEnable:  getEnvBool("KMS_DEK_CACHE_ENABLE", true),
		DEKRotationDays: getEnvInt("KMS_DEK_ROTATION_DAYS", 90),
		AuditLogEnable:  getEnvBool("KMS_AUDIT_LOG_ENABLE", true),
		AuditLogPath:    os.Getenv("KMS_AUDIT_LOG_PATH"),
	}

	// Load provider-specific configuration
	switch provider {
	case "aws":
		config.AWSRegion = os.Getenv("AWS_REGION")
		config.AWSKeyID = os.Getenv("AWS_KMS_KEY_ID")
		config.AWSAccessKey = os.Getenv("AWS_ACCESS_KEY_ID")
		config.AWSSecretKey = os.Getenv("AWS_SECRET_ACCESS_KEY")

		if config.AWSRegion == "" || config.AWSKeyID == "" {
			return nil, fmt.Errorf("AWS KMS requires AWS_REGION and AWS_KMS_KEY_ID")
		}

	case "gcp":
		config.GCPProjectID = os.Getenv("GCP_PROJECT_ID")
		config.GCPLocation = os.Getenv("GCP_KMS_LOCATION")
		config.GCPKeyRing = os.Getenv("GCP_KMS_KEY_RING")
		config.GCPKeyID = os.Getenv("GCP_KMS_KEY_ID")
		config.GCPCredsJSON = os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")

		if config.GCPProjectID == "" || config.GCPLocation == "" ||
			config.GCPKeyRing == "" || config.GCPKeyID == "" {
			return nil, fmt.Errorf("GCP KMS requires GCP_PROJECT_ID, GCP_KMS_LOCATION, GCP_KMS_KEY_RING, GCP_KMS_KEY_ID")
		}

	case "vault":
		config.VaultAddr = os.Getenv("VAULT_ADDR")
		config.VaultToken = os.Getenv("VAULT_TOKEN")
		config.VaultNamespace = os.Getenv("VAULT_NAMESPACE")
		config.VaultPath = os.Getenv("VAULT_TRANSIT_PATH")
		config.VaultKeyName = os.Getenv("VAULT_KEY_NAME")

		if config.VaultAddr == "" || config.VaultToken == "" || config.VaultKeyName == "" {
			return nil, fmt.Errorf("vault KMS requires VAULT_ADDR, VAULT_TOKEN, VAULT_KEY_NAME")
		}

		if config.VaultPath == "" {
			config.VaultPath = "transit" // Default transit engine path
		}

	case "mock":
		config.MockKeyID = os.Getenv("KMS_MOCK_KEY_ID")
		if config.MockKeyID == "" {
			config.MockKeyID = "mock-key-123" // Default for testing
		}

	default:
		return nil, fmt.Errorf("unsupported KMS provider: %s (must be aws, gcp, vault, or mock)", provider)
	}

	return config, nil
}

// GetKeyARN returns the KMS key ARN/ID for the configured provider
func (c *KMSConfig) GetKeyARN() string {
	switch c.Provider {
	case "aws":
		return fmt.Sprintf("arn:aws:kms:%s:*:key/%s", c.AWSRegion, c.AWSKeyID)
	case "gcp":
		return fmt.Sprintf("projects/%s/locations/%s/keyRings/%s/cryptoKeys/%s",
			c.GCPProjectID, c.GCPLocation, c.GCPKeyRing, c.GCPKeyID)
	case "vault":
		return fmt.Sprintf("%s/%s/keys/%s", c.VaultAddr, c.VaultPath, c.VaultKeyName)
	case "mock":
		return fmt.Sprintf("mock://%s", c.MockKeyID)
	default:
		return ""
	}
}

// Validate validates the KMS configuration
func (c *KMSConfig) Validate() error {
	if c.Provider != "aws" && c.Provider != "gcp" && c.Provider != "vault" && c.Provider != "mock" {
		return fmt.Errorf("invalid provider: %s", c.Provider)
	}

	if c.DEKCacheTTL < 0 {
		return fmt.Errorf("DEK cache TTL must be >= 0")
	}

	if c.DEKRotationDays < 1 {
		return fmt.Errorf("DEK rotation days must be >= 1")
	}

	return nil
}

// Helper functions

func getEnvInt(key string, defaultValue int) int {
	val := os.Getenv(key)
	if val == "" {
		return defaultValue
	}

	var intVal int
	_, err := fmt.Sscanf(val, "%d", &intVal)
	if err != nil {
		return defaultValue
	}

	return intVal
}

func getEnvBool(key string, defaultValue bool) bool {
	val := os.Getenv(key)
	if val == "" {
		return defaultValue
	}

	return val == "true" || val == "1" || val == "yes"
}
