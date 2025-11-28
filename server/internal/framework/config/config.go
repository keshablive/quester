// Environment-based config loading
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// FeatureFlags holds all feature flag configurations
type FeatureFlags struct {
	// Mock injection toggle (FR-011)
	// When true, DI container registers mock implementations instead of real services
	UseMocks bool

	// Payment provider selection (FR-012)
	// Options: "stripe", "razorpay", "both"
	PaymentProvider string

	// KMS Encryption for 2FA secrets
	KMSEncryptionEnabled bool

	// Per-tenant feature flags (comma-separated tenant IDs)
	KMSEnabledTenants map[string]bool
}

// PaymentConfig holds payment gateway configuration (FR-012)
type PaymentConfig struct {
	// Provider selection: "stripe", "razorpay", "both"
	Provider string

	// Stripe credentials (only required if Provider includes "stripe")
	StripeAPIKey        string
	StripeWebhookSecret string

	// Razorpay credentials (only required if Provider includes "razorpay")
	RazorpayKeyID         string
	RazorpayKeySecret     string
	RazorpayWebhookSecret string
}

// Validate checks if required credentials are present for the selected provider
func (p *PaymentConfig) Validate() error {
	switch p.Provider {
	case "stripe":
		if p.StripeAPIKey == "" {
			return fmt.Errorf("STRIPE_API_KEY required when PAYMENT_PROVIDER=stripe")
		}
	case "razorpay":
		if p.RazorpayKeyID == "" || p.RazorpayKeySecret == "" {
			return fmt.Errorf("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET required when PAYMENT_PROVIDER=razorpay")
		}
	case "both":
		if p.StripeAPIKey == "" {
			return fmt.Errorf("STRIPE_API_KEY required when PAYMENT_PROVIDER=both")
		}
		if p.RazorpayKeyID == "" || p.RazorpayKeySecret == "" {
			return fmt.Errorf("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET required when PAYMENT_PROVIDER=both")
		}
	default:
		return fmt.Errorf("invalid PAYMENT_PROVIDER: %s (must be stripe, razorpay, or both)", p.Provider)
	}
	return nil
}

// IsStripeEnabled returns true if Stripe is enabled
func (p *PaymentConfig) IsStripeEnabled() bool {
	return p.Provider == "stripe" || p.Provider == "both"
}

// IsRazorpayEnabled returns true if Razorpay is enabled
func (p *PaymentConfig) IsRazorpayEnabled() bool {
	return p.Provider == "razorpay" || p.Provider == "both"
}

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

// TransactionServiceConfig holds all dependencies for TransactionService
// Replaces 5-parameter constructor with single config struct
type TransactionServiceConfig struct {
	TransactionRepo     interface{} // interfaces.TransactionRepository
	UserRepo            interface{} // interfaces.UserRepository
	PaymentManager      interface{} // *services.PaymentManager
	MarketplaceRepo     interface{} // interfaces.MarketplaceRepository
	NotificationService interface{} // *services.NotificationService (optional)
}

// SocialServiceConfig holds all dependencies for SocialService
// Replaces 7-parameter constructor with single config struct
type SocialServiceConfig struct {
	LikeRepo            interface{} // interfaces.LikeRepository
	CommentRepo         interface{} // interfaces.CommentRepository
	PostRepo            interface{} // interfaces.PostRepository
	ActivityRepo        interface{} // interfaces.ActivityRepository
	UserRepo            interface{} // interfaces.UserRepository
	FollowRepo          interface{} // interfaces.FollowRepository
	NotificationService interface{} // *services.NotificationService (optional)
}

// MarketplaceServiceConfig holds all dependencies for MarketplaceService
type MarketplaceServiceConfig struct {
	MarketplaceRepo interface{} // interfaces.MarketplaceRepository
	UserRepo        interface{} // interfaces.UserRepository
	CourseRepo      interface{} // interfaces.CourseRepository
	BadgeRepo       interface{} // interfaces.BadgeRepository
}

// TwoFactorServiceConfig holds all dependencies for TwoFactorService
// Addresses 22 global database.DB calls
type TwoFactorServiceConfig struct {
	TwoFactorRepo     interface{} // interfaces.TwoFactorRepository
	BackupCodeRepo    interface{} // interfaces.BackupCodeRepository
	TrustedDeviceRepo interface{} // interfaces.TrustedDeviceRepository
	TwoFALogRepo      interface{} // interfaces.TwoFALogRepository
	UserRepo          interface{} // interfaces.UserRepository
	KMSService        interface{} // *services.KMSService
}

