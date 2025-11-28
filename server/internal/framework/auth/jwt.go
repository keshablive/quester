// JWT token generation and validation service
package auth

import (
	"crypto/rsa"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const (
	// AccessTokenExpiry is the duration for access tokens (1 hour)
	AccessTokenExpiry = 1 * time.Hour

	// RefreshTokenExpiry is the duration for refresh tokens (30 days)
	RefreshTokenExpiry = 30 * 24 * time.Hour
)

var (
	// privateKey is the RSA private key for signing JWTs
	privateKey *rsa.PrivateKey

	// publicKey is the RSA public key for verifying JWTs
	publicKey *rsa.PublicKey
)

// CustomClaims extends JWT standard claims with custom fields
type CustomClaims struct {
	TenantID string `json:"tid"`  // Tenant ID for multi-tenancy
	Role     string `json:"role"` // User role (ADMIN, MANAGER, PLAYER, GUEST)
	jwt.RegisteredClaims
}

// ClaimsProvider is implemented by types that can provide JWT claims data.
// This interface allows the framework to work with any type that can provide
// the necessary claim information, breaking the dependency on concrete models.
type ClaimsProvider interface {
	// GetID returns the unique identifier for the claims subject (e.g., user ID)
	GetID() uuid.UUID

	// GetTenantID returns the tenant identifier for multi-tenancy support
	GetTenantID() uuid.UUID

	// GetRole returns the role/permission level as a string
	GetRole() string
}

// init loads RSA keys from .keys directory
func init() {
	var err error

	// Determine the correct path to keys directory
	// Look for the keys in multiple possible locations
	possiblePaths := []string{
		".keys/private.pem",          // Running from server/ directory
		"server/.keys/private.pem",   // Running from project root
		"../../.keys/private.pem",    // Running from tests/unit/services
		"../../../.keys/private.pem", // Alternative test path
	}

	var privateKeyPath, publicKeyPath string

	// Find private key
	for _, path := range possiblePaths {
		if _, err := os.Stat(path); err == nil {
			privateKeyPath = path
			// Public key is in same directory
			publicKeyPath = path[:len(path)-11] + "public.pem"
			break
		}
	}

	if privateKeyPath == "" {
		panic("failed to locate private.pem - tried paths: .keys/private.pem, server/.keys/private.pem, ../../.keys/private.pem")
	}

	// Load private key for signing
	privateKeyBytes, err := os.ReadFile(privateKeyPath)
	if err != nil {
		panic(fmt.Sprintf("failed to read private key from %s: %v", privateKeyPath, err))
	}

	privateKey, err = jwt.ParseRSAPrivateKeyFromPEM(privateKeyBytes)
	if err != nil {
		panic(fmt.Sprintf("failed to parse private key: %v", err))
	}

	// Load public key for verification
	publicKeyBytes, err := os.ReadFile(publicKeyPath)
	if err != nil {
		panic(fmt.Sprintf("failed to read public key from %s: %v", publicKeyPath, err))
	}

	publicKey, err = jwt.ParseRSAPublicKeyFromPEM(publicKeyBytes)
	if err != nil {
		panic(fmt.Sprintf("failed to parse public key: %v", err))
	}
}

// GenerateAccessToken creates a short-lived JWT access token (1 hour)
// Token is signed with RS256 using the private key
// Accepts any type implementing ClaimsProvider interface (e.g., models.User)
func GenerateAccessToken(provider ClaimsProvider) (string, error) {
	if provider == nil {
		return "", fmt.Errorf("claims provider cannot be nil")
	}

	now := time.Now()
	claims := CustomClaims{
		TenantID: provider.GetTenantID().String(),
		Role:     provider.GetRole(),
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   provider.GetID().String(),
			ExpiresAt: jwt.NewNumericDate(now.Add(AccessTokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	signedToken, err := token.SignedString(privateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign access token: %w", err)
	}

	return signedToken, nil
}

// GenerateRefreshToken creates a long-lived JWT refresh token (30 days)
// Token is signed with RS256 using the private key
// Accepts any type implementing ClaimsProvider interface (e.g., models.User)
func GenerateRefreshToken(provider ClaimsProvider) (string, error) {
	if provider == nil {
		return "", fmt.Errorf("claims provider cannot be nil")
	}

	now := time.Now()
	claims := CustomClaims{
		TenantID: provider.GetTenantID().String(),
		Role:     provider.GetRole(),
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   provider.GetID().String(),
			ExpiresAt: jwt.NewNumericDate(now.Add(RefreshTokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	signedToken, err := token.SignedString(privateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign refresh token: %w", err)
	}

	return signedToken, nil
}

// ValidateToken verifies the JWT signature and returns the claims
// Returns error if token is invalid, expired, or signature verification fails
func ValidateToken(tokenString string) (*CustomClaims, error) {
	if tokenString == "" {
		return nil, fmt.Errorf("token cannot be empty")
	}

	// Parse and validate token
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method is RS256
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return publicKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	// Extract and validate claims
	claims, ok := token.Claims.(*CustomClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}

// ExtractClaims extracts claims from a JWT token without validating the signature
// Useful for reading token data before full validation
func ExtractClaims(tokenString string) (*CustomClaims, error) {
	if tokenString == "" {
		return nil, fmt.Errorf("token cannot be empty")
	}

	// Parse token without validation
	parser := jwt.NewParser()
	token, _, err := parser.ParseUnverified(tokenString, &CustomClaims{})
	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}

// ParseUserID extracts and parses the user ID from token claims
func ParseUserID(claims *CustomClaims) (uuid.UUID, error) {
	if claims == nil {
		return uuid.Nil, fmt.Errorf("claims cannot be nil")
	}

	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid user ID in token: %w", err)
	}

	return userID, nil
}

// ParseTenantID extracts and parses the tenant ID from token claims
func ParseTenantID(claims *CustomClaims) (uuid.UUID, error) {
	if claims == nil {
		return uuid.Nil, fmt.Errorf("claims cannot be nil")
	}

	tenantID, err := uuid.Parse(claims.TenantID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid tenant ID in token: %w", err)
	}

	return tenantID, nil
}
