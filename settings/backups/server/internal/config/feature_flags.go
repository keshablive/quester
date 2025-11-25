package config

import (
	"os"
	"strconv"
	"strings"
)

// FeatureFlags holds all feature flag configurations
type FeatureFlags struct {
	// KMS Encryption for 2FA secrets
	KMSEncryptionEnabled bool

	// Per-tenant feature flags (comma-separated tenant IDs)
	KMSEnabledTenants map[string]bool
}

// LoadFeatureFlags loads feature flags from environment variables
func LoadFeatureFlags() *FeatureFlags {
	flags := &FeatureFlags{
		KMSEncryptionEnabled: getEnvAsBool("FEATURE_KMS_ENCRYPTION_ENABLED", false),
		KMSEnabledTenants:    make(map[string]bool),
	}

	// Parse per-tenant KMS enablement
	tenantList := os.Getenv("FEATURE_KMS_ENABLED_TENANTS")
	if tenantList != "" {
		tenants := strings.Split(tenantList, ",")
		for _, tenantID := range tenants {
			trimmedID := strings.TrimSpace(tenantID)
			if trimmedID != "" {
				flags.KMSEnabledTenants[trimmedID] = true
			}
		}
	}

	return flags
}

// IsKMSEnabled checks if KMS encryption is enabled globally or for a specific tenant
func (f *FeatureFlags) IsKMSEnabled(tenantID string) bool {
	// Check global flag first
	if f.KMSEncryptionEnabled {
		return true
	}

	// Check per-tenant flag
	if tenantID != "" && f.KMSEnabledTenants[tenantID] {
		return true
	}

	return false
}

// getEnvAsBool reads an environment variable as a boolean
func getEnvAsBool(key string, defaultValue bool) bool {
	valStr := os.Getenv(key)
	if valStr == "" {
		return defaultValue
	}
	val, err := strconv.ParseBool(valStr)
	if err != nil {
		return defaultValue
	}
	return val
}