// Config holds all application configuration
type Config struct {
	// Server
	Port int
	Host string
	Env  string

	// Database
	DatabaseURL       string
	DBMaxOpenConns    int
	DBMaxIdleConns    int
	DBConnMaxLifetime time.Duration
	DBConnMaxIdleTime time.Duration // Connection pool idle timeout (010-connection-pool-tuning)

	// Connection Pool Tuning (010-connection-pool-tuning)
	DBPoolWarmupEnabled        bool          // Enable connection warmup on startup
	DBPoolWarmupSize           int           // Number of connections to pre-warm
	DBPoolWarmupTimeout        time.Duration // Timeout for warmup phase
	DBPoolHealthCheckEnabled   bool          // Enable periodic health checks
	DBPoolHealthCheckInterval  time.Duration // Health check interval
	DBPoolHealthCheckTimeout   time.Duration // Health check query timeout
	DBPoolAdaptiveEnabled      bool          // Enable adaptive pool sizing
	DBPoolAdaptiveMinFloor     int           // Minimum connections (floor)
	DBPoolAdaptiveMaxCeiling   int           // Maximum connections (ceiling)
	DBPoolAdaptiveScaleUpPct   int           // Scale up threshold percentage
	DBPoolAdaptiveScaleDownPct int           // Scale down threshold percentage
	DBPoolAdaptiveEvalInterval time.Duration // Evaluation interval for adaptive sizing
	DBPoolAdaptiveStepSize     int           // Step size for scaling adjustments

	// Database Query Optimization (009-database-query-optimization)
	DBSlowQueryThresholdMS int      // Slow query logging threshold in milliseconds
	DBReplicaEnabled       bool     // Enable read replica routing
	DBReplicaDSNs          []string // Read replica connection strings

	// Redis
	RedisURL      string
	RedisPassword string
	RedisDB       int

	// JWT
	JWTPrivateKey         string
	JWTPublicKey          string
	JWTAccessTokenExpiry  time.Duration
	JWTRefreshTokenExpiry time.Duration

	// Security
	BcryptCost int

	// Rate Limiting
	RateLimitSignupMax     int
	RateLimitSignupWindow  time.Duration
	RateLimitLoginMax      int
	RateLimitLoginWindow   time.Duration
	RateLimitRefreshMax    int
	RateLimitRefreshWindow time.Duration
	TokenBlacklistTTL      time.Duration

	// CORS
	CORSAllowedOrigins []string
	CORSAllowedMethods []string
	CORSAllowedHeaders []string

	// Logging
	LogLevel  string
	LogFormat string

	// Security Headers
	SecurityHeadersEnabled bool
	HSTSMaxAge             int
	ContentSecurityPolicy  string

	// Multi-Tenant
	DefaultTenantID        string
	TenantIsolationEnabled bool

	// Gamification
	InitialUserLevel  int
	InitialUserXP     int
	InitialUserTier   string
	LoginStreakWindow time.Duration

	// Metrics
	MetricsEnabled bool
	MetricsPort    int

	// Sentry (Error Tracking & Performance Monitoring)
	SentryDSN              string
	SentryEnvironment      string
	SentryRelease          string
	SentryTracesSampleRate float64
	SentryDebug            bool

	// Development
	Debug           bool
	DBLogQueries    bool
	LogHTTPRequests bool

	// Video Streaming (T099)
	RTMPBaseURL      string // Base URL for RTMP ingest (e.g., "rtmp://stream.example.com")
	CDNBaseURL       string // CDN base URL for playback (e.g., "https://cdn.example.com")
	StreamOutputDir  string // Base directory for HLS output
	S3Bucket         string // S3 bucket name
	S3Region         string // S3 region
	S3AccessKey      string // S3 access key
	S3SecretKey      string // S3 secret key
	FFmpegPath       string // Path to FFmpeg binary
	LogHTTPResponses bool

	// Testing
	TestDatabaseURL string
	TestRedisURL    string

	// Payment Gateway Webhooks
	RazorpayWebhookSecret string
	StripeWebhookSecret   string

	// Firebase
	FirebaseCredentialsPath string

	// Feature Flags (T223)
	FeatureFlags *FeatureFlags

	// Payment Configuration (FR-012)
	Payment *PaymentConfig

	// KMS Configuration
	KMS *KMSConfig
}

