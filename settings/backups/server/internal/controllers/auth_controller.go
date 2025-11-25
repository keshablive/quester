package controllers

import (
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/framework/cache"
	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/services"
)

// SignupRequest represents the incoming signup request
type SignupRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Username string `json:"username" validate:"required,min=3,max=30"`
	Password string `json:"password" validate:"required,min=8"`
}

// SignupResponse represents the signup response
type SignupResponse struct {
	AccessToken  string     `json:"access_token"`
	RefreshToken string     `json:"refresh_token"`
	User         UserPublic `json:"user"`
}

// UserPublic represents the public user data (no sensitive fields)
type UserPublic struct {
	ID          string    `json:"id"`
	TenantID    string    `json:"tenant_id"`
	Email       string    `json:"email"`
	Username    string    `json:"username"`
	Role        string    `json:"role"`
	XP          int       `json:"xp"`
	Level       int       `json:"level"`
	Tier        string    `json:"tier"`
	LoginStreak int       `json:"login_streak"`
	CreatedAt   time.Time `json:"created_at"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
	Code    int    `json:"code"`
}

// Signup handles POST /api/v1/auth/signup
// Rate limit: 5 requests per hour per IP
func Signup(c *fiber.Ctx) error {
	// Extract tenant ID from header
	tenantIDStr := c.Get("X-Tenant-ID")
	if tenantIDStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "missing_tenant_id",
			Message: "X-Tenant-ID header is required",
			Code:    fiber.StatusBadRequest,
		})
	}

	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_tenant_id",
			Message: "X-Tenant-ID must be a valid UUID",
			Code:    fiber.StatusBadRequest,
		})
	}

	// Rate limiting: 5 requests per hour per IP
	clientIP := c.IP()
	rateLimitKey := fmt.Sprintf("signup:ratelimit:%s", clientIP)

	if cache.Client != nil {
		// Check current request count
		currentCount, err := cache.Increment(c.Context(), rateLimitKey)
		if err == nil {
			// Set expiry on first request
			if currentCount == 1 {
				cache.Client.Expire(c.Context(), rateLimitKey, 1*time.Hour)
			}

			// Reject if over limit
			if currentCount > 5 {
				return c.Status(fiber.StatusTooManyRequests).JSON(ErrorResponse{
					Error:   "rate_limit_exceeded",
					Message: "Maximum 5 signup attempts per hour. Please try again later.",
					Code:    fiber.StatusTooManyRequests,
				})
			}
		}
		// Continue even if rate limit check fails (fail open)
	}

	// Parse request body
	var req SignupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Invalid JSON request body",
			Code:    fiber.StatusBadRequest,
		})
	}

	// Call signup service
	signupReq := &services.SignupRequest{
		Email:    req.Email,
		Username: req.Username,
		Password: req.Password,
	}

	signupResp, err := services.Signup(c.Context(), tenantID, signupReq)
	if err != nil {
		// Check error type for appropriate status code
		errMsg := err.Error()

		// Duplicate email (409 Conflict)
		if strings.Contains(errMsg, "already exists") {
			return c.Status(fiber.StatusConflict).JSON(ErrorResponse{
				Error:   "email_exists",
				Message: "User with this email already exists",
				Code:    fiber.StatusConflict,
			})
		}

		// Validation errors (400 Bad Request)
		if strings.Contains(errMsg, "invalid email") ||
			strings.Contains(errMsg, "invalid username") ||
			strings.Contains(errMsg, "invalid password") {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "validation_error",
				Message: errMsg,
				Code:    fiber.StatusBadRequest,
			})
		}

		// Internal server error (500)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create user account",
			Code:    fiber.StatusInternalServerError,
		})
	}

	// Build public user response (exclude sensitive fields)
	userPublic := UserPublic{
		ID:          signupResp.User.ID.String(),
		TenantID:    signupResp.User.TenantID.String(),
		Email:       signupResp.User.Email,
		Username:    signupResp.User.Username,
		Role:        string(signupResp.User.Role),
		XP:          signupResp.User.XP,
		Level:       signupResp.User.Level,
		Tier:        string(signupResp.User.Tier),
		LoginStreak: signupResp.User.LoginStreak,
		CreatedAt:   signupResp.User.CreatedAt,
	}

	// Return successful response
	return c.Status(fiber.StatusCreated).JSON(SignupResponse{
		AccessToken:  signupResp.AccessToken,
		RefreshToken: signupResp.RefreshToken,
		User:         userPublic,
	})
}

// LoginRequest represents the incoming login request
type LoginRequest struct {
	Email             string `json:"email" validate:"required,email"`
	Password          string `json:"password" validate:"required"`
	TwoFactorCode     string `json:"two_factor_code,omitempty"`    // Optional 2FA code
	TrustDevice       bool   `json:"trust_device,omitempty"`       // Whether to trust this device
	DeviceFingerprint string `json:"device_fingerprint,omitempty"` // Device identifier
	DeviceName        string `json:"device_name,omitempty"`        // User-friendly device name
	DeviceType        string `json:"device_type,omitempty"`        // Device type: 'mobile', 'desktop', 'tablet', 'web'
}

// LoginResponse represents the login response
type LoginResponse struct {
	AccessToken  string     `json:"access_token,omitempty"`
	RefreshToken string     `json:"refresh_token,omitempty"`
	User         UserPublic `json:"user,omitempty"`
	Requires2FA  bool       `json:"requires_2fa,omitempty"` // Indicates 2FA is required
	TrustToken   string     `json:"trust_token,omitempty"`  // Token for trusted device
}

// Login handles POST /api/v1/auth/login
// Rate limit: 10 requests per hour per IP
func Login(c *fiber.Ctx) error {
	// Extract tenant ID from header
	tenantIDStr := c.Get("X-Tenant-ID")
	if tenantIDStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "missing_tenant_id",
			Message: "X-Tenant-ID header is required",
			Code:    fiber.StatusBadRequest,
		})
	}

	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_tenant_id",
			Message: "X-Tenant-ID must be a valid UUID",
			Code:    fiber.StatusBadRequest,
		})
	}

	// Rate limiting: 10 requests per hour per IP
	clientIP := c.IP()
	rateLimitKey := fmt.Sprintf("login:ratelimit:%s", clientIP)

	if cache.Client != nil {
		// Check current request count
		currentCount, err := cache.Increment(c.Context(), rateLimitKey)
		if err == nil {
			// Set expiry on first request
			if currentCount == 1 {
				cache.Client.Expire(c.Context(), rateLimitKey, 1*time.Hour)
			}

			// Reject if over limit
			if currentCount > 10 {
				return c.Status(fiber.StatusTooManyRequests).JSON(ErrorResponse{
					Error:   "rate_limit_exceeded",
					Message: "Maximum 10 login attempts per hour. Please try again later.",
					Code:    fiber.StatusTooManyRequests,
				})
			}
		}
		// Continue even if rate limit check fails (fail open)
	}

	// Parse request body
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Invalid JSON request body",
			Code:    fiber.StatusBadRequest,
		})
	}

	// Validate email format (basic check)
	if !strings.Contains(req.Email, "@") {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "validation_error",
			Message: "Invalid email format",
			Code:    fiber.StatusBadRequest,
		})
	}

	// Call login service
	loginResp, err := services.Login(c.Context(), tenantID, req.Email, req.Password)
	if err != nil {
		// Check error type for appropriate status code
		errMsg := err.Error()

		// Invalid credentials (401 Unauthorized)
		if strings.Contains(errMsg, "invalid credentials") {
			return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
				Error:   "invalid_credentials",
				Message: "Invalid email or password",
				Code:    fiber.StatusUnauthorized,
			})
		}

		// Validation errors (400 Bad Request)
		if strings.Contains(errMsg, "email is required") ||
			strings.Contains(errMsg, "password is required") {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "validation_error",
				Message: errMsg,
				Code:    fiber.StatusBadRequest,
			})
		}

		// Internal server error (500)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to process login request",
			Code:    fiber.StatusInternalServerError,
		})
	}

	// Check if 2FA is enabled for this user
	twoFactorService := services.NewTwoFactorService(nil) // Pass nil config for default behavior
	is2FAEnabled, err := twoFactorService.IsEnabled(loginResp.User.ID)
	if err != nil {
		// Log error but don't fail login if 2FA check fails
		fmt.Printf("Error checking 2FA status: %v\n", err)
	}

	// If 2FA is enabled, check device trust first
	if is2FAEnabled {
		deviceFingerprint := req.DeviceFingerprint
		if deviceFingerprint == "" {
			// Fallback to X-Device-Fingerprint header
			deviceFingerprint = c.Get("X-Device-Fingerprint")
		}

		// Check if device is trusted
		isTrusted := false
		trustToken := c.Get("X-Trust-Token")
		if trustToken != "" && deviceFingerprint != "" {
			isTrusted, err = twoFactorService.ValidateTrustToken(loginResp.User.ID, trustToken)
			if err != nil {
				// Log but continue - treat as untrusted device
				fmt.Printf("Error validating trust token: %v\n", err)
			}
		}

		// If device is not trusted, require 2FA
		if !isTrusted {
			// Check if 2FA code was provided
			if req.TwoFactorCode == "" {
				// Return response indicating 2FA is required
				return c.Status(fiber.StatusOK).JSON(LoginResponse{
					Requires2FA: true,
				})
			}

			// Validate the 2FA code
			isValid, err := twoFactorService.ValidateCode(loginResp.User.ID, req.TwoFactorCode)
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
					Error:   "internal_error",
					Message: "Failed to validate 2FA code",
					Code:    fiber.StatusInternalServerError,
				})
			}

			if !isValid {
				// Log failed 2FA attempt
				clientIP := c.IP()
				userAgent := c.Get("User-Agent")
				eventData := map[string]interface{}{
					"reason":      "invalid_code_during_login",
					"code_length": len(req.TwoFactorCode),
				}
				twoFactorService.LogAuditEvent(
					loginResp.User.ID,
					models.Event2FAVerificationFailed,
					eventData,
					clientIP,
					userAgent,
				)

				return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
					Error:   "invalid_2fa_code",
					Message: "Invalid two-factor authentication code",
					Code:    fiber.StatusUnauthorized,
				})
			}

			// Log successful 2FA verification
			// TODO: Re-enable audit logging when two_factor_controller is fixed
			/*
				clientIP := c.IP()
				userAgent := c.Get("User-Agent")
				eventData := map[string]interface{}{
					"method":    "login",
					"code_type": getCodeType(req.TwoFactorCode),
				}
				twoFactorService.LogAuditEvent(
					loginResp.User.ID,
					models.Event2FAVerificationSuccess,
					eventData,
					clientIP,
					userAgent,
				)
			*/

			// If user wants to trust this device, create trust token
			var newTrustToken string
			if req.TrustDevice && deviceFingerprint != "" {
				deviceName := req.DeviceName
				if deviceName == "" {
					deviceName = "Unknown Device"
				}
				deviceType := req.DeviceType
				if deviceType == "" {
					deviceType = "web"
				}

				newTrustToken, err = twoFactorService.TrustDevice(
					loginResp.User.ID,
					deviceFingerprint,
					deviceName,
					deviceType,
				)
				if err != nil {
					// Log error but don't fail login
					fmt.Printf("Error creating device trust: %v\n", err)
				}
			}

			// Build public user response
			userPublic := UserPublic{
				ID:          loginResp.User.ID.String(),
				TenantID:    loginResp.User.TenantID.String(),
				Email:       loginResp.User.Email,
				Username:    loginResp.User.Username,
				Role:        string(loginResp.User.Role),
				XP:          loginResp.User.XP,
				Level:       loginResp.User.Level,
				Tier:        string(loginResp.User.Tier),
				LoginStreak: loginResp.User.LoginStreak,
				CreatedAt:   loginResp.User.CreatedAt,
			}

			// Return successful response with trust token if created
			return c.Status(fiber.StatusOK).JSON(LoginResponse{
				AccessToken:  loginResp.AccessToken,
				RefreshToken: loginResp.RefreshToken,
				User:         userPublic,
				TrustToken:   newTrustToken,
			})
		}
	}

	// 2FA is disabled or device is trusted - proceed with normal login
	// Build public user response (exclude sensitive fields)
	userPublic := UserPublic{
		ID:          loginResp.User.ID.String(),
		TenantID:    loginResp.User.TenantID.String(),
		Email:       loginResp.User.Email,
		Username:    loginResp.User.Username,
		Role:        string(loginResp.User.Role),
		XP:          loginResp.User.XP,
		Level:       loginResp.User.Level,
		Tier:        string(loginResp.User.Tier),
		LoginStreak: loginResp.User.LoginStreak,
		CreatedAt:   loginResp.User.CreatedAt,
	}

	// Return successful response
	return c.Status(fiber.StatusOK).JSON(LoginResponse{
		AccessToken:  loginResp.AccessToken,
		RefreshToken: loginResp.RefreshToken,
		User:         userPublic,
	})
}

// RefreshTokenRequest represents the incoming refresh token request
type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" validate:"required"`
}

