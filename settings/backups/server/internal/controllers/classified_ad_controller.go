package controllers

import (
	"strconv"

	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/framework/core"
	"github.com/yourusername/quester/internal/framework/responses"
	"github.com/yourusername/quester/internal/framework/utils"
	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/services"

	"github.com/gofiber/fiber/v2"
)

// ClassifiedAdController handles classified ad HTTP requests
type ClassifiedAdController struct {
	classifiedAdService *services.ClassifiedAdService
}

// NewClassifiedAdController creates a new classified ad controller
func NewClassifiedAdController(classifiedAdService *services.ClassifiedAdService) *ClassifiedAdController {
	return &ClassifiedAdController{
		classifiedAdService: classifiedAdService,
	}
}

// CreateAd creates a new classified ad
// POST /api/classifieds
func (cac *ClassifiedAdController) CreateAd(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	var req struct {
		Title         string                 `json:"title" validate:"required,min=3,max=200"`
		Description   string                 `json:"description"`
		AdType        string                 `json:"ad_type" validate:"required"`
		Price         *float64               `json:"price"`
		Currency      string                 `json:"currency"`
		PriceType     string                 `json:"price_type"`
		Location      *models.Point          `json:"location"`
		LocationText  string                 `json:"location_text"`
		Images        []string               `json:"images"`
		ContactMethod string                 `json:"contact_method" validate:"required"`
		ContactInfo   string                 `json:"contact_info" validate:"required"`
		CategoryData  map[string]interface{} `json:"category_data"`
		Tags          []string               `json:"tags"`
		Keywords      []string               `json:"keywords"`
	}

	if err := c.BodyParser(&req); err != nil {
		return responses.BadRequest(c, "Invalid request body")
	}

	if err := core.Validate.Struct(req); err != nil {
		return responses.ValidationError(c, err)
	}

	// Sanitize user input to prevent XSS attacks
	sanitizedTitle := utils.SanitizeHTML(req.Title)
	sanitizedDescription := utils.SanitizeHTML(req.Description)
	sanitizedLocationText := utils.SanitizeHTML(req.LocationText)
	sanitizedContactInfo := utils.SanitizeHTML(req.ContactInfo)

	// Create classified ad
	ad := &models.ClassifiedAd{
		TenantID:      tenantID,
		PosterID:      userID,
		Title:         sanitizedTitle,
		Description:   sanitizedDescription,
		AdType:        models.AdType(req.AdType),
		Price:         req.Price,
		Currency:      req.Currency,
		PriceType:     req.PriceType,
		Location:      req.Location,
		LocationText:  sanitizedLocationText,
		Images:        req.Images,
		ContactMethod: models.ContactMethod(req.ContactMethod),
		ContactInfo:   sanitizedContactInfo,
		Tags:          req.Tags,
		Keywords:      req.Keywords,
		Status:        models.AdStatusDraft,
	}

	if err := cac.classifiedAdService.CreateAd(ctx, ad); err != nil {
		return responses.InternalError(c, "Failed to create classified ad")
	}

	return responses.Created(c, ad)
}

// GetAd retrieves a classified ad by ID
// GET /api/classifieds/:id
func (cac *ClassifiedAdController) GetAd(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)
	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	_, err = core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	adID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid ad ID")
	}

	ad, err := cac.classifiedAdService.GetAd(ctx, tenantID, adID)
	if err != nil {
		return responses.NotFound(c, "Classified ad not found")
	}

	return responses.Success(c, ad)
}