// Load reads configuration from environment variables
func Load() (*Config, error) {
	// Load .env file if it exists (development)
	_ = godotenv.Load()

	cfg := &Config{
		// Server
		Port: getEnvAsInt("PORT", 8080),
		Host: getEnv("HOST", "0.0.0.0"),
		Env:  getEnv("ENV", "development"),

		// Database
		DatabaseURL:       getEnv("DATABASE_URL", ""),
		DBMaxOpenConns:    getEnvAsInt("DB_MAX_OPEN_CONNS", 25),
		DBMaxIdleConns:    getEnvAsInt("DB_MAX_IDLE_CONNS", 5),
		DBConnMaxLifetime: getEnvAsDuration("DB_CONN_MAX_LIFETIME", 5*time.Minute),
		DBConnMaxIdleTime: getEnvAsDuration("DB_CONN_MAX_IDLE_TIME", 5*time.Minute), // New in 010

		// Connection Pool Tuning (010-connection-pool-tuning)
		DBPoolWarmupEnabled:        getEnvAsBool("DB_POOL_WARMUP_ENABLED", false), // FR-003: Default false per spec
		DBPoolWarmupSize:           getEnvAsInt("DB_POOL_WARMUP_SIZE", 5),         // FR-003: Pre-warm connections
		DBPoolWarmupTimeout:        getEnvAsDuration("DB_POOL_WARMUP_TIMEOUT", 30*time.Second),
		DBPoolHealthCheckEnabled:   getEnvAsBool("DB_POOL_HEALTH_CHECK_ENABLED", true), // FR-004: Default true
		DBPoolHealthCheckInterval:  getEnvAsDuration("DB_POOL_HEALTH_CHECK_INTERVAL", 30*time.Second),
		DBPoolHealthCheckTimeout:   getEnvAsDuration("DB_POOL_HEALTH_CHECK_TIMEOUT", 5*time.Second),
		DBPoolAdaptiveEnabled:      getEnvAsBool("DB_POOL_ADAPTIVE_ENABLED", false), // FR-005: Default false
		DBPoolAdaptiveMinFloor:     getEnvAsInt("DB_POOL_MIN_FLOOR", 5),             // FR-005: Minimum connections
		DBPoolAdaptiveMaxCeiling:   getEnvAsInt("DB_POOL_MAX_CEILING", 50),          // FR-005: Maximum connections
		DBPoolAdaptiveScaleUpPct:   getEnvAsInt("DB_POOL_SCALE_UP_THRESHOLD", 80),   // FR-005: Scale up at 80%
		DBPoolAdaptiveScaleDownPct: getEnvAsInt("DB_POOL_SCALE_DOWN_THRESHOLD", 30), // FR-005: Scale down at 30%
		DBPoolAdaptiveEvalInterval: getEnvAsDuration("DB_POOL_ADAPTIVE_EVAL_INTERVAL", 1*time.Minute),
		DBPoolAdaptiveStepSize:     getEnvAsInt("DB_POOL_ADAPTIVE_STEP_SIZE", 2), // FR-005: Connections per step

		// Database Query Optimization (009-database-query-optimization T003/T004)
		DBSlowQueryThresholdMS: getEnvAsInt("SLOW_QUERY_THRESHOLD_MS", 100),  // Default 100ms per FR-006
		DBReplicaEnabled:       getEnvAsBool("DB_REPLICA_ENABLED", false),    // Default disabled
		DBReplicaDSNs:          getEnvAsSlice("DB_REPLICA_DSNS", []string{}), // Comma-separated DSNs

		// Redis
		RedisURL:      getEnv("REDIS_URL", "redis://localhost:6379/0"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       getEnvAsInt("REDIS_DB", 0),

		// JWT
		JWTPrivateKey:         getEnv("JWT_PRIVATE_KEY", ""),
		JWTPublicKey:          getEnv("JWT_PUBLIC_KEY", ""),
		JWTAccessTokenExpiry:  getEnvAsDuration("JWT_ACCESS_TOKEN_EXPIRY", 1*time.Hour),
		JWTRefreshTokenExpiry: getEnvAsDuration("JWT_REFRESH_TOKEN_EXPIRY", 720*time.Hour),

		// Security (non-negotiable per constitution)
		BcryptCost: getEnvAsInt("BCRYPT_COST", 12),

		// Rate Limiting
		RateLimitSignupMax:     getEnvAsInt("RATE_LIMIT_SIGNUP_MAX", 5),
		RateLimitSignupWindow:  getEnvAsDuration("RATE_LIMIT_SIGNUP_WINDOW", 1*time.Hour),
		RateLimitLoginMax:      getEnvAsInt("RATE_LIMIT_LOGIN_MAX", 10),
		RateLimitLoginWindow:   getEnvAsDuration("RATE_LIMIT_LOGIN_WINDOW", 15*time.Minute),
		RateLimitRefreshMax:    getEnvAsInt("RATE_LIMIT_REFRESH_MAX", 60),
		RateLimitRefreshWindow: getEnvAsDuration("RATE_LIMIT_REFRESH_WINDOW", 1*time.Hour),
		TokenBlacklistTTL:      getEnvAsDuration("TOKEN_BLACKLIST_TTL", 720*time.Hour),

		// CORS
		CORSAllowedOrigins: getEnvAsSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:19006"}),
		CORSAllowedMethods: getEnvAsSlice("CORS_ALLOWED_METHODS", []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
		CORSAllowedHeaders: getEnvAsSlice("CORS_ALLOWED_HEADERS", []string{"Content-Type", "Authorization"}),

		// Logging
		LogLevel:  getEnv("LOG_LEVEL", "info"),
		LogFormat: getEnv("LOG_FORMAT", "json"),

		// Security Headers
		SecurityHeadersEnabled: getEnvAsBool("SECURITY_HEADERS_ENABLED", true),
		HSTSMaxAge:             getEnvAsInt("HSTS_MAX_AGE", 31536000),
		ContentSecurityPolicy:  getEnv("CONTENT_SECURITY_POLICY", "default-src 'self'"),

		// Multi-Tenant
		DefaultTenantID:        getEnv("DEFAULT_TENANT_ID", "00000000-0000-0000-0000-000000000000"),
		TenantIsolationEnabled: getEnvAsBool("TENANT_ISOLATION_ENABLED", true),

		// Gamification
		InitialUserLevel:  getEnvAsInt("INITIAL_USER_LEVEL", 1),
		InitialUserXP:     getEnvAsInt("INITIAL_USER_XP", 0),
		InitialUserTier:   getEnv("INITIAL_USER_TIER", "BRONZE"),
		LoginStreakWindow: getEnvAsDuration("LOGIN_STREAK_WINDOW", 24*time.Hour),

		// Metrics
		MetricsEnabled: getEnvAsBool("METRICS_ENABLED", true),
		MetricsPort:    getEnvAsInt("METRICS_PORT", 9090),

		// Sentry
		SentryDSN:              getEnv("SENTRY_DSN", ""),
		SentryEnvironment:      getEnv("SENTRY_ENVIRONMENT", getEnv("ENV", "development")),
		SentryRelease:          getEnv("SENTRY_RELEASE", "quester@1.0.0"),
		SentryTracesSampleRate: getEnvAsFloat("SENTRY_TRACES_SAMPLE_RATE", 0.1), // 10% of transactions
		SentryDebug:            getEnvAsBool("SENTRY_DEBUG", false),

		// Development
		Debug:            getEnvAsBool("DEBUG", false),
		DBLogQueries:     getEnvAsBool("DB_LOG_QUERIES", false),
		LogHTTPRequests:  getEnvAsBool("LOG_HTTP_REQUESTS", true),
		LogHTTPResponses: getEnvAsBool("LOG_HTTP_RESPONSES", false),

		// Video Streaming (T099)
		RTMPBaseURL:     getEnv("RTMP_BASE_URL", "rtmp://localhost:1935"),
		CDNBaseURL:      getEnv("CDN_BASE_URL", "https://cdn.example.com"),
		StreamOutputDir: getEnv("STREAM_OUTPUT_DIR", "/tmp/streams"),
		S3Bucket:        getEnv("S3_BUCKET", ""),
		S3Region:        getEnv("S3_REGION", "us-east-1"),
		S3AccessKey:     getEnv("S3_ACCESS_KEY", ""),
		S3SecretKey:     getEnv("S3_SECRET_KEY", ""),
		FFmpegPath:      getEnv("FFMPEG_PATH", "ffmpeg"),

		// Testing
		TestDatabaseURL: getEnv("TEST_DATABASE_URL", ""),
		TestRedisURL:    getEnv("TEST_REDIS_URL", ""),

		// Payment Gateway Webhooks
		RazorpayWebhookSecret: getEnv("RAZORPAY_WEBHOOK_SECRET", ""),
		StripeWebhookSecret:   getEnv("STRIPE_WEBHOOK_SECRET", ""),

		// Firebase
		FirebaseCredentialsPath: getEnv("FIREBASE_CREDENTIALS_PATH", "firebase-credentials.json"),
	}

	// Load feature flags (T223)
	cfg.FeatureFlags = LoadFeatureFlags()

	// Load payment configuration (FR-012)
	cfg.Payment = LoadPaymentConfig(cfg.FeatureFlags.PaymentProvider)

	// Load KMS configuration (optional)
	kmsConfig, _ := LoadKMSConfig() // Ignore error - KMS is optional
	cfg.KMS = kmsConfig

	// Validate required fields
	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	// Validate payment configuration (fail-fast per FR-015)
	// Only validate if not in mock mode
	if !cfg.FeatureFlags.UseMocks {
		if err := cfg.Payment.Validate(); err != nil {
			return nil, fmt.Errorf("payment config validation failed: %w", err)
		}
	}

	return cfg, nil
}

// Validate checks if all required configuration is present
func (c *Config) Validate() error {
	if c.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}

	if c.JWTPrivateKey == "" {
		return fmt.Errorf("JWT_PRIVATE_KEY is required")
	}

	if c.JWTPublicKey == "" {
		return fmt.Errorf("JWT_PUBLIC_KEY is required")
	}

	if c.BcryptCost != 12 {
		return fmt.Errorf("BCRYPT_COST must be 12 (constitutional requirement)")
	}

	return nil
}

// Helper functions for environment variable parsing

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolVal, err := strconv.ParseBool(value); err == nil {
			return boolVal
		}
	}
	return defaultValue
}