// RefreshTokenResponse represents the refresh token response
type RefreshTokenResponse struct {
	AccessToken string     `json:"accessToken"`
	User        UserPublic `json:"user"`
}

// RefreshToken handles POST /api/v1/auth/refresh
// No authentication required - the refresh token itself is the authentication
func RefreshToken(c *fiber.Ctx) error {
	// Parse request body
	var req RefreshTokenRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status": "error",
			"error":  "Invalid request body",
		})
	}

	// Validate refresh token is provided
	if req.RefreshToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status": "error",
			"error":  "Refresh token is required",
		})
	}

	// Call refresh token service
	refreshResp, err := services.RefreshAccessToken(c.Context(), req.RefreshToken)
	if err != nil {
		// Check error type for appropriate status code
		errMsg := err.Error()

		// Token not found, expired, revoked, or user not found (401 Unauthorized)
		if strings.Contains(errMsg, "not found") ||
			strings.Contains(errMsg, "expired") ||
			strings.Contains(errMsg, "revoked") ||
			strings.Contains(errMsg, "user") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status": "error",
				"error":  errMsg,
			})
		}

		// Validation errors (400 Bad Request)
		if strings.Contains(errMsg, "token is required") ||
			strings.Contains(errMsg, "token required") {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status": "error",
				"error":  errMsg,
			})
		}

		// Internal server error (500)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status": "error",
			"error":  "Failed to refresh token",
		})
	}

	// Build public user response (exclude sensitive fields)
	userPublic := UserPublic{
		ID:          refreshResp.User.ID.String(),
		TenantID:    refreshResp.User.TenantID.String(),
		Email:       refreshResp.User.Email,
		Username:    refreshResp.User.Username,
		Role:        string(refreshResp.User.Role),
		XP:          refreshResp.User.XP,
		Level:       refreshResp.User.Level,
		Tier:        string(refreshResp.User.Tier),
		LoginStreak: refreshResp.User.LoginStreak,
		CreatedAt:   refreshResp.User.CreatedAt,
	}

	// Return successful response with new access token
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status": "success",
		"data": RefreshTokenResponse{
			AccessToken: refreshResp.AccessToken,
			User:        userPublic,
		},
	})
}

