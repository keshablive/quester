package framework_test

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/framework/controller"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestValidationRequest is a sample request struct for testing validation
type TestValidationRequest struct {
	Name  string `json:"name" validate:"required,min=3"`
	Email string `json:"email" validate:"required,email"`
	Age   int    `json:"age" validate:"required,gte=0,lte=150"`
}

func TestParseAndValidate_Success(t *testing.T) {
	app := fiber.New()
	var result TestValidationRequest

	app.Post("/test", func(c *fiber.Ctx) error {
		var req TestValidationRequest
		if err := controller.ParseAndValidate(c, &req); err != nil {
			return err // Error response already sent by ParseAndValidate
		}
		result = req
		return c.JSON(fiber.Map{"status": "ok"})
	})

	body := `{"name":"John Doe","email":"john@example.com","age":30}`
	req := httptest.NewRequest("POST", "/test", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	assert.Equal(t, "John Doe", result.Name)
	assert.Equal(t, "john@example.com", result.Email)
	assert.Equal(t, 30, result.Age)
}

func TestParseAndValidate_InvalidJSON(t *testing.T) {
	app := fiber.New()

	app.Post("/test", func(c *fiber.Ctx) error {
		var req TestValidationRequest
		if err := controller.ParseAndValidate(c, &req); err != nil {
			return err // Error response already sent
		}
		return c.JSON(fiber.Map{"status": "ok"})
	})

	body := `{"name": invalid json}`
	req := httptest.NewRequest("POST", "/test", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestParseAndValidate_ValidationError_MissingRequired(t *testing.T) {
	app := fiber.New()

	app.Post("/test", func(c *fiber.Ctx) error {
		var req TestValidationRequest
		if err := controller.ParseAndValidate(c, &req); err != nil {
			return err
		}
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// Missing required fields - send empty object (age will be 0 which is valid for gte=0)
	body := `{"age":0}`
	req := httptest.NewRequest("POST", "/test", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestParseAndValidate_ValidationError_InvalidEmail(t *testing.T) {
	app := fiber.New()

	app.Post("/test", func(c *fiber.Ctx) error {
		var req TestValidationRequest
		if err := controller.ParseAndValidate(c, &req); err != nil {
			return err
		}
		return c.JSON(fiber.Map{"status": "ok"})
	})

	body := `{"name":"John Doe","email":"not-an-email","age":30}`
	req := httptest.NewRequest("POST", "/test", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestParseAndValidate_ValidationError_NameTooShort(t *testing.T) {
	app := fiber.New()

	app.Post("/test", func(c *fiber.Ctx) error {
		var req TestValidationRequest
		if err := controller.ParseAndValidate(c, &req); err != nil {
			return err
		}
		return c.JSON(fiber.Map{"status": "ok"})
	})

	body := `{"name":"Jo","email":"john@example.com","age":30}`
	req := httptest.NewRequest("POST", "/test", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestParseAndValidate_ValidationError_AgeOutOfRange(t *testing.T) {
	app := fiber.New()

	app.Post("/test", func(c *fiber.Ctx) error {
		var req TestValidationRequest
		if err := controller.ParseAndValidate(c, &req); err != nil {
			return err
		}
		return c.JSON(fiber.Map{"status": "ok"})
	})

	body := `{"name":"John Doe","email":"john@example.com","age":200}`
	req := httptest.NewRequest("POST", "/test", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestParseAndValidate_ValidationError_NegativeAge(t *testing.T) {
	app := fiber.New()

	app.Post("/test", func(c *fiber.Ctx) error {
		var req TestValidationRequest
		if err := controller.ParseAndValidate(c, &req); err != nil {
			return err
		}
		return c.JSON(fiber.Map{"status": "ok"})
	})

	body := `{"name":"John Doe","email":"john@example.com","age":-5}`
	req := httptest.NewRequest("POST", "/test", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

// TestOptionalRequest tests validation with optional fields
type TestOptionalRequest struct {
	Name    string `json:"name" validate:"required"`
	Website string `json:"website" validate:"omitempty,url"`
}

func TestParseAndValidate_OptionalField_Empty(t *testing.T) {
	app := fiber.New()
	var result TestOptionalRequest

	app.Post("/test", func(c *fiber.Ctx) error {
		var req TestOptionalRequest
		if err := controller.ParseAndValidate(c, &req); err != nil {
			return err
		}
		result = req
		return c.JSON(fiber.Map{"status": "ok"})
	})

	body := `{"name":"John Doe"}`
	req := httptest.NewRequest("POST", "/test", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	assert.Equal(t, "John Doe", result.Name)
	assert.Equal(t, "", result.Website)
}

func TestParseAndValidate_OptionalField_Invalid(t *testing.T) {
	app := fiber.New()

	app.Post("/test", func(c *fiber.Ctx) error {
		var req TestOptionalRequest
		if err := controller.ParseAndValidate(c, &req); err != nil {
			return err
		}
		return c.JSON(fiber.Map{"status": "ok"})
	})

	body := `{"name":"John Doe","website":"not-a-url"}`
	req := httptest.NewRequest("POST", "/test", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestParseAndValidate_OptionalField_Valid(t *testing.T) {
	app := fiber.New()
	var result TestOptionalRequest

	app.Post("/test", func(c *fiber.Ctx) error {
		var req TestOptionalRequest
		if err := controller.ParseAndValidate(c, &req); err != nil {
			return err
		}
		result = req
		return c.JSON(fiber.Map{"status": "ok"})
	})

	body := `{"name":"John Doe","website":"https://example.com"}`
	req := httptest.NewRequest("POST", "/test", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	assert.Equal(t, "John Doe", result.Name)
	assert.Equal(t, "https://example.com", result.Website)
}

func TestParseAndValidate_EmptyBody(t *testing.T) {
	app := fiber.New()

	app.Post("/test", func(c *fiber.Ctx) error {
		var req TestValidationRequest
		if err := controller.ParseAndValidate(c, &req); err != nil {
			return err
		}
		return c.JSON(fiber.Map{"status": "ok"})
	})

	req := httptest.NewRequest("POST", "/test", nil)
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}
