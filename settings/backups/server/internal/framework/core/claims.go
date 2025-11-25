// JWT Claims type alias for backward compatibility
package core

import (
	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/services"
)

// Claims is an alias to services.CustomClaims for backward compatibility
// This allows controllers to use core.Claims while the actual implementation
// remains in the services package where JWT logic resides
type Claims = services.CustomClaims

// Helper methods for Claims

// GetUserID returns the user ID as UUID from the Subject claim
func GetUserID(claims *Claims) (uuid.UUID, error) {
	return uuid.Parse(claims.Subject)
}

// GetUserIDUint returns the user ID as uint (legacy support)
// Note: This is deprecated, use GetUserID for UUID support
func GetUserIDUint(claims *Claims) (uint, error) {
	// This is a compatibility shim - not recommended for new code
	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return 0, err
	}
	// Warning: This loses information! Only for legacy code
	return uint(userID.ID()), nil
}

// GetTenantIDUUID returns the tenant ID as UUID
func GetTenantIDUUID(claims *Claims) (uuid.UUID, error) {
	return uuid.Parse(claims.TenantID)
}

// GetTenantIDUint returns the tenant ID as uint (legacy support)
func GetTenantIDUint(claims *Claims) (uint, error) {
	tenantID, err := uuid.Parse(claims.TenantID)
	if err != nil {
		return 0, err
	}
	return uint(tenantID.ID()), nil
}
