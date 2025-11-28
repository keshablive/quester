// CacheService provides entity caching with single-flight deduplication
// Feature: 007-api-performance-caching (T006, T007)
package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/cache"
	"github.com/keshablive/quester/internal/framework/metrics"
	"github.com/keshablive/quester/internal/models"
	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/singleflight"
)

// Cache TTL constants
const (
	CourseTTL      = 5 * time.Minute  // Course cache TTL
	QuestTTL       = 5 * time.Minute  // Quest cache TTL
	UserProfileTTL = 10 * time.Minute // User profile cache TTL
)

// Cache entity types for metrics
const (
	EntityCourse = "course"
	EntityQuest  = "quest"
	EntityUser   = "user"
)

// Cache error types for metrics
const (
	ErrorTypeTimeout       = "timeout"
	ErrorTypeConnection    = "connection"
	ErrorTypeSerialization = "serialization"
)

// CacheService interface defines cache operations
type CacheServiceInterface interface {
	// Course operations
	GetCourse(ctx context.Context, tenantID, courseID uuid.UUID) (*models.Course, bool, error)
	SetCourse(ctx context.Context, tenantID uuid.UUID, course *models.Course) error
	GetCourseList(ctx context.Context, tenantID uuid.UUID, offset, limit int) ([]models.Course, bool, error)
	SetCourseList(ctx context.Context, tenantID uuid.UUID, offset, limit int, courses []models.Course) error
	InvalidateCourse(ctx context.Context, tenantID, courseID uuid.UUID) error
	InvalidateCourseList(ctx context.Context, tenantID uuid.UUID) error

	// Quest operations
	GetQuest(ctx context.Context, tenantID, questID uuid.UUID) (*models.Quest, bool, error)
	SetQuest(ctx context.Context, tenantID uuid.UUID, quest *models.Quest) error
	GetQuestList(ctx context.Context, tenantID uuid.UUID, offset, limit int) ([]models.Quest, bool, error)
	SetQuestList(ctx context.Context, tenantID uuid.UUID, offset, limit int, quests []models.Quest) error
	InvalidateQuest(ctx context.Context, tenantID, questID uuid.UUID) error
	InvalidateQuestList(ctx context.Context, tenantID uuid.UUID) error

	// User operations
	GetUser(ctx context.Context, tenantID, userID uuid.UUID) (*models.User, bool, error)
	SetUser(ctx context.Context, tenantID uuid.UUID, user *models.User) error
	GetUsers(ctx context.Context, tenantID uuid.UUID, userIDs []uuid.UUID) (map[uuid.UUID]*models.User, error)
	InvalidateUser(ctx context.Context, tenantID, userID uuid.UUID) error

	// Generic single-flight fetch
	GetOrFetch(ctx context.Context, key string, ttl time.Duration, fetch func() (interface{}, error)) (interface{}, error)

	// Health check
	Ping(ctx context.Context) error
}

// CacheService implements entity caching with single-flight deduplication
type CacheService struct {
	client *redis.Client
	group  singleflight.Group
}

// NewCacheService creates a new cache service
func NewCacheService(client *redis.Client) *CacheService {
	return &CacheService{
		client: client,
	}
}

// NewCacheServiceFromGlobal creates a new cache service using the global cache client
func NewCacheServiceFromGlobal() *CacheService {
	return &CacheService{
		client: cache.Client,
	}
}

// buildKey constructs a cache key following the pattern: quester:{tenant}:{entity}:{id}
// T007: Cache key builder following tenant-scoped pattern
func buildKey(tenantID uuid.UUID, entity string, id string) string {
	return fmt.Sprintf("quester:%s:%s:%s", tenantID.String(), entity, id)
}

// buildListKey constructs a cache key for list operations: quester:{tenant}:{entity}:list:{offset}:{limit}
func buildListKey(tenantID uuid.UUID, entity string, offset, limit int) string {
	return fmt.Sprintf("quester:%s:%s:list:%d:%d", tenantID.String(), entity, offset, limit)
}

// buildAllListsPattern returns a pattern to match all list keys for an entity
func buildAllListsPattern(tenantID uuid.UUID, entity string) string {
	return fmt.Sprintf("quester:%s:%s:list:*", tenantID.String(), entity)
}

// isAvailable checks if the cache client is available (007-api-performance-caching T037)
func (s *CacheService) isAvailable() bool {
	return s != nil && s.client != nil
}

