package controllers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/keshablive/quester/internal/framework/core"
	"github.com/keshablive/quester/internal/framework/responses"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/service"
)

// DashboardController handles dashboard HTTP requests
type DashboardController struct {
	service *service.DashboardService
}

// NewDashboardController creates a new dashboard controller
func NewDashboardController(service *service.DashboardService) *DashboardController {
	return &DashboardController{service: service}
}

// CreateDashboard creates a new dashboard
// POST /api/dashboards
func (c *DashboardController) CreateDashboard(ctx *fiber.Ctx) error {
	claims := ctx.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(ctx, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(ctx, "Invalid user ID")
	}

	var dashboard models.Dashboard
	if err := ctx.BodyParser(&dashboard); err != nil {
		return responses.BadRequest(ctx, "Invalid request body")
	}

	dashboard.TenantID = tenantID
	dashboard.UserID = userID

	if dashboard.Name == "" {
		return responses.BadRequest(ctx, "Dashboard name is required")
	}

	if err := c.service.CreateDashboard(&dashboard); err != nil {
		return responses.HandleServiceError(ctx, err)
	}

	return responses.Created(ctx, dashboard)
}

// GetDashboard retrieves a dashboard by ID
// GET /api/dashboards/:id
func (c *DashboardController) GetDashboard(ctx *fiber.Ctx) error {
	dashboardID, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return responses.BadRequest(ctx, "Invalid dashboard ID")
	}

	dashboard, err := c.service.GetDashboard(dashboardID)
	if err != nil {
		return responses.NotFound(ctx, "Dashboard not found")
	}

	return responses.Success(ctx, dashboard)
}

// GetUserDashboards retrieves all dashboards for the current user
// GET /api/dashboards
func (c *DashboardController) GetUserDashboards(ctx *fiber.Ctx) error {
	claims := ctx.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(ctx, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(ctx, "Invalid user ID")
	}

	dashboards, err := c.service.GetUserDashboards(tenantID, userID)
	if err != nil {
		return responses.InternalError(ctx, "Failed to retrieve dashboards")
	}

	return responses.Success(ctx, fiber.Map{
		"dashboards": dashboards,
		"count":      len(dashboards),
	})
}

// GetDefaultDashboard retrieves the user's default dashboard
// GET /api/dashboards/default
func (c *DashboardController) GetDefaultDashboard(ctx *fiber.Ctx) error {
	claims := ctx.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(ctx, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(ctx, "Invalid user ID")
	}

	dashboard, err := c.service.GetDefaultDashboard(tenantID, userID)
	if err != nil {
		return responses.InternalError(ctx, "Failed to retrieve default dashboard")
	}

	return responses.Success(ctx, dashboard)
}

// UpdateDashboard updates a dashboard
// PUT /api/dashboards/:id
func (c *DashboardController) UpdateDashboard(ctx *fiber.Ctx) error {
	dashboardID, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return responses.BadRequest(ctx, "Invalid dashboard ID")
	}

	var dashboard models.Dashboard
	if err := ctx.BodyParser(&dashboard); err != nil {
		return responses.BadRequest(ctx, "Invalid request body")
	}

	dashboard.ID = dashboardID

	if err := c.service.UpdateDashboard(&dashboard); err != nil {
		return responses.HandleServiceError(ctx, err)
	}

	return responses.Success(ctx, dashboard)
}

// SetDefaultDashboard sets a dashboard as default
// PATCH /api/dashboards/:id/default
func (c *DashboardController) SetDefaultDashboard(ctx *fiber.Ctx) error {
	claims := ctx.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(ctx, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(ctx, "Invalid user ID")
	}

	dashboardID, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return responses.BadRequest(ctx, "Invalid dashboard ID")
	}

	if err := c.service.SetDefaultDashboard(tenantID, userID, dashboardID); err != nil {
		return responses.HandleServiceError(ctx, err)
	}

	return responses.Success(ctx, fiber.Map{
		"message": "Default dashboard set successfully",
	})
}

// CloneDashboard clones an existing dashboard
// POST /api/dashboards/:id/clone
func (c *DashboardController) CloneDashboard(ctx *fiber.Ctx) error {
	claims := ctx.Locals("claims").(*core.Claims)

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(ctx, "Invalid user ID")
	}

	dashboardID, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return responses.BadRequest(ctx, "Invalid dashboard ID")
	}

	var req struct {
		Name string `json:"name"`
	}

	if err := ctx.BodyParser(&req); err != nil {
		return responses.BadRequest(ctx, "Invalid request body")
	}

	if req.Name == "" {
		return responses.BadRequest(ctx, "Cloned dashboard name is required")
	}

	newDashboard, err := c.service.CloneDashboard(dashboardID, userID, req.Name)
	if err != nil {
		return responses.HandleServiceError(ctx, err)
	}

	return responses.Created(ctx, newDashboard)
}

// SearchDashboards searches dashboards
// GET /api/dashboards/search?q=analytics
func (c *DashboardController) SearchDashboards(ctx *fiber.Ctx) error {
	claims := ctx.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(ctx, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(ctx, "Invalid user ID")
	}

	query := ctx.Query("q", "")
	if query == "" {
		return responses.BadRequest(ctx, "Search query is required")
	}

	dashboards, err := c.service.SearchDashboards(tenantID, userID, query)
	if err != nil {
		return responses.InternalError(ctx, "Failed to search dashboards")
	}

	return responses.Success(ctx, fiber.Map{
		"dashboards": dashboards,
		"query":      query,
		"count":      len(dashboards),
	})
}

// DeleteDashboard deletes a dashboard
// DELETE /api/dashboards/:id
func (c *DashboardController) DeleteDashboard(ctx *fiber.Ctx) error {
	claims := ctx.Locals("claims").(*core.Claims)

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(ctx, "Invalid user ID")
	}

	dashboardID, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return responses.BadRequest(ctx, "Invalid dashboard ID")
	}

	if err := c.service.DeleteDashboard(dashboardID, userID); err != nil {
		return responses.HandleServiceError(ctx, err)
	}

	return responses.Success(ctx, fiber.Map{
		"message": "Dashboard deleted successfully",
	})
}

// RefreshDashboard refreshes all metrics in a dashboard
// POST /api/dashboards/:id/refresh
func (c *DashboardController) RefreshDashboard(ctx *fiber.Ctx) error {
	dashboardID, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return responses.BadRequest(ctx, "Invalid dashboard ID")
	}

	// Verify dashboard exists
	dashboard, err := c.service.GetDashboard(dashboardID)
	if err != nil {
		return responses.NotFound(ctx, "Dashboard not found")
	}

	// Refresh all metrics for this tenant
	if err := c.service.RefreshAllMetrics(dashboard.TenantID); err != nil {
		return responses.InternalError(ctx, "Failed to refresh metrics")
	}

	return responses.Success(ctx, fiber.Map{
		"message": "Dashboard metrics refreshed successfully",
	})
}