// LogoutRequest represents the incoming logout request
type LogoutRequest struct {
	RefreshToken string `json:"refreshToken" validate:"required"`
}

// Logout handles POST /api/v1/auth/logout
// Requires authentication (JWT in Authorization header)
// Revokes a single refresh token
func Logout(c *fiber.Ctx) error {
	// TODO: Extract user ID from JWT when auth middleware is implemented
	// For now, we'll just revoke the token provided in the request

	// Parse request body
	var req LogoutRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status": "error",
			"error":  "Invalid request body",
		})
	}

	// Validate refresh token is provided
	if req.RefreshToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status": "error",
			"error":  "Refresh token is required",
		})
	}

	// Call logout service
	err := services.Logout(c.Context(), req.RefreshToken)
	if err != nil {
		// Check error type for appropriate status code
		errMsg := err.Error()

		// Token not found (404 Not Found) - but we'll return 200 for security (don't reveal token existence)
		if strings.Contains(errMsg, "not found") {
			// Return success even if token doesn't exist (security best practice)
			return c.Status(fiber.StatusOK).JSON(fiber.Map{
				"status":  "success",
				"message": "Logged out successfully",
			})
		}

		// Validation errors (400 Bad Request)
		if strings.Contains(errMsg, "required") {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status": "error",
				"error":  errMsg,
			})
		}

		// Internal server error (500)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status": "error",
			"error":  "Failed to logout",
		})
	}

	// Return success response
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":  "success",
		"message": "Logged out successfully",
	})
}

