package controller

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/core"
	"github.com/keshablive/quester/internal/framework/responses"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/service"
)

// MarketplaceController handles marketplace HTTP requests
type MarketplaceController struct {
	marketplaceService *service.MarketplaceService
}

// NewMarketplaceController creates a new marketplace controller
func NewMarketplaceController(marketplaceService *service.MarketplaceService) *MarketplaceController {
	return &MarketplaceController{
		marketplaceService: marketplaceService,
	}
}

// CreateListing creates a new marketplace listing
// POST /api/marketplace/listings
func (mc *MarketplaceController) CreateListing(c *fiber.Ctx) error {
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
		Title          string                 `json:"title" validate:"required,min=3,max=255"`
		Description    string                 `json:"description"`
		ListingType    models.ListingType     `json:"listing_type" validate:"required"`
		Price          float64                `json:"price" validate:"required,gt=0"`
		Currency       string                 `json:"currency"`
		CommissionRate float64                `json:"commission_rate"`
		Quantity       *int                   `json:"quantity"`
		CourseID       *uuid.UUID             `json:"course_id"`
		QuestID        *uuid.UUID             `json:"quest_id"`
		BadgeID        *uuid.UUID             `json:"badge_id"`
		ImageURLs      []string               `json:"image_urls"`
		VideoURL       string                 `json:"video_url"`
		Tags           []string               `json:"tags"`
		Metadata       map[string]interface{} `json:"metadata"`
	}

	if err := c.BodyParser(&req); err != nil {
		return responses.BadRequest(c, "Invalid request body")
	}

	// Validate
	if err := core.ValidateStruct(&req); err != nil {
		return responses.BadRequest(c, err.Error())
	}

	// Create listing
	listing := &models.MarketplaceListing{
		Title:          req.Title,
		Description:    req.Description,
		ListingType:    req.ListingType,
		Status:         models.ListingStatusDraft,
		Price:          req.Price,
		Currency:       req.Currency,
		CommissionRate: req.CommissionRate,
		Quantity:       req.Quantity,
		CourseID:       req.CourseID,
		QuestID:        req.QuestID,
		BadgeID:        req.BadgeID,
		VideoURL:       req.VideoURL,
	}

	created, err := mc.marketplaceService.CreateListing(ctx, tenantID, userID, listing)
	if err != nil {
		return responses.HandleServiceError(c, err)
	}

	return responses.Created(c, created)
}

// GetListings retrieves marketplace listings with search and filters
// GET /api/marketplace/listings
func (mc *MarketplaceController) GetListings(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	// Parse query parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))

	filters := make(map[string]interface{})

	if listingType := c.Query("listing_type"); listingType != "" {
		filters["listing_type"] = listingType
	}

	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}

	if minPrice := c.QueryFloat("min_price", 0); minPrice > 0 {
		filters["min_price"] = minPrice
	}

	if maxPrice := c.QueryFloat("max_price", 0); maxPrice > 0 {
		filters["max_price"] = maxPrice
	}

	if search := c.Query("search"); search != "" {
		filters["search"] = search
	}

	if sortBy := c.Query("sort_by"); sortBy != "" {
		filters["sort_by"] = sortBy
	}

	if sortOrder := c.Query("sort_order"); sortOrder != "" {
		filters["sort_order"] = sortOrder
	}

	listings, total, err := mc.marketplaceService.SearchListings(ctx, tenantID, filters, page, pageSize)
	if err != nil {
		return responses.HandleServiceError(c, err)
	}

	return responses.SuccessWithPagination(c, listings, int64(page), pageSize, int(total))
}

// GetListing retrieves a single marketplace listing
// GET /api/marketplace/listings/:id
func (mc *MarketplaceController) GetListing(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	listingID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid listing ID")
	}

	listing, err := mc.marketplaceService.GetListing(ctx, tenantID, listingID)
	if err != nil {
		return responses.HandleServiceError(c, err)
	}

	return responses.Success(c, listing)
}

// UpdateListing updates a marketplace listing
// PUT /api/marketplace/listings/:id
func (mc *MarketplaceController) UpdateListing(c *fiber.Ctx) error {
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

	listingID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid listing ID")
	}

	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return responses.BadRequest(c, "Invalid request body")
	}

	listing, err := mc.marketplaceService.UpdateListing(ctx, tenantID, userID, listingID, updates)
	if err != nil {
		return responses.HandleServiceError(c, err)
	}

	return responses.Success(c, listing)
}

