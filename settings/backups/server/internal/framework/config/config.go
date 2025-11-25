// Environment-based config loading
package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
	internalconfig "github.com/yourusername/quester/internal/config" // T223: For FeatureFlags
)

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

	// Feature Flags (T223)
	FeatureFlags *internalconfig.FeatureFlags
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
	}

	// Load feature flags (T223)
	cfg.FeatureFlags = internalconfig.LoadFeatureFlags()

	// Validate required fields
	if err := cfg.Validate(); err != nil {
		return nil, err
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