// Ping checks if Redis is available
func (s *CacheService) Ping(ctx context.Context) error {
	if s.client == nil {
		return errors.New("cache client not initialized")
	}
	return s.client.Ping(ctx).Err()
}

// ============================================================================
// Course Operations (T011, T012)
// ============================================================================

// GetCourse retrieves a course from cache (007-api-performance-caching T037 - graceful fallback)
func (s *CacheService) GetCourse(ctx context.Context, tenantID, courseID uuid.UUID) (*models.Course, bool, error) {
	// T037: Graceful fallback when cache unavailable
	if !s.isAvailable() {
		return nil, false, nil // Return cache miss, callers fall back to DB
	}

	start := time.Now()
	key := buildKey(tenantID, EntityCourse, courseID.String())

	data, err := s.client.Get(ctx, key).Bytes()
	duration := time.Since(start).Seconds()
	metrics.RecordCacheLatency("get", EntityCourse, duration)

	if err == redis.Nil {
		metrics.RecordCacheMiss(EntityCourse)
		return nil, false, nil
	}
	if err != nil {
		metrics.RecordCacheError(EntityCourse, classifyError(err))
		return nil, false, err
	}

	var course models.Course
	if err := json.Unmarshal(data, &course); err != nil {
		metrics.RecordCacheError(EntityCourse, ErrorTypeSerialization)
		return nil, false, err
	}

	metrics.RecordCacheHit(EntityCourse)
	return &course, true, nil
}

// SetCourse stores a course in cache (007-api-performance-caching T037 - graceful fallback)
func (s *CacheService) SetCourse(ctx context.Context, tenantID uuid.UUID, course *models.Course) error {
	// T037: Graceful fallback when cache unavailable
	if !s.isAvailable() {
		return nil // Silently skip caching
	}

	start := time.Now()
	key := buildKey(tenantID, EntityCourse, course.ID.String())

	data, err := json.Marshal(course)
	if err != nil {
		metrics.RecordCacheError(EntityCourse, ErrorTypeSerialization)
		return err
	}

	err = s.client.Set(ctx, key, data, CourseTTL).Err()
	duration := time.Since(start).Seconds()
	metrics.RecordCacheLatency("set", EntityCourse, duration)

	if err != nil {
		metrics.RecordCacheError(EntityCourse, classifyError(err))
	}
	return err
}

// GetCourseList retrieves a list of courses from cache
// GetCourseList retrieves a list of courses from cache (007-api-performance-caching T037)
func (s *CacheService) GetCourseList(ctx context.Context, tenantID uuid.UUID, offset, limit int) ([]models.Course, bool, error) {
	if !s.isAvailable() {
		return nil, false, nil
	}

	start := time.Now()
	key := buildListKey(tenantID, EntityCourse, offset, limit)

	data, err := s.client.Get(ctx, key).Bytes()
	duration := time.Since(start).Seconds()
	metrics.RecordCacheLatency("get", EntityCourse, duration)

	if err == redis.Nil {
		metrics.RecordCacheMiss(EntityCourse)
		return nil, false, nil
	}
	if err != nil {
		metrics.RecordCacheError(EntityCourse, classifyError(err))
		return nil, false, err
	}

	var courses []models.Course
	if err := json.Unmarshal(data, &courses); err != nil {
		metrics.RecordCacheError(EntityCourse, ErrorTypeSerialization)
		return nil, false, err
	}

	metrics.RecordCacheHit(EntityCourse)
	return courses, true, nil
}

// SetCourseList stores a list of courses in cache (007-api-performance-caching T037)
func (s *CacheService) SetCourseList(ctx context.Context, tenantID uuid.UUID, offset, limit int, courses []models.Course) error {
	if !s.isAvailable() {
		return nil
	}

	start := time.Now()
	key := buildListKey(tenantID, EntityCourse, offset, limit)

	data, err := json.Marshal(courses)
	if err != nil {
		metrics.RecordCacheError(EntityCourse, ErrorTypeSerialization)
		return err
	}

	err = s.client.Set(ctx, key, data, CourseTTL).Err()
	duration := time.Since(start).Seconds()
	metrics.RecordCacheLatency("set", EntityCourse, duration)

	if err != nil {
		metrics.RecordCacheError(EntityCourse, classifyError(err))
	}
	return err
}

