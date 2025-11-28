package controllers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/core"
	"github.com/keshablive/quester/internal/framework/responses"
	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/services"
)

// PropertyController handles property listing HTTP requests
type PropertyController struct {
	propertyService *services.PropertyService
}

// NewPropertyController creates a new property controller
func NewPropertyController(propertyService *services.PropertyService) *PropertyController {
	return &PropertyController{
		propertyService: propertyService,
	}
}

// Create creates a new property listing
// POST /api/v1/properties
func (pc *PropertyController) Create(c *fiber.Ctx) error {
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
		Title        string         `json:"title" validate:"required,min=3,max=200"`
		Description  string         `json:"description"`
		PropertyType string         `json:"property_type" validate:"required"`
		ListingType  string         `json:"listing_type" validate:"required"`
		Price        float64        `json:"price" validate:"required,gt=0"`
		Currency     string         `json:"currency"`
		Location     *models.Point  `json:"location" validate:"required"`
		Address      models.Address `json:"address"`
		Bedrooms     *int           `json:"bedrooms"`
		Bathrooms    *int           `json:"bathrooms"`
		AreaSqFt     *float64       `json:"area_sqft"`
		Images       []string       `json:"images"`
		Amenities    []string       `json:"amenities"`
		Tags         []string       `json:"tags"`
	}

	if err := c.BodyParser(&req); err != nil {
		return responses.BadRequest(c, "Invalid request body")
	}

	if err := core.Validate.Struct(req); err != nil {
		return responses.ValidationError(c, err)
	}

	// Validate location coordinates
	if len(req.Location.Coordinates) < 2 || (req.Location.Coordinates[0] == 0 && req.Location.Coordinates[1] == 0) {
		return responses.BadRequest(c, "Valid location coordinates are required")
	}

	// Sanitize user input to prevent XSS attacks
	sanitizedTitle := utils.SanitizeHTML(req.Title)
	sanitizedDescription := utils.SanitizeHTML(req.Description)

	// Create property
	property := &models.Property{
		TenantID:     tenantID,
		OwnerID:      userID,
		Title:        sanitizedTitle,
		Description:  sanitizedDescription,
		PropertyType: models.PropertyType(req.PropertyType),
		ListingType:  models.ListingType(req.ListingType),
		Price:        req.Price,
		Currency:     req.Currency,
		Location:     *req.Location,
		Address:      req.Address,
		Bedrooms:     req.Bedrooms,
		Bathrooms:    req.Bathrooms,
		AreaSqFt:     req.AreaSqFt,
		Images:       req.Images,
		Amenities:    req.Amenities,
		Tags:         req.Tags,
		Status:       models.PropertyStatusDraft,
	}

	if err := pc.propertyService.CreateProperty(ctx, property); err != nil {
		return responses.InternalError(c, "Failed to create property")
	}

	return responses.Created(c, property)
}

// Get retrieves a property by ID
// GET /api/v1/properties/:id
func (pc *PropertyController) Get(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	propertyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid property ID")
	}

	property, err := pc.propertyService.GetProperty(ctx, tenantID, propertyID)
	if err != nil {
		return responses.NotFound(c, "Property not found")
	}

	return responses.Success(c, property)
}

// Update updates an existing property
// PUT /api/v1/properties/:id
func (pc *PropertyController) Update(c *fiber.Ctx) error {
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

	propertyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid property ID")
	}

	// Verify ownership
	property, err := pc.propertyService.GetProperty(ctx, tenantID, propertyID)
	if err != nil {
		return responses.NotFound(c, "Property not found")
	}

	if property.OwnerID != userID {
		return responses.Forbidden(c, "You don't have permission to update this property")
	}

	var req struct {
		Title        *string         `json:"title,omitempty"`
		Description  *string         `json:"description,omitempty"`
		PropertyType *string         `json:"property_type,omitempty"`
		ListingType  *string         `json:"listing_type,omitempty"`
		Price        *float64        `json:"price,omitempty"`
		Currency     *string         `json:"currency,omitempty"`
		Location     *models.Point   `json:"location,omitempty"`
		Address      *models.Address `json:"address,omitempty"`
		Bedrooms     *int            `json:"bedrooms,omitempty"`
		Bathrooms    *int            `json:"bathrooms,omitempty"`
		AreaSqFt     *float64        `json:"area_sqft,omitempty"`
		Images       []string        `json:"images,omitempty"`
		Amenities    []string        `json:"amenities,omitempty"`
		Tags         []string        `json:"tags,omitempty"`
	}

	if err := c.BodyParser(&req); err != nil {
		return responses.BadRequest(c, "Invalid request body")
	}

	// Build update map
	updates := make(map[string]interface{})
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.PropertyType != nil {
		updates["property_type"] = *req.PropertyType
	}
	if req.ListingType != nil {
		updates["listing_type"] = *req.ListingType
	}
	if req.Price != nil {
		updates["price"] = *req.Price
	}
	if req.Currency != nil {
		updates["currency"] = *req.Currency
	}
	if req.Location != nil {
		updates["location"] = *req.Location
	}
	if req.Address != nil {
		updates["address"] = *req.Address
	}
	if req.Bedrooms != nil {
		updates["bedrooms"] = req.Bedrooms
	}
	if req.Bathrooms != nil {
		updates["bathrooms"] = req.Bathrooms
	}
	if req.AreaSqFt != nil {
		updates["area_sqft"] = req.AreaSqFt
	}
	if req.Images != nil {
		updates["images"] = req.Images
	}
	if req.Amenities != nil {
		updates["amenities"] = req.Amenities
	}
	if req.Tags != nil {
		updates["tags"] = req.Tags
	}

	if len(updates) == 0 {
		return responses.BadRequest(c, "No fields to update")
	}

	if err := pc.propertyService.UpdateProperty(ctx, tenantID, propertyID, updates); err != nil {
		return responses.InternalError(c, "Failed to update property")
	}

	// Fetch updated property
	updatedProperty, err := pc.propertyService.GetProperty(ctx, tenantID, propertyID)
	if err != nil {
		return responses.InternalError(c, "Failed to fetch updated property")
	}

	return responses.Success(c, updatedProperty)
}

