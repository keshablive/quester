package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// QueueService handles background job processing and offline sync
// CONSTITUTION: Mobile-Offline - Queue service for offline message queue
type QueueService struct {
	redis *redis.Client
}

// NewQueueService creates a new queue service instance
func NewQueueService(redisClient *redis.Client) *QueueService {
	return &QueueService{redis: redisClient}
}

// JobPriority represents job execution priority
type JobPriority int

const (
	PriorityLow      JobPriority = 1
	PriorityNormal   JobPriority = 5
	PriorityHigh     JobPriority = 10
	PriorityCritical JobPriority = 20
)

// Job represents a background job
type Job struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"`
	TenantID    string                 `json:"tenant_id"`
	UserID      uint                   `json:"user_id"`
	Payload     map[string]interface{} `json:"payload"`
	Priority    JobPriority            `json:"priority"`
	MaxRetries  int                    `json:"max_retries"`
	RetryCount  int                    `json:"retry_count"`
	CreatedAt   time.Time              `json:"created_at"`
	ScheduledAt time.Time              `json:"scheduled_at,omitempty"`
	ProcessedAt time.Time              `json:"processed_at,omitempty"`
	Status      string                 `json:"status"` // pending, processing, completed, failed
	Error       string                 `json:"error,omitempty"`
}

// Queue names by job type
const (
	QueueDefault        = "queue:default"
	QueueEmail          = "queue:email"
	QueueNotification   = "queue:notification"
	QueueVideoTranscode = "queue:video:transcode"
	QueueOfflineSync    = "queue:offline:sync"
	QueueAnalytics      = "queue:analytics"
)

// EnqueueJob adds a job to the queue
func (s *QueueService) EnqueueJob(ctx context.Context, job *Job) error {
	if job.ID == "" {
		job.ID = generateJobID()
	}

	if job.CreatedAt.IsZero() {
		job.CreatedAt = time.Now()
	}

	if job.Status == "" {
		job.Status = "pending"
	}

	if job.MaxRetries == 0 {
		job.MaxRetries = 3
	}

	// Serialize job
	jobData, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("failed to serialize job: %w", err)
	}

	// Determine queue based on job type
	queueName := s.getQueueName(job.Type)

	// Add to queue with priority (using sorted set)
	score := float64(job.Priority)
	if !job.ScheduledAt.IsZero() {
		// For scheduled jobs, use timestamp as score
		score = float64(job.ScheduledAt.Unix())
	}

	err = s.redis.ZAdd(ctx, queueName, redis.Z{
		Score:  score,
		Member: jobData,
	}).Err()

	if err != nil {
		return fmt.Errorf("failed to enqueue job: %w", err)
	}

	// Store job metadata for tracking
	s.storeJobMetadata(ctx, job)

	return nil
}

// DequeueJob retrieves the next job from a queue
func (s *QueueService) DequeueJob(ctx context.Context, queueName string) (*Job, error) {
	// Get highest priority job (or oldest scheduled job)
	now := float64(time.Now().Unix())

	result := s.redis.ZRangeByScore(ctx, queueName, &redis.ZRangeBy{
		Min:   "-inf",
		Max:   fmt.Sprintf("%f", now),
		Count: 1,
	})

	if result.Err() != nil {
		return nil, result.Err()
	}

	jobs := result.Val()
	if len(jobs) == 0 {
		return nil, errors.New("queue is empty")
	}

	// Remove from queue
	s.redis.ZRem(ctx, queueName, jobs[0])

	// Deserialize job
	var job Job
	if err := json.Unmarshal([]byte(jobs[0]), &job); err != nil {
		return nil, fmt.Errorf("failed to deserialize job: %w", err)
	}

	// Update status
	job.Status = "processing"
	job.ProcessedAt = time.Now()
	s.storeJobMetadata(ctx, &job)

	return &job, nil
}

// CompleteJob marks a job as completed
func (s *QueueService) CompleteJob(ctx context.Context, jobID string) error {
	key := fmt.Sprintf("job:%s", jobID)

	// Update status
	updates := map[string]interface{}{
		"status":       "completed",
		"processed_at": time.Now().Unix(),
	}

	return s.redis.HSet(ctx, key, updates).Err()
}