// InvalidateCourse removes a course from cache and invalidates list caches (007-api-performance-caching T037)
func (s *CacheService) InvalidateCourse(ctx context.Context, tenantID, courseID uuid.UUID) error {
	if !s.isAvailable() {
		return nil
	}

	start := time.Now()
	key := buildKey(tenantID, EntityCourse, courseID.String())

	err := s.client.Del(ctx, key).Err()
	duration := time.Since(start).Seconds()
	metrics.RecordCacheLatency("delete", EntityCourse, duration)

	if err != nil {
		metrics.RecordCacheError(EntityCourse, classifyError(err))
		return err
	}

	// Also invalidate course lists for this tenant
	return s.InvalidateCourseList(ctx, tenantID)
}

// InvalidateCourseList removes all course list caches for a tenant (007-api-performance-caching T037)
func (s *CacheService) InvalidateCourseList(ctx context.Context, tenantID uuid.UUID) error {
	if !s.isAvailable() {
		return nil
	}

	start := time.Now()
	pattern := buildAllListsPattern(tenantID, EntityCourse)

	// Use SCAN to find and delete matching keys (safer than KEYS in production)
	iter := s.client.Scan(ctx, 0, pattern, 100).Iterator()
	for iter.Next(ctx) {
		if err := s.client.Del(ctx, iter.Val()).Err(); err != nil {
			metrics.RecordCacheError(EntityCourse, classifyError(err))
			// Continue deleting other keys
		}
	}

	duration := time.Since(start).Seconds()
	metrics.RecordCacheLatency("delete", EntityCourse, duration)

	return iter.Err()
}

// ============================================================================
// Quest Operations (T013, T014)
// ============================================================================

// GetQuest retrieves a quest from cache (007-api-performance-caching T037)
func (s *CacheService) GetQuest(ctx context.Context, tenantID, questID uuid.UUID) (*models.Quest, bool, error) {
	if !s.isAvailable() {
		return nil, false, nil
	}

	start := time.Now()
	key := buildKey(tenantID, EntityQuest, questID.String())

	data, err := s.client.Get(ctx, key).Bytes()
	duration := time.Since(start).Seconds()
	metrics.RecordCacheLatency("get", EntityQuest, duration)

	if err == redis.Nil {
		metrics.RecordCacheMiss(EntityQuest)
		return nil, false, nil
	}
	if err != nil {
		metrics.RecordCacheError(EntityQuest, classifyError(err))
		return nil, false, err
	}

	var quest models.Quest
	if err := json.Unmarshal(data, &quest); err != nil {
		metrics.RecordCacheError(EntityQuest, ErrorTypeSerialization)
		return nil, false, err
	}

	metrics.RecordCacheHit(EntityQuest)
	return &quest, true, nil
}

// SetQuest stores a quest in cache (007-api-performance-caching T037)
func (s *CacheService) SetQuest(ctx context.Context, tenantID uuid.UUID, quest *models.Quest) error {
	if !s.isAvailable() {
		return nil
	}

	start := time.Now()
	key := buildKey(tenantID, EntityQuest, quest.ID.String())

	data, err := json.Marshal(quest)
	if err != nil {
		metrics.RecordCacheError(EntityQuest, ErrorTypeSerialization)
		return err
	}

	err = s.client.Set(ctx, key, data, QuestTTL).Err()
	duration := time.Since(start).Seconds()
	metrics.RecordCacheLatency("set", EntityQuest, duration)

	if err != nil {
		metrics.RecordCacheError(EntityQuest, classifyError(err))
	}
	return err
}

// GetQuestList retrieves a list of quests from cache
// GetQuestList retrieves a list of quests from cache (007-api-performance-caching T037)
func (s *CacheService) GetQuestList(ctx context.Context, tenantID uuid.UUID, offset, limit int) ([]models.Quest, bool, error) {
	if !s.isAvailable() {
		return nil, false, nil
	}

	start := time.Now()
	key := buildListKey(tenantID, EntityQuest, offset, limit)

	data, err := s.client.Get(ctx, key).Bytes()
	duration := time.Since(start).Seconds()
	metrics.RecordCacheLatency("get", EntityQuest, duration)

	if err == redis.Nil {
		metrics.RecordCacheMiss(EntityQuest)
		return nil, false, nil
	}
	if err != nil {
		metrics.RecordCacheError(EntityQuest, classifyError(err))
		return nil, false, err
	}

	var quests []models.Quest
	if err := json.Unmarshal(data, &quests); err != nil {
		metrics.RecordCacheError(EntityQuest, ErrorTypeSerialization)
		return nil, false, err
	}

	metrics.RecordCacheHit(EntityQuest)
	return quests, true, nil
}

