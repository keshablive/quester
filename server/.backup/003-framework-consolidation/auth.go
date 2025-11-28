// JWT authentication middleware
package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/auth"
	"github.com/keshablive/quester/internal/framework/cache"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/services"
)

// Context keys for storing authenticated user data
type contextKey string

const (
	UserIDKey   contextKey = "user_id"
	TenantIDKey contextKey = "tenant_id"
	RoleKey     contextKey = "role"
)

// ErrorResponse represents a standard error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

// AuthMiddleware validates JWT tokens and extracts user claims into context
// Returns 401 Unauthorized if token is missing, invalid, or expired
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			respondWithError(w, http.StatusUnauthorized, "missing authorization header", "")
			return
		}

		// Validate Bearer format
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			respondWithError(w, http.StatusUnauthorized, "invalid authorization format", "expected 'Bearer <token>'")
			return
		}

		tokenString := parts[1]

		// T110: Check if token is blacklisted (FR-001 integration)
		blacklistService := services.NewBlacklistService(cache.Client)
		tokenHash := hashToken(tokenString)
		if blacklistService.IsBlacklisted(tokenHash) {
			respondWithError(w, http.StatusUnauthorized, "token has been revoked", "this token was invalidated during logout")
			return
		}

		// Validate token and extract claims
		claims, err := auth.ValidateToken(tokenString)
		if err != nil {
			respondWithError(w, http.StatusUnauthorized, "invalid or expired token", err.Error())
			return
		}

		// Parse user ID from claims
		userID, err := auth.ParseUserID(claims)
		if err != nil {
			respondWithError(w, http.StatusUnauthorized, "invalid user ID in token", err.Error())
			return
		}

		// Parse tenant ID from claims
		tenantID, err := auth.ParseTenantID(claims)
		if err != nil {
			respondWithError(w, http.StatusUnauthorized, "invalid tenant ID in token", err.Error())
			return
		}

		// Parse role from claims
		role := models.Role(claims.Role)
		if !role.IsValid() {
			respondWithError(w, http.StatusUnauthorized, "invalid role in token", "")
			return
		}

		// Store claims in context
		ctx := r.Context()
		ctx = context.WithValue(ctx, UserIDKey, userID)
		ctx = context.WithValue(ctx, TenantIDKey, tenantID)
		ctx = context.WithValue(ctx, RoleKey, role)

		// Pass request with enriched context to next handler
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// respondWithError sends a JSON error response
func respondWithError(w http.ResponseWriter, statusCode int, error string, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(ErrorResponse{
		Error:   error,
		Message: message,
	})
}

// GetUserIDFromContext extracts the user ID from request context
func GetUserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	userID, ok := ctx.Value(UserIDKey).(uuid.UUID)
	return userID, ok
}

// GetTenantIDFromContext extracts the tenant ID from request context
func GetTenantIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	tenantID, ok := ctx.Value(TenantIDKey).(uuid.UUID)
	return tenantID, ok
}

// GetRoleFromContext extracts the role from request context
func GetRoleFromContext(ctx context.Context) (models.Role, bool) {
	role, ok := ctx.Value(RoleKey).(models.Role)
	return role, ok
}

// RoleMiddleware enforces role-based access control
// Requires AuthMiddleware to be called first (to populate context)
// ADMIN role bypasses all role checks
func RoleMiddleware(requiredRole models.Role) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract role from context (set by AuthMiddleware)
			role, ok := GetRoleFromContext(r.Context())
			if !ok {
				respondWithError(w, http.StatusUnauthorized, "unauthorized", "role not found in context - ensure AuthMiddleware is applied")
				return
			}

			// ADMIN bypasses all role checks (per spec FR-019)
			if role == models.RoleAdmin {
				next.ServeHTTP(w, r)
				return
			}

			// Check if role matches required role
			if role != requiredRole {
				respondWithError(w, http.StatusForbidden, "forbidden", "insufficient permissions - requires "+string(requiredRole)+" role")
				return
			}

			// Role matches - allow access
			next.ServeHTTP(w, r)
		})
	}
}

// hashToken creates a SHA256 hash of the token for blacklist storage
// T110: Helper function for blacklist integration
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}
