// Two-Factor Authentication controller
package controllers

import (
	"context"
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/auth"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/repository"
	"github.com/keshablive/quester/internal/framework/service"
)

// TwoFactorController handles 2FA-related HTTP requests
type TwoFactorController struct {
	service         *service.TwoFactorService
	passwordService *auth.PasswordService
	userRepo        *repository.UserRepository
}

// NewTwoFactorController creates a new two-factor controller
// T106: Now accepts UserRepository to eliminate global database access
func NewTwoFactorController(service *service.TwoFactorService, userRepo *repository.UserRepository) *TwoFactorController {
	return &TwoFactorController{
		service:         service,
		passwordService: auth.NewPasswordService(),
		userRepo:        userRepo,
	}
}

// Enable2FA handles POST /api/v1/auth/2fa/enable
func (ctrl *TwoFactorController) Enable2FA(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User ID not found in context",
		})
	}

	email, ok := c.Locals("email").(string)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "User email not found in context",
		})
	}

	response, err := ctrl.service.Enable(userID, email)
	if err != nil {
		if errors.Is(err, service.ErrTwoFactorAlreadyEnabled) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "Two-factor authentication is already enabled",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to enable two-factor authentication",
		})
	}

	ctrl.service.LogAuditEvent(userID, models.Event2FAEnabled,
		map[string]interface{}{"method": "totp"}, c.IP(), c.Get("User-Agent"))

	return c.JSON(fiber.Map{"success": true, "data": response})
}

// Verify2FA handles POST /api/v1/auth/2fa/verify
func (ctrl *TwoFactorController) Verify2FA(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User ID not found in context",
		})
	}

	var req struct {
		Code string `json:"code" validate:"required,len=6"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := ctrl.service.Verify(userID, req.Code); err != nil {
		if errors.Is(err, service.ErrInvalidTwoFactorCode) {
			ctrl.service.LogAuditEvent(userID, models.Event2FAVerificationFailed,
				map[string]interface{}{"reason": "invalid_code"}, c.IP(), c.Get("User-Agent"))
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid verification code",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to verify code",
		})
	}

	ctrl.service.LogAuditEvent(userID, models.Event2FAVerificationSuccess,
		map[string]interface{}{"setup": true}, c.IP(), c.Get("User-Agent"))

	return c.JSON(fiber.Map{"success": true, "message": "Two-factor authentication enabled successfully"})
}

// Disable2FA handles POST /api/v1/auth/2fa/disable
func (ctrl *TwoFactorController) Disable2FA(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User ID not found in context",
		})
	}

	var req struct {
		Password string `json:"password" validate:"required"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	user, err := ctrl.userRepo.FindByID(context.Background(), userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	if !ctrl.passwordService.VerifyPassword(req.Password, user.PasswordHash) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid password",
		})
	}

	if err := ctrl.service.Disable(userID); err != nil {
		if errors.Is(err, service.ErrTwoFactorNotEnabled) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Two-factor authentication is not enabled",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to disable two-factor authentication",
		})
	}

	ctrl.service.LogAuditEvent(userID, models.Event2FADisabled,
		map[string]interface{}{"method": "password"}, c.IP(), c.Get("User-Agent"))

	return c.JSON(fiber.Map{"success": true, "message": "Two-factor authentication disabled successfully"})
}

// Validate2FACode handles POST /api/v1/auth/2fa/validate
func (ctrl *TwoFactorController) Validate2FACode(c *fiber.Ctx) error {
	var req struct {
		Email string `json:"email" validate:"required,email"`
		Code  string `json:"code" validate:"required"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	user, err := ctrl.userRepo.FindByEmail(context.Background(), uuid.Nil, req.Email)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	valid, err := ctrl.service.ValidateCode(user.ID, req.Code)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to validate code",
		})
	}

	codeType := "totp"
	if len(req.Code) == 8 {
		codeType = "backup"
	}

	if valid {
		ctrl.service.LogAuditEvent(user.ID, models.Event2FAVerificationSuccess,
			map[string]interface{}{"login": true, "code_type": codeType}, c.IP(), c.Get("User-Agent"))
	} else {
		ctrl.service.LogAuditEvent(user.ID, models.Event2FAVerificationFailed,
			map[string]interface{}{"reason": "invalid_code", "code_type": codeType}, c.IP(), c.Get("User-Agent"))
	}

	return c.JSON(fiber.Map{"success": true, "valid": valid})
}

// GetTrustedDevices handles GET /api/v1/auth/devices
func (ctrl *TwoFactorController) GetTrustedDevices(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User ID not found in context",
		})
	}

	deviceFingerprint := c.Get("X-Device-Fingerprint", "")
	devices, err := ctrl.service.GetTrustedDevices(userID, deviceFingerprint)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get trusted devices",
		})
	}

	return c.JSON(fiber.Map{"success": true, "devices": devices})
}

// RevokeTrustedDevice handles DELETE /api/v1/auth/devices/:deviceId
func (ctrl *TwoFactorController) RevokeTrustedDevice(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User ID not found in context",
		})
	}

	deviceID := c.Params("deviceId")
	if deviceID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Device ID is required",
		})
	}

	currentDeviceFingerprint := c.Get("X-Device-Fingerprint", "")

	if err := ctrl.service.RevokeDevice(userID, deviceID, currentDeviceFingerprint); err != nil {
		if errors.Is(err, service.ErrDeviceNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Device not found",
			})
		}
		if errors.Is(err, service.ErrCannotRevokeCurrentDevice) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Cannot revoke current device",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to revoke device",
		})
	}

	ctrl.service.LogAuditEvent(userID, models.EventDeviceRevoked,
		map[string]interface{}{"device_id": deviceID}, c.IP(), c.Get("User-Agent"))

	return c.JSON(fiber.Map{"success": true, "message": "Device access revoked successfully"})
}