func getEnvAsFloat(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if floatVal, err := strconv.ParseFloat(value, 64); err == nil {
			return floatVal
		}
	}
	return defaultValue
}

func getEnvAsDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

func getEnvAsSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		// Simple comma-separated parsing
		var result []string
		current := ""
		for _, char := range value {
			if char == ',' {
				if current != "" {
					result = append(result, current)
					current = ""
				}
			} else {
				current += string(char)
			}
		}
		if current != "" {
			result = append(result, current)
		}
		return result
	}
	return defaultValue
}

// LoadFeatureFlags loads feature flags from environment variables
func LoadFeatureFlags() *FeatureFlags {
	flags := &FeatureFlags{
		// FR-011: Mock injection toggle
		UseMocks: getEnvAsBool("USE_MOCKS", false),

		// FR-012: Payment provider selection (default: stripe)
		PaymentProvider: getEnv("PAYMENT_PROVIDER", "stripe"),

		KMSEncryptionEnabled: getEnvAsBool("FEATURE_KMS_ENCRYPTION_ENABLED", false),
		KMSEnabledTenants:    make(map[string]bool),
	}

	// Validate payment provider
	validProviders := map[string]bool{"stripe": true, "razorpay": true, "both": true}
	if !validProviders[strings.ToLower(flags.PaymentProvider)] {
		// Default to stripe if invalid
		flags.PaymentProvider = "stripe"
	}
	flags.PaymentProvider = strings.ToLower(flags.PaymentProvider)

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

// LoadPaymentConfig loads payment configuration from environment variables (FR-012)
func LoadPaymentConfig(provider string) *PaymentConfig {
	config := &PaymentConfig{
		Provider: provider,
	}

	// Load provider-specific credentials based on configured provider
	switch provider {
	case "stripe":
		config.StripeAPIKey = getEnv("STRIPE_API_KEY", "")
		config.StripeWebhookSecret = getEnv("STRIPE_WEBHOOK_SECRET", "")
	case "razorpay":
		config.RazorpayKeyID = getEnv("RAZORPAY_KEY_ID", "")
		config.RazorpayKeySecret = getEnv("RAZORPAY_KEY_SECRET", "")
		config.RazorpayWebhookSecret = getEnv("RAZORPAY_WEBHOOK_SECRET", "")
	case "both":
		// Load both providers for multi-gateway support
		config.StripeAPIKey = getEnv("STRIPE_API_KEY", "")
		config.StripeWebhookSecret = getEnv("STRIPE_WEBHOOK_SECRET", "")
		config.RazorpayKeyID = getEnv("RAZORPAY_KEY_ID", "")
		config.RazorpayKeySecret = getEnv("RAZORPAY_KEY_SECRET", "")
		config.RazorpayWebhookSecret = getEnv("RAZORPAY_WEBHOOK_SECRET", "")
	}

	return config
}

// LoadKMSConfig loads KMS configuration from environment variables
func LoadKMSConfig() (*KMSConfig, error) {
	provider := strings.ToLower(os.Getenv("KMS_PROVIDER"))
	if provider == "" {
		provider = "mock" // Default to mock for development
	}

	config := &KMSConfig{
		Provider:        provider,
		DEKCacheTTL:     getEnvAsInt("KMS_DEK_CACHE_TTL", 3600),
		DEKCacheEnable:  getEnvAsBool("KMS_DEK_CACHE_ENABLE", true),
		DEKRotationDays: getEnvAsInt("KMS_DEK_ROTATION_DAYS", 90),
		AuditLogEnable:  getEnvAsBool("KMS_AUDIT_LOG_ENABLE", true),
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

// Validate checks that all required dependencies are provided for TransactionServiceConfig
func (c *TransactionServiceConfig) Validate() error {
	if c.TransactionRepo == nil {
		return fmt.Errorf("TransactionRepo is required")
	}
	if c.UserRepo == nil {
		return fmt.Errorf("UserRepo is required")
	}
	if c.PaymentManager == nil {
		return fmt.Errorf("PaymentManager is required")
	}
	if c.MarketplaceRepo == nil {
		return fmt.Errorf("MarketplaceRepo is required")
	}
	return nil
}

// Validate checks that all required dependencies are provided for SocialServiceConfig
func (c *SocialServiceConfig) Validate() error {
	if c.LikeRepo == nil {
		return fmt.Errorf("LikeRepo is required")
	}
	if c.CommentRepo == nil {
		return fmt.Errorf("CommentRepo is required")
	}
	if c.PostRepo == nil {
		return fmt.Errorf("PostRepo is required")
	}
	if c.ActivityRepo == nil {
		return fmt.Errorf("ActivityRepo is required")
	}
	if c.UserRepo == nil {
		return fmt.Errorf("UserRepo is required")
	}
	if c.FollowRepo == nil {
		return fmt.Errorf("FollowRepo is required")
	}
	return nil
}

// Validate checks that all required dependencies are provided for MarketplaceServiceConfig
func (c *MarketplaceServiceConfig) Validate() error {
	if c.MarketplaceRepo == nil {
		return fmt.Errorf("MarketplaceRepo is required")
	}
	if c.UserRepo == nil {
		return fmt.Errorf("UserRepo is required")
	}
	if c.CourseRepo == nil {
		return fmt.Errorf("CourseRepo is required")
	}
	if c.BadgeRepo == nil {
		return fmt.Errorf("BadgeRepo is required")
	}
	return nil
}

// Validate checks that all required dependencies are provided for TwoFactorServiceConfig
func (c *TwoFactorServiceConfig) Validate() error {
	if c.TwoFactorRepo == nil {
		return fmt.Errorf("TwoFactorRepo is required")
	}
	if c.BackupCodeRepo == nil {
		return fmt.Errorf("BackupCodeRepo is required")
	}
	if c.TrustedDeviceRepo == nil {
		return fmt.Errorf("TrustedDeviceRepo is required")
	}
	if c.TwoFALogRepo == nil {
		return fmt.Errorf("TwoFALogRepo is required")
	}
	if c.UserRepo == nil {
		return fmt.Errorf("UserRepo is required")
	}
	if c.KMSService == nil {
		return fmt.Errorf("KMSService is required")
	}
	return nil
}