// UpdateAd updates an existing classified ad
// PUT /api/classifieds/:id
func (cac *ClassifiedAdController) UpdateAd(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)
	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	adID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid ad ID")
	}

	// Verify ownership
	ad, err := cac.classifiedAdService.GetAd(ctx, tenantID, adID)
	if err != nil {
		return responses.NotFound(c, "Classified ad not found")
	}

	if ad.PosterID != userID {
		return responses.Forbidden(c, "You don't have permission to update this ad")
	}

	var req map[string]interface{}
	if err := c.BodyParser(&req); err != nil {
		return responses.BadRequest(c, "Invalid request body")
	}

	// Sanitize user-generated content fields to prevent XSS
	if title, ok := req["title"].(string); ok {
		req["title"] = utils.SanitizeHTML(title)
	}
	if description, ok := req["description"].(string); ok {
		req["description"] = utils.SanitizeHTML(description)
	}
	if locationText, ok := req["location_text"].(string); ok {
		req["location_text"] = utils.SanitizeHTML(locationText)
	}
	if contactInfo, ok := req["contact_info"].(string); ok {
		req["contact_info"] = utils.SanitizeHTML(contactInfo)
	}

	// Remove fields that shouldn't be updated directly
	delete(req, "id")
	delete(req, "tenant_id")
	delete(req, "poster_id")
	delete(req, "created_at")
	delete(req, "deleted_at")

	if err := cac.classifiedAdService.UpdateAd(ctx, tenantID, adID, req); err != nil {
		return responses.InternalError(c, "Failed to update classified ad")
	}

	return responses.Success(c, nil)
}

// DeleteAd deletes a classified ad
// DELETE /api/classifieds/:id
func (cac *ClassifiedAdController) DeleteAd(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)
	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	adID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid ad ID")
	}

	// Verify ownership
	ad, err := cac.classifiedAdService.GetAd(ctx, tenantID, adID)
	if err != nil {
		return responses.NotFound(c, "Classified ad not found")
	}

	if ad.PosterID != userID {
		return responses.Forbidden(c, "You don't have permission to delete this ad")
	}

	if err := cac.classifiedAdService.DeleteAd(ctx, tenantID, adID); err != nil {
		return responses.InternalError(c, "Failed to delete classified ad")
	}

	return responses.Success(c, nil)
}

// SearchAds performs search for classified ads
// GET /api/classifieds/search
func (cac *ClassifiedAdController) SearchAds(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)
	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	_, err = core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	// Parse query parameters
	lat, _ := strconv.ParseFloat(c.Query("latitude"), 64)
	lng, _ := strconv.ParseFloat(c.Query("longitude"), 64)
	radius, _ := strconv.Atoi(c.Query("radius", "5000")) // Default 5km
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	params := services.ClassifiedAdSearchParams{
		TenantID:     tenantID,
		AdType:       c.Query("ad_type"),
		Status:       c.Query("status"),
		Latitude:     lat,
		Longitude:    lng,
		RadiusMeters: radius,
		Limit:        limit,
		Offset:       offset,
	}

	// Parse price range
	if minPrice := c.Query("min_price"); minPrice != "" {
		if price, err := strconv.ParseFloat(minPrice, 64); err == nil {
			params.MinPrice = &price
		}
	}
	if maxPrice := c.Query("max_price"); maxPrice != "" {
		if price, err := strconv.ParseFloat(maxPrice, 64); err == nil {
			params.MaxPrice = &price
		}
	}

	// Parse keywords and tags
	if keywords := c.Query("keywords"); keywords != "" {
		// params.Keywords = c.Queries()["keywords"] // TODO: Parse array from query string
	}
	if tags := c.Query("tags"); tags != "" {
		// params.Tags = c.Queries()["tags"] // TODO: Parse array from query string
	}

	results, total, err := cac.classifiedAdService.SearchAds(ctx, params)
	if err != nil {
		return responses.InternalError(c, "Failed to search classified ads")
	}

	return responses.Success(c, fiber.Map{
		"ads":    results,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// PublishAd publishes a classified ad
// POST /api/classifieds/:id/publish
func (cac *ClassifiedAdController) PublishAd(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)
	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	adID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid ad ID")
	}

	// Verify ownership
	ad, err := cac.classifiedAdService.GetAd(ctx, tenantID, adID)
	if err != nil {
		return responses.NotFound(c, "Classified ad not found")
	}

	if ad.PosterID != userID {
		return responses.Forbidden(c, "You don't have permission to publish this ad")
	}

	// Publish ad
	if err := cac.classifiedAdService.PublishAd(ctx, adID); err != nil {
		return responses.InternalError(c, "Failed to publish ad")
	}

	// Get updated ad
	ad, _ = cac.classifiedAdService.GetAd(ctx, tenantID, adID)

	return responses.Success(c, ad)
}