// LogoutAll handles POST /api/v1/auth/logout-all
// Requires authentication (JWT in Authorization header)
// Revokes all refresh tokens for the authenticated user
func LogoutAll(c *fiber.Ctx) error {
	// Extract user ID from JWT claims
	// TODO: This will be set by auth middleware when implemented
	// For now, we'll expect it in the request body for testing

	var requestBody map[string]string
	if err := c.BodyParser(&requestBody); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status": "error",
			"error":  "Invalid request body",
		})
	}

	// Get user ID from request (will come from JWT middleware later)
	userIDStr := requestBody["userId"]
	if userIDStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status": "error",
			"error":  "User ID is required",
		})
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status": "error",
			"error":  "Invalid user ID format",
		})
	}

	// Call logout all service
	count, err := services.LogoutAll(c.Context(), userID)
	if err != nil {
		// Check error type for appropriate status code
		errMsg := err.Error()

		// Validation errors (400 Bad Request)
		if strings.Contains(errMsg, "required") {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status": "error",
				"error":  errMsg,
			})
		}

		// Internal server error (500)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status": "error",
			"error":  "Failed to logout from all devices",
		})
	}

	// Return success response with count
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":  "success",
		"message": fmt.Sprintf("Logged out from %d device(s)", count),
		"count":   count,
	})
}