// FailJob marks a job as failed and optionally retries
func (s *QueueService) FailJob(ctx context.Context, job *Job, errMsg string) error {
	job.RetryCount++
	job.Error = errMsg

	// Check if we should retry
	if job.RetryCount < job.MaxRetries {
		// Exponential backoff: 2^retry_count minutes
		delayMinutes := 1 << job.RetryCount // 2, 4, 8, 16...
		job.ScheduledAt = time.Now().Add(time.Duration(delayMinutes) * time.Minute)
		job.Status = "pending"

		// Re-enqueue with delay
		return s.EnqueueJob(ctx, job)
	}

	// Max retries reached, mark as failed
	job.Status = "failed"
	return s.storeJobMetadata(ctx, job)
}

// GetJobStatus retrieves job status
func (s *QueueService) GetJobStatus(ctx context.Context, jobID string) (string, error) {
	key := fmt.Sprintf("job:%s", jobID)
	return s.redis.HGet(ctx, key, "status").Result()
}

// GetQueueLength returns the number of pending jobs in a queue
func (s *QueueService) GetQueueLength(ctx context.Context, queueName string) (int64, error) {
	return s.redis.ZCard(ctx, queueName).Result()
}

// PurgeQueue removes all jobs from a queue
func (s *QueueService) PurgeQueue(ctx context.Context, queueName string) error {
	return s.redis.Del(ctx, queueName).Err()
}

// ScheduleJob schedules a job for future execution
func (s *QueueService) ScheduleJob(ctx context.Context, job *Job, executeAt time.Time) error {
	job.ScheduledAt = executeAt
	return s.EnqueueJob(ctx, job)
}

// ProcessOfflineSync processes offline sync jobs for mobile clients
func (s *QueueService) ProcessOfflineSync(ctx context.Context, tenantID string, userID uint, syncData map[string]interface{}) error {
	job := &Job{
		Type:     "offline_sync",
		TenantID: tenantID,
		UserID:   userID,
		Payload:  syncData,
		Priority: PriorityHigh,
	}

	return s.EnqueueJob(ctx, job)
}

// ProcessEmailJob enqueues an email sending job
func (s *QueueService) ProcessEmailJob(ctx context.Context, tenantID string, userID uint, emailData map[string]interface{}) error {
	job := &Job{
		Type:     "send_email",
		TenantID: tenantID,
		UserID:   userID,
		Payload:  emailData,
		Priority: PriorityNormal,
	}

	return s.EnqueueJob(ctx, job)
}

// ProcessNotificationJob enqueues a push notification job
func (s *QueueService) ProcessNotificationJob(ctx context.Context, tenantID string, userID uint, notification map[string]interface{}) error {
	job := &Job{
		Type:     "send_notification",
		TenantID: tenantID,
		UserID:   userID,
		Payload:  notification,
		Priority: PriorityHigh,
	}

	return s.EnqueueJob(ctx, job)
}

// ProcessVideoTranscode enqueues a video transcoding job
func (s *QueueService) ProcessVideoTranscode(ctx context.Context, tenantID string, userID uint, videoData map[string]interface{}) error {
	job := &Job{
		Type:       "transcode_video",
		TenantID:   tenantID,
		UserID:     userID,
		Payload:    videoData,
		Priority:   PriorityNormal,
		MaxRetries: 5, // Video transcoding may need more retries
	}

	return s.EnqueueJob(ctx, job)
}

// Helper functions

func (s *QueueService) getQueueName(jobType string) string {
	switch jobType {
	case "send_email":
		return QueueEmail
	case "send_notification":
		return QueueNotification
	case "transcode_video":
		return QueueVideoTranscode
	case "offline_sync":
		return QueueOfflineSync
	case "analytics":
		return QueueAnalytics
	default:
		return QueueDefault
	}
}

func (s *QueueService) storeJobMetadata(ctx context.Context, job *Job) error {
	key := fmt.Sprintf("job:%s", job.ID)

	jobData, err := json.Marshal(job)
	if err != nil {
		return err
	}

	// Store with 7-day expiration
	return s.redis.Set(ctx, key, jobData, 7*24*time.Hour).Err()
}

func generateJobID() string {
	return fmt.Sprintf("job_%d", time.Now().UnixNano())
}

// Worker interface for processing jobs
type Worker interface {
	ProcessJob(ctx context.Context, job *Job) error
}

// StartWorker starts a worker to process jobs from a queue
func (s *QueueService) StartWorker(ctx context.Context, queueName string, worker Worker) error {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			job, err := s.DequeueJob(ctx, queueName)
			if err != nil {
				// Queue is empty or error occurred
				continue
			}

			// Process job
			if err := worker.ProcessJob(ctx, job); err != nil {
				s.FailJob(ctx, job, err.Error())
			} else {
				s.CompleteJob(ctx, job.ID)
			}
		}
	}
}