// RenewAd renews a classified ad (extends expiration by 30 days)
// POST /api/classifieds/:id/renew
func (cac *ClassifiedAdController) RenewAd(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)
	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	adID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid ad ID")
	}

	// Verify ownership
	ad, err := cac.classifiedAdService.GetAd(ctx, tenantID, adID)
	if err != nil {
		return responses.NotFound(c, "Classified ad not found")
	}

	if ad.PosterID != userID {
		return responses.Forbidden(c, "You don't have permission to renew this ad")
	}

	// Renew ad
	if err := cac.classifiedAdService.RenewAd(ctx, tenantID, adID); err != nil {
		return responses.BadRequest(c, err.Error())
	}

	// Get updated ad
	ad, _ = cac.classifiedAdService.GetAd(ctx, tenantID, adID)

	return responses.Success(c, ad)
}

// MarkAsSold marks a classified ad as sold
// POST /api/classifieds/:id/sold
func (cac *ClassifiedAdController) MarkAsSold(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)
	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	adID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid ad ID")
	}

	// Verify ownership
	ad, err := cac.classifiedAdService.GetAd(ctx, tenantID, adID)
	if err != nil {
		return responses.NotFound(c, "Classified ad not found")
	}

	if ad.PosterID != userID {
		return responses.Forbidden(c, "You don't have permission to mark this ad as sold")
	}

	// Mark as sold
	if err := cac.classifiedAdService.MarkAsSold(ctx, tenantID, adID); err != nil {
		return responses.InternalError(c, "Failed to mark ad as sold")
	}

	// Get updated ad
	ad, _ = cac.classifiedAdService.GetAd(ctx, tenantID, adID)

	return responses.Success(c, ad)
}

// IncrementResponseCount increments response count for a classified ad
// POST /api/classifieds/:id/respond
func (cac *ClassifiedAdController) IncrementResponseCount(c *fiber.Ctx) error {
	ctx := c.Context()

	adID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid ad ID")
	}

	if err := cac.classifiedAdService.IncrementResponseCount(ctx, adID); err != nil {
		return responses.InternalError(c, "Failed to increment response count")
	}

	return responses.Success(c, nil)
}

// GetMyAds retrieves all ads posted by the current user
// GET /api/classifieds/my-ads
func (cac *ClassifiedAdController) GetMyAds(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)
	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	ads, err := cac.classifiedAdService.GetAdsByPoster(ctx, tenantID, userID)
	if err != nil {
		return responses.InternalError(c, "Failed to get ads")
	}

	return responses.Success(c, ads)
}

// GetRecentAds retrieves the most recent classified ads
// GET /api/classifieds/recent
func (cac *ClassifiedAdController) GetRecentAds(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)
	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	_, err = core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	ads, err := cac.classifiedAdService.GetRecentAds(ctx, tenantID, limit)
	if err != nil {
		return responses.InternalError(c, "Failed to get recent ads")
	}

	return responses.Success(c, ads)
}

// GetPopularAds retrieves the most viewed classified ads
// GET /api/classifieds/popular
func (cac *ClassifiedAdController) GetPopularAds(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)
	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	_, err = core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	ads, err := cac.classifiedAdService.GetPopularAds(ctx, tenantID, limit)
	if err != nil {
		return responses.InternalError(c, "Failed to get popular ads")
	}

	return responses.Success(c, ads)
}

// GetAdStats returns statistics for classified ads
// GET /api/classifieds/stats
func (cac *ClassifiedAdController) GetAdStats(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)
	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	_, err = core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	stats, err := cac.classifiedAdService.GetAdStats(ctx, tenantID)
	if err != nil {
		return responses.InternalError(c, "Failed to get ad stats")
	}

	return responses.Success(c, stats)
}