// DeleteListing soft deletes a marketplace listing
// DELETE /api/marketplace/listings/:id
func (mc *MarketplaceController) DeleteListing(c *fiber.Ctx) error {
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

	listingID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid listing ID")
	}

	if err := mc.marketplaceService.DeleteListing(ctx, tenantID, userID, listingID); err != nil {
		return responses.HandleServiceError(c, err)
	}

	return responses.NoContent(c)
}

// PublishListing publishes a draft listing
// POST /api/marketplace/listings/:id/publish
func (mc *MarketplaceController) PublishListing(c *fiber.Ctx) error {
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

	listingID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid listing ID")
	}

	listing, err := mc.marketplaceService.PublishListing(ctx, tenantID, userID, listingID)
	if err != nil {
		return responses.HandleServiceError(c, err)
	}

	return responses.Success(c, listing)
}

// GetMyListings retrieves the current user's listings
// GET /api/marketplace/my-listings
func (mc *MarketplaceController) GetMyListings(c *fiber.Ctx) error {
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

	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))

	listings, total, err := mc.marketplaceService.GetSellerListings(ctx, tenantID, userID, page, pageSize)
	if err != nil {
		return responses.HandleServiceError(c, err)
	}

	return responses.SuccessWithPagination(c, listings, int64(page), pageSize, int(total))
}

// GetListingStats retrieves statistics for a listing
// GET /api/marketplace/listings/:id/stats
func (mc *MarketplaceController) GetListingStats(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	listingID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid listing ID")
	}

	stats, err := mc.marketplaceService.GetListingStats(ctx, tenantID, listingID)
	if err != nil {
		return responses.HandleServiceError(c, err)
	}

	return responses.Success(c, stats)
}

// GetListingReviews retrieves reviews for a listing
// GET /api/marketplace/listings/:id/reviews
func (mc *MarketplaceController) GetListingReviews(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	listingID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid listing ID")
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))

	reviews, total, err := mc.marketplaceService.GetListingReviews(ctx, tenantID, listingID, page, pageSize)
	if err != nil {
		return responses.HandleServiceError(c, err)
	}

	return responses.SuccessWithPagination(c, reviews, int64(page), pageSize, int(total))
}

// AddReview adds a review to a listing
// POST /api/marketplace/listings/:id/reviews
func (mc *MarketplaceController) AddReview(c *fiber.Ctx) error {
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

	listingID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid listing ID")
	}

	var req struct {
		TransactionID uuid.UUID `json:"transaction_id" validate:"required"`
		Rating        int       `json:"rating" validate:"required,min=1,max=5"`
		Title         string    `json:"title" validate:"max=255"`
		ReviewText    string    `json:"review_text"`
	}

	if err := c.BodyParser(&req); err != nil {
		return responses.BadRequest(c, "Invalid request body")
	}

	if err := core.ValidateStruct(&req); err != nil {
		return responses.BadRequest(c, err.Error())
	}

	review, err := mc.marketplaceService.AddReview(
		ctx,
		tenantID,
		listingID,
		req.TransactionID,
		userID,
		req.Rating,
		req.Title,
		req.ReviewText,
	)
	if err != nil {
		return responses.HandleServiceError(c, err)
	}

	return responses.Created(c, review)
}

// AddSellerResponse adds a seller response to a review
// POST /api/marketplace/reviews/:id/response
func (mc *MarketplaceController) AddSellerResponse(c *fiber.Ctx) error {
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

	reviewID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid review ID")
	}

	var req struct {
		Response string `json:"response" validate:"required"`
	}

	if err := c.BodyParser(&req); err != nil {
		return responses.BadRequest(c, "Invalid request body")
	}

	if err := core.ValidateStruct(&req); err != nil {
		return responses.BadRequest(c, err.Error())
	}

	review, err := mc.marketplaceService.AddSellerResponse(ctx, tenantID, userID, reviewID, req.Response)
	if err != nil {
		return responses.HandleServiceError(c, err)
	}

	return responses.Success(c, review)
}
