package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/yourusername/quester/internal/models"
)

// SearchService handles search and autocomplete functionality
type SearchService struct {
	db    *gorm.DB
	redis *redis.Client
}

// SearchResult represents a generic search result
type SearchResult struct {
	ID          uuid.UUID              `json:"id"`
	Type        string                 `json:"type"` // "course", "property", "classified_ad"
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Rank        float64                `json:"rank"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// AutocompleteResult represents an autocomplete suggestion
type AutocompleteResult struct {
	Text  string  `json:"text"`
	Score float64 `json:"score"`
	Type  string  `json:"type"`
}

// NewSearchService creates a new search service
func NewSearchService(db *gorm.DB, redis *redis.Client) *SearchService {
	return &SearchService{
		db:    db,
		redis: redis,
	}
}

// SearchCourses performs full-text search on courses
func (s *SearchService) SearchCourses(tenantID uuid.UUID, query string, limit, offset int) ([]SearchResult, error) {
	type courseResult struct {
		ID          uuid.UUID
		Name        string
		Description string
		Rank        float64
	}

	var results []courseResult
	err := s.db.Raw(`
		SELECT * FROM search_courses(?, ?, ?, ?)
	`, tenantID, query, limit, offset).Scan(&results).Error

	if err != nil {
		return nil, err
	}

	searchResults := make([]SearchResult, len(results))
	for i, r := range results {
		searchResults[i] = SearchResult{
			ID:          r.ID,
			Type:        "course",
			Title:       r.Name,
			Description: r.Description,
			Rank:        r.Rank,
		}
	}

	return searchResults, nil
}

// SearchProperties performs full-text search on properties
func (s *SearchService) SearchProperties(tenantID uuid.UUID, query string, limit, offset int) ([]SearchResult, error) {
	type propertyResult struct {
		ID          uuid.UUID
		Title       string
		Description string
		Rank        float64
	}

	var results []propertyResult
	err := s.db.Raw(`
		SELECT * FROM search_properties(?, ?, ?, ?)
	`, tenantID, query, limit, offset).Scan(&results).Error

	if err != nil {
		return nil, err
	}

	searchResults := make([]SearchResult, len(results))
	for i, r := range results {
		searchResults[i] = SearchResult{
			ID:          r.ID,
			Type:        "property",
			Title:       r.Title,
			Description: r.Description,
			Rank:        r.Rank,
		}
	}

	return searchResults, nil
}

// SearchClassifiedAds performs full-text search on classified ads
func (s *SearchService) SearchClassifiedAds(tenantID uuid.UUID, query string, limit, offset int) ([]SearchResult, error) {
	type classifiedResult struct {
		ID          uuid.UUID
		Title       string
		Description string
		Rank        float64
	}

	var results []classifiedResult
	err := s.db.Raw(`
		SELECT * FROM search_classified_ads(?, ?, ?, ?)
	`, tenantID, query, limit, offset).Scan(&results).Error

	if err != nil {
		return nil, err
	}

	searchResults := make([]SearchResult, len(results))
	for i, r := range results {
		searchResults[i] = SearchResult{
			ID:          r.ID,
			Type:        "classified_ad",
			Title:       r.Title,
			Description: r.Description,
			Rank:        r.Rank,
		}
	}

	return searchResults, nil
}

// SearchAll performs full-text search across all content types
func (s *SearchService) SearchAll(tenantID uuid.UUID, query string, limit, offset int) ([]SearchResult, error) {
	ctx := context.Background()

	// Get results from all sources concurrently
	courseChan := make(chan []SearchResult)
	propertyChan := make(chan []SearchResult)
	classifiedChan := make(chan []SearchResult)

	go func() {
		results, _ := s.SearchCourses(tenantID, query, limit, 0)
		courseChan <- results
	}()

	go func() {
		results, _ := s.SearchProperties(tenantID, query, limit, 0)
		propertyChan <- results
	}()

	go func() {
		results, _ := s.SearchClassifiedAds(tenantID, query, limit, 0)
		classifiedChan <- results
	}()

	// Collect all results
	var allResults []SearchResult
	allResults = append(allResults, <-courseChan...)
	allResults = append(allResults, <-propertyChan...)
	allResults = append(allResults, <-classifiedChan...)

	// Sort by rank
	sortByRank(allResults)

	// Track search query for autocomplete
	go s.TrackSearchQuery(ctx, tenantID, query)

	// Apply pagination
	start := offset
	end := offset + limit
	if start >= len(allResults) {
		return []SearchResult{}, nil
	}
	if end > len(allResults) {
		end = len(allResults)
	}

	return allResults[start:end], nil
}

// GetAutocomplete returns autocomplete suggestions using Redis sorted sets
func (s *SearchService) GetAutocomplete(ctx context.Context, tenantID uuid.UUID, prefix string, limit int) ([]AutocompleteResult, error) {
	prefix = strings.ToLower(strings.TrimSpace(prefix))
	if len(prefix) < 2 {
		return []AutocompleteResult{}, nil
	}

	// Redis key for autocomplete suggestions
	key := fmt.Sprintf("autocomplete:%s:%s", tenantID.String(), prefix[:2])

	// Get top suggestions from sorted set
	results, err := s.redis.ZRevRangeWithScores(ctx, key, 0, int64(limit-1)).Result()
	if err != nil {
		return nil, err
	}

	var suggestions []AutocompleteResult
	for _, result := range results {
		text := result.Member.(string)
		if strings.HasPrefix(strings.ToLower(text), prefix) {
			suggestions = append(suggestions, AutocompleteResult{
				Text:  text,
				Score: result.Score,
				Type:  "suggestion",
			})
		}
	}

	return suggestions, nil
}

// TrackSearchQuery tracks a search query for autocomplete suggestions
func (s *SearchService) TrackSearchQuery(ctx context.Context, tenantID uuid.UUID, query string) error {
	query = strings.ToLower(strings.TrimSpace(query))
	if len(query) < 2 {
		return nil
	}

	// Track in Redis sorted set for first 2 characters
	key := fmt.Sprintf("autocomplete:%s:%s", tenantID.String(), query[:2])

	// Increment score (popularity)
	err := s.redis.ZIncrBy(ctx, key, 1, query).Err()
	if err != nil {
		return err
	}

	// Set TTL (30 days)
	s.redis.Expire(ctx, key, 30*24*time.Hour)

	// Keep only top 100 suggestions per prefix
	s.redis.ZRemRangeByRank(ctx, key, 0, -101)

	return nil
}

// IndexCourseForAutocomplete indexes a course name for autocomplete
func (s *SearchService) IndexCourseForAutocomplete(ctx context.Context, tenantID uuid.UUID, courseName string) error {
	return s.indexTermForAutocomplete(ctx, tenantID, courseName)
}

// IndexPropertyForAutocomplete indexes a property title for autocomplete
func (s *SearchService) IndexPropertyForAutocomplete(ctx context.Context, tenantID uuid.UUID, propertyTitle string) error {
	return s.indexTermForAutocomplete(ctx, tenantID, propertyTitle)
}

// IndexClassifiedAdForAutocomplete indexes a classified ad title for autocomplete
func (s *SearchService) IndexClassifiedAdForAutocomplete(ctx context.Context, tenantID uuid.UUID, adTitle string) error {
	return s.indexTermForAutocomplete(ctx, tenantID, adTitle)
}

// indexTermForAutocomplete indexes a term in Redis sorted set
func (s *SearchService) indexTermForAutocomplete(ctx context.Context, tenantID uuid.UUID, term string) error {
	term = strings.ToLower(strings.TrimSpace(term))
	if len(term) < 2 {
		return nil
	}

	// Index with multiple prefixes for better matching
	words := strings.Fields(term)
	for _, word := range words {
		if len(word) < 2 {
			continue
		}

		key := fmt.Sprintf("autocomplete:%s:%s", tenantID.String(), word[:2])

		// Add to sorted set with initial score of 0
		err := s.redis.ZAdd(ctx, key, redis.Z{
			Score:  0,
			Member: word,
		}).Err()

		if err != nil {
			return err
		}

		// Set TTL
		s.redis.Expire(ctx, key, 30*24*time.Hour)
	}

	return nil
}

// RebuildAutocompleteIndex rebuilds autocomplete index for a tenant
func (s *SearchService) RebuildAutocompleteIndex(ctx context.Context, tenantID uuid.UUID) error {
	// Clear existing autocomplete keys
	pattern := fmt.Sprintf("autocomplete:%s:*", tenantID.String())
	iter := s.redis.Scan(ctx, 0, pattern, 1000).Iterator()

	for iter.Next(ctx) {
		s.redis.Del(ctx, iter.Val())
	}

	if err := iter.Err(); err != nil {
		return err
	}

	// Index all courses
	var courses []models.Course
	if err := s.db.Where("tenant_id = ? AND deleted_at IS NULL", tenantID).Find(&courses).Error; err != nil {
		return err
	}

	for _, course := range courses {
		s.IndexCourseForAutocomplete(ctx, tenantID, course.Title)
	}

	// Index all properties
	var properties []models.Property
	if err := s.db.Where("tenant_id = ? AND deleted_at IS NULL", tenantID).Find(&properties).Error; err != nil {
		return err
	}

	for _, property := range properties {
		s.IndexPropertyForAutocomplete(ctx, tenantID, property.Title)
	}

	// Index all classified ads
	var classifiedAds []models.ClassifiedAd
	if err := s.db.Where("tenant_id = ? AND deleted_at IS NULL AND status = ?", tenantID, "active").Find(&classifiedAds).Error; err != nil {
		return err
	}

	for _, ad := range classifiedAds {
		s.IndexClassifiedAdForAutocomplete(ctx, tenantID, ad.Title)
	}

	return nil
}

// Helper functions

func sortByRank(results []SearchResult) {
	// Simple bubble sort by rank (descending)
	n := len(results)
	for i := 0; i < n-1; i++ {
		for j := 0; j < n-i-1; j++ {
			if results[j].Rank < results[j+1].Rank {
				results[j], results[j+1] = results[j+1], results[j]
			}
		}
	}
}