// SetQuestList stores a list of quests in cache (007-api-performance-caching T037)
func (s *CacheService) SetQuestList(ctx context.Context, tenantID uuid.UUID, offset, limit int, quests []models.Quest) error {
	if !s.isAvailable() {
		return nil
	}

	start := time.Now()
	key := buildListKey(tenantID, EntityQuest, offset, limit)

	data, err := json.Marshal(quests)
	if err != nil {
		metrics.RecordCacheError(EntityQuest, ErrorTypeSerialization)
		return err
	}

	err = s.client.Set(ctx, key, data, QuestTTL).Err()
	duration := time.Since(start).Seconds()
	metrics.RecordCacheLatency("set", EntityQuest, duration)

	if err != nil {
		metrics.RecordCacheError(EntityQuest, classifyError(err))
	}
	return err
}

// InvalidateQuest removes a quest from cache and invalidates list caches (007-api-performance-caching T037)
func (s *CacheService) InvalidateQuest(ctx context.Context, tenantID, questID uuid.UUID) error {
	if !s.isAvailable() {
		return nil
	}

	start := time.Now()
	key := buildKey(tenantID, EntityQuest, questID.String())

	err := s.client.Del(ctx, key).Err()
	duration := time.Since(start).Seconds()
	metrics.RecordCacheLatency("delete", EntityQuest, duration)

	if err != nil {
		metrics.RecordCacheError(EntityQuest, classifyError(err))
		return err
	}

	// Also invalidate quest lists for this tenant
	return s.InvalidateQuestList(ctx, tenantID)
}

// InvalidateQuestList removes all quest list caches for a tenant (007-api-performance-caching T037)
func (s *CacheService) InvalidateQuestList(ctx context.Context, tenantID uuid.UUID) error {
	if !s.isAvailable() {
		return nil
	}

	start := time.Now()
	pattern := buildAllListsPattern(tenantID, EntityQuest)

	iter := s.client.Scan(ctx, 0, pattern, 100).Iterator()
	for iter.Next(ctx) {
		if err := s.client.Del(ctx, iter.Val()).Err(); err != nil {
			metrics.RecordCacheError(EntityQuest, classifyError(err))
		}
	}

	duration := time.Since(start).Seconds()
	metrics.RecordCacheLatency("delete", EntityQuest, duration)

	return iter.Err()
}

// ============================================================================
// User Operations (T019, T020)
// ============================================================================

// GetUser retrieves a user profile from cache (007-api-performance-caching T037)
func (s *CacheService) GetUser(ctx context.Context, tenantID, userID uuid.UUID) (*models.User, bool, error) {
	if !s.isAvailable() {
		return nil, false, nil
	}

	start := time.Now()
	key := buildKey(tenantID, EntityUser, userID.String())

	data, err := s.client.Get(ctx, key).Bytes()
	duration := time.Since(start).Seconds()
	metrics.RecordCacheLatency("get", EntityUser, duration)

	if err == redis.Nil {
		metrics.RecordCacheMiss(EntityUser)
		return nil, false, nil
	}
	if err != nil {
		metrics.RecordCacheError(EntityUser, classifyError(err))
		return nil, false, err
	}

	var user models.User
	if err := json.Unmarshal(data, &user); err != nil {
		metrics.RecordCacheError(EntityUser, ErrorTypeSerialization)
		return nil, false, err
	}

	metrics.RecordCacheHit(EntityUser)
	return &user, true, nil
}

// SetUser stores a user profile in cache (007-api-performance-caching T037)
func (s *CacheService) SetUser(ctx context.Context, tenantID uuid.UUID, user *models.User) error {
	if !s.isAvailable() {
		return nil
	}

	start := time.Now()
	key := buildKey(tenantID, EntityUser, user.ID.String())

	data, err := json.Marshal(user)
	if err != nil {
		metrics.RecordCacheError(EntityUser, ErrorTypeSerialization)
		return err
	}

	err = s.client.Set(ctx, key, data, UserProfileTTL).Err()
	duration := time.Since(start).Seconds()
	metrics.RecordCacheLatency("set", EntityUser, duration)

	if err != nil {
		metrics.RecordCacheError(EntityUser, classifyError(err))
	}
	return err
}