// Delete soft deletes a property
// DELETE /api/v1/properties/:id
func (pc *PropertyController) Delete(c *fiber.Ctx) error {
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

	propertyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid property ID")
	}

	// Verify ownership
	property, err := pc.propertyService.GetProperty(ctx, tenantID, propertyID)
	if err != nil {
		return responses.NotFound(c, "Property not found")
	}

	if property.OwnerID != userID {
		return responses.Forbidden(c, "You don't have permission to delete this property")
	}

	if err := pc.propertyService.DeleteProperty(ctx, tenantID, propertyID); err != nil {
		return responses.InternalError(c, "Failed to delete property")
	}

	return responses.NoContent(c)
}

// Search searches for properties with geo-spatial filtering
// POST /api/v1/properties/search
func (pc *PropertyController) Search(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	var req services.PropertySearchParams
	if err := c.BodyParser(&req); err != nil {
		return responses.BadRequest(c, "Invalid request body")
	}

	req.TenantID = tenantID

	// Set defaults
	if req.RadiusMeters == 0 {
		req.RadiusMeters = 5000 // 5km default
	}
	if req.Limit == 0 {
		req.Limit = 20
	}

	properties, total, err := pc.propertyService.SearchProperties(ctx, req)
	if err != nil {
		return responses.InternalError(c, "Failed to search properties")
	}

	return responses.SuccessWithMeta(c, properties, map[string]interface{}{
		"total":  total,
		"limit":  req.Limit,
		"offset": req.Offset,
	})
}

// Publish publishes a property (makes it visible to others)
// POST /api/v1/properties/:id/publish
func (pc *PropertyController) Publish(c *fiber.Ctx) error {
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

	propertyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid property ID")
	}

	// Verify ownership
	property, err := pc.propertyService.GetProperty(ctx, tenantID, propertyID)
	if err != nil {
		return responses.NotFound(c, "Property not found")
	}

	if property.OwnerID != userID {
		return responses.Forbidden(c, "You don't have permission to publish this property")
	}

	if err := pc.propertyService.PublishProperty(ctx, propertyID); err != nil {
		return responses.InternalError(c, "Failed to publish property")
	}

	// Fetch updated property
	updatedProperty, err := pc.propertyService.GetProperty(ctx, tenantID, propertyID)
	if err != nil {
		return responses.InternalError(c, "Failed to fetch updated property")
	}

	return responses.Success(c, updatedProperty)
}

// IncrementContactCount increments the contact count for a property
// POST /api/v1/properties/:id/contact
func (pc *PropertyController) IncrementContactCount(c *fiber.Ctx) error {
	ctx := c.Context()

	propertyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid property ID")
	}

	if err := pc.propertyService.IncrementContactCount(ctx, propertyID); err != nil {
		return responses.InternalError(c, "Failed to track contact")
	}

	return responses.NoContent(c)
}

// UploadDocuments handles property document uploads (placeholder for future S3 integration)
// POST /api/v1/properties/:id/documents
func (pc *PropertyController) UploadDocuments(c *fiber.Ctx) error {
	// TODO: Implement S3 file upload
	// This would typically:
	// 1. Parse multipart form data
	// 2. Validate file types (PDF, images)
	// 3. Upload to S3
	// 4. Store document metadata in database
	// 5. Trigger OCR verification if needed

	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error":   "Document upload not yet implemented",
		"message": "S3 integration pending",
	})
}

// VerifyDocuments triggers OCR verification of property documents
// POST /api/v1/properties/:id/verify
func (pc *PropertyController) VerifyDocuments(c *fiber.Ctx) error {
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

	propertyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid property ID")
	}

	// Verify ownership
	property, err := pc.propertyService.GetProperty(ctx, tenantID, propertyID)
	if err != nil {
		return responses.NotFound(c, "Property not found")
	}

	if property.OwnerID != userID {
		return responses.Forbidden(c, "You don't have permission to verify this property")
	}

	if err := pc.propertyService.VerifyPropertyDocuments(ctx, propertyID); err != nil {
		return responses.InternalError(c, "Failed to verify property documents")
	}

	return responses.Success(c, fiber.Map{
		"message": "Property verification initiated",
		"status":  "pending",
	})
}

// GetMyProperties retrieves all properties owned by the current user
// GET /api/v1/properties/my
func (pc *PropertyController) GetMyProperties(c *fiber.Ctx) error {
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

	// Use search with owner filter
	params := services.PropertySearchParams{
		TenantID: tenantID,
		Limit:    100,
		Offset:   0,
	}

	properties, total, err := pc.propertyService.SearchProperties(ctx, params)
	if err != nil {
		return responses.InternalError(c, "Failed to fetch properties")
	}

	// Filter by owner (should be done in service layer ideally)
	myProperties := make([]services.PropertyWithDistance, 0)
	for _, p := range properties {
		if p.Property.OwnerID == userID {
			myProperties = append(myProperties, p)
		}
	}

	return responses.SuccessWithMeta(c, myProperties, map[string]interface{}{
		"total": total,
	})
}

// GetStats retrieves property statistics
// GET /api/v1/properties/stats
func (pc *PropertyController) GetStats(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	stats, err := pc.propertyService.GetPropertyStats(ctx, tenantID)
	if err != nil {
		return responses.InternalError(c, "Failed to fetch property statistics")
	}

	return responses.Success(c, stats)
}