// GetUsers retrieves multiple user profiles from cache using MGET (T020, T037)
func (s *CacheService) GetUsers(ctx context.Context, tenantID uuid.UUID, userIDs []uuid.UUID) (map[uuid.UUID]*models.User, error) {
	if len(userIDs) == 0 {
		return make(map[uuid.UUID]*models.User), nil
	}

	// T037: Graceful fallback when cache unavailable
	if !s.isAvailable() {
		return make(map[uuid.UUID]*models.User), nil
	}

	start := time.Now()

	// Build keys for all user IDs
	keys := make([]string, len(userIDs))
	for i, id := range userIDs {
		keys[i] = buildKey(tenantID, EntityUser, id.String())
	}

	// Use MGET for batch retrieval
	results, err := s.client.MGet(ctx, keys...).Result()
	duration := time.Since(start).Seconds()
	metrics.RecordCacheLatency("batch_get", EntityUser, duration)

	if err != nil {
		metrics.RecordCacheError(EntityUser, classifyError(err))
		return nil, err
	}

	// Parse results
	users := make(map[uuid.UUID]*models.User)
	for i, result := range results {
		if result == nil {
			metrics.RecordCacheMiss(EntityUser)
			continue
		}

		data, ok := result.(string)
		if !ok {
			continue
		}

		var user models.User
		if err := json.Unmarshal([]byte(data), &user); err != nil {
			metrics.RecordCacheError(EntityUser, ErrorTypeSerialization)
			continue
		}

		metrics.RecordCacheHit(EntityUser)
		users[userIDs[i]] = &user
	}

	return users, nil
}

// InvalidateUser removes a user profile from cache (007-api-performance-caching T037)
func (s *CacheService) InvalidateUser(ctx context.Context, tenantID, userID uuid.UUID) error {
	if !s.isAvailable() {
		return nil
	}

	start := time.Now()
	key := buildKey(tenantID, EntityUser, userID.String())

	err := s.client.Del(ctx, key).Err()
	duration := time.Since(start).Seconds()
	metrics.RecordCacheLatency("delete", EntityUser, duration)

	if err != nil {
		metrics.RecordCacheError(EntityUser, classifyError(err))
	}
	return err
}

// ============================================================================
// Generic Single-Flight Operations
// ============================================================================

// GetOrFetch provides single-flight deduplication for cache misses (007-api-performance-caching T037)
// Only one concurrent request will execute fetch(); others wait and share result
func (s *CacheService) GetOrFetch(ctx context.Context, key string, ttl time.Duration, fetch func() (interface{}, error)) (interface{}, error) {
	// T037: Graceful fallback when cache unavailable - just call fetch directly
	if !s.isAvailable() {
		return fetch()
	}

	// Try cache first
	data, err := s.client.Get(ctx, key).Bytes()
	if err == nil {
		return data, nil
	}
	if err != redis.Nil {
		// Real error, but continue to fetch from source
	}

	// Single-flight: only one request fetches
	result, err, _ := s.group.Do(key, func() (interface{}, error) {
		// Double-check cache (another goroutine might have populated it)
		if data, err := s.client.Get(ctx, key).Bytes(); err == nil {
			return data, nil
		}

		// Fetch from source
		data, err := fetch()
		if err != nil {
			return nil, err
		}

		// Store in cache (best effort)
		jsonData, err := json.Marshal(data)
		if err != nil {
			return data, nil // Return data even if we can't cache it
		}

		s.client.Set(ctx, key, jsonData, ttl)
		return data, nil
	})

	return result, err
}

// ============================================================================
// Helper Functions
// ============================================================================

// classifyError categorizes Redis errors for metrics
func classifyError(err error) string {
	if err == nil {
		return ""
	}

	errStr := err.Error()
	if containsStr(errStr, "timeout") || containsStr(errStr, "deadline") {
		return ErrorTypeTimeout
	}
	if containsStr(errStr, "connection") || containsStr(errStr, "connect") || containsStr(errStr, "dial") {
		return ErrorTypeConnection
	}
	return "unknown"
}

// containsStr checks if s contains substr
func containsStr(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		(len(s) > 0 && len(substr) > 0 && findSubstr(s, substr)))
}

func findSubstr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
