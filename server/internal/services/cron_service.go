package services

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2/log"
	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
)

// CronService handles scheduled tasks for properties and classified ads
type CronService struct {
	db                  *gorm.DB
	propertyService     *PropertyService
	classifiedAdService *ClassifiedAdService
	analyticsService    *AnalyticsService
	notificationService *NotificationService // T802: Inject notification service
	leaderboardService  *LeaderboardService  // T056: For social leaderboard sync
	runInterval         time.Duration
	stopChan            chan bool
	leaderboardStopChan chan bool // T056: Separate stop channel for leaderboard sync
	isRunning           bool
}

// CronJobStats represents statistics for cron job execution
type CronJobStats struct {
	LastRunAt             time.Time `json:"last_run_at"`
	NextRunAt             time.Time `json:"next_run_at"`
	PropertiesExpired     int       `json:"properties_expired"`
	ClassifiedAdsExpired  int       `json:"classified_ads_expired"`
	AnalyticsSummaries    int       `json:"analytics_summaries"`
	QuestReminders        int       `json:"quest_reminders"`        // T805: Add metric
	CourseDeadlineAlerts  int       `json:"course_deadline_alerts"` // T805: Add metric
	TotalExecutions       int       `json:"total_executions"`
	LastExecutionDuration string    `json:"last_execution_duration"`
	LastError             string    `json:"last_error,omitempty"`
}

// NewCronService creates a new cron service instance
func NewCronService(db *gorm.DB, propertyService *PropertyService, classifiedAdService *ClassifiedAdService, analyticsService *AnalyticsService) *CronService {
	return &CronService{
		db:                  db,
		propertyService:     propertyService,
		classifiedAdService: classifiedAdService,
		analyticsService:    analyticsService,
		notificationService: NewNotificationService(db), // T802: Initialize notification service
		runInterval:         24 * time.Hour,             // Run once daily at 01:00 UTC
		stopChan:            make(chan bool),
		leaderboardStopChan: make(chan bool), // T056: Initialize leaderboard stop channel
		isRunning:           false,
	}
}

// SetLeaderboardService sets the leaderboard service for T056 social leaderboard sync
func (s *CronService) SetLeaderboardService(ls *LeaderboardService) {
	s.leaderboardService = ls
}

// Start starts the cron service
func (s *CronService) Start() {
	if s.isRunning {
		log.Warn("Cron service is already running")
		return
	}

	s.isRunning = true
	log.Info("Starting cron service for property and classified ad expiration")

	// Start the cron loop
	go s.runCronLoop()

	// T056: Start leaderboard sync loop (every 5 minutes)
	if s.leaderboardService != nil {
		go s.runLeaderboardSyncLoop()
	}
}

// Stop stops the cron service
func (s *CronService) Stop() {
	if !s.isRunning {
		log.Warn("Cron service is not running")
		return
	}

	log.Info("Stopping cron service")
	s.stopChan <- true

	// T056: Stop leaderboard sync if running
	if s.leaderboardService != nil {
		s.leaderboardStopChan <- true
	}

	s.isRunning = false
}

// runCronLoop is the main cron loop that runs scheduled tasks
func (s *CronService) runCronLoop() {
	// Calculate time until next 01:00 UTC
	nextRun := s.calculateNextRun()
	ticker := time.NewTicker(time.Until(nextRun))
	defer ticker.Stop()

	log.Infof("Next cron run scheduled at: %v", nextRun)

	for {
		select {
		case <-ticker.C:
			// Run the expiration job
			s.runExpirationJob()

			// Reset ticker for next day at 01:00 UTC
			nextRun = s.calculateNextRun()
			ticker.Reset(time.Until(nextRun))
			log.Infof("Next cron run scheduled at: %v", nextRun)

		case <-s.stopChan:
			log.Info("Cron service stopped")
			return
		}
	}
}

// calculateNextRun calculates the next 01:00 UTC time
func (s *CronService) calculateNextRun() time.Time {
	now := time.Now().UTC()
	next := time.Date(now.Year(), now.Month(), now.Day(), 1, 0, 0, 0, time.UTC)

	// If it's already past 01:00 today, schedule for tomorrow
	if now.After(next) {
		next = next.Add(24 * time.Hour)
	}

	return next
}

// T056: runLeaderboardSyncLoop syncs social leaderboards to database every 5 minutes
func (s *CronService) runLeaderboardSyncLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	log.Info("Starting social leaderboard sync (every 5 minutes)")

	for {
		select {
		case <-ticker.C:
			s.syncSocialLeaderboards()

		case <-s.leaderboardStopChan:
			log.Info("Leaderboard sync stopped")
			return
		}
	}
}

// T056: syncSocialLeaderboards syncs Redis leaderboards to database for all tenants
func (s *CronService) syncSocialLeaderboards() {
	if s.leaderboardService == nil {
		return
	}

	startTime := time.Now()
	ctx := context.Background()

	// Get all tenant IDs
	var tenantIDs []uuid.UUID
	if err := s.db.Model(&struct {
		ID uuid.UUID `gorm:"column:id;type:uuid"`
	}{}).
		Table("tenants").
		Pluck("id", &tenantIDs).Error; err != nil {
		log.Errorf("Failed to get tenant IDs for leaderboard sync: %v", err)
		return
	}

	// Sync each tenant's social leaderboards
	for _, tenantID := range tenantIDs {
		// Sync all-time leaderboard
		if err := s.leaderboardService.SyncToDatabase(ctx, tenantID, models.LeaderboardTypeCategory, models.LeaderboardPeriodAllTime, SocialLeaderboardCategory); err != nil {
			log.Errorf("Failed to sync all-time social leaderboard for tenant %s: %v", tenantID.String(), err)
		}

		// Sync monthly leaderboard
		if err := s.leaderboardService.SyncToDatabase(ctx, tenantID, models.LeaderboardTypeCategory, models.LeaderboardPeriodMonthly, SocialLeaderboardCategory); err != nil {
			log.Errorf("Failed to sync monthly social leaderboard for tenant %s: %v", tenantID.String(), err)
		}
	}

	duration := time.Since(startTime)
	log.Debugf("Social leaderboard sync completed in %v for %d tenants", duration, len(tenantIDs))
}

// runExpirationJob runs the expiration job for properties and classified ads
func (s *CronService) runExpirationJob() {
	startTime := time.Now()
	ctx := context.Background()

	log.Info("Running expiration job...")

	propertiesExpired := 0
	classifiedAdsExpired := 0

	// Get all tenants
	var tenantIDs []uuid.UUID
	if err := s.db.Model(&struct {
		ID uuid.UUID `gorm:"column:id;type:uuid"`
	}{}).
		Table("tenants").
		Pluck("id", &tenantIDs).Error; err != nil {
		log.Errorf("Failed to get tenant IDs: %v", err)
		return
	}

	// Process each tenant
	for _, tenantID := range tenantIDs {
		// Expire properties
		propertiesCount, err := s.expirePropertiesForTenant(ctx, tenantID)
		if err != nil {
			log.Errorf("Failed to expire properties for tenant %s: %v", tenantID.String(), err)
		} else {
			propertiesExpired += propertiesCount
		}

		// Expire classified ads
		adsCount, err := s.expireClassifiedAdsForTenant(ctx, tenantID)
		if err != nil {
			log.Errorf("Failed to expire classified ads for tenant %s: %v", tenantID.String(), err)
		} else {
			classifiedAdsExpired += adsCount
		}
	}

	duration := time.Since(startTime)
	log.Infof("Expiration job completed in %v: %d properties, %d classified ads expired",
		duration, propertiesExpired, classifiedAdsExpired)

	// Clean up old temporary files (OCR service)
	// This would be called if we have a reference to OCRService
	// s.ocrService.CleanupTempFiles(24 * time.Hour)
}

// expirePropertiesForTenant expires all expired properties for a tenant
func (s *CronService) expirePropertiesForTenant(ctx context.Context, tenantID uuid.UUID) (int, error) {
	properties, err := s.propertyService.GetExpiredProperties(ctx, tenantID)
	if err != nil {
		return 0, err
	}

	count := 0
	for _, property := range properties {
		if err := s.propertyService.ExpireProperty(ctx, property.ID); err != nil {
			log.Errorf("Failed to expire property %s: %v", property.ID.String(), err)
			continue
		}
		count++
	}

	if count > 0 {
		log.Infof("Expired %d properties for tenant %s", count, tenantID.String())
	}

	return count, nil
}

// expireClassifiedAdsForTenant expires all expired classified ads for a tenant
func (s *CronService) expireClassifiedAdsForTenant(ctx context.Context, tenantID uuid.UUID) (int, error) {
	ads, err := s.classifiedAdService.GetExpiredAds(ctx, tenantID)
	if err != nil {
		return 0, err
	}

	count := 0
	for _, ad := range ads {
		if err := s.classifiedAdService.ExpireAd(ctx, ad.ID); err != nil {
			log.Errorf("Failed to expire classified ad %s: %v", ad.ID.String(), err)
			continue
		}
		count++
	}

	if count > 0 {
		log.Infof("Expired %d classified ads for tenant %s", count, tenantID.String())
	}

	return count, nil
}

// RunManual manually triggers the expiration job (for testing/admin purposes)
func (s *CronService) RunManual() (int, int, error) {
	startTime := time.Now()
	ctx := context.Background()

	log.Info("Running manual expiration job...")

	propertiesExpired := 0
	classifiedAdsExpired := 0

	// Get all tenants
	var tenantIDs []uuid.UUID
	if err := s.db.Model(&struct {
		ID uuid.UUID `gorm:"column:id;type:uuid"`
	}{}).
		Table("tenants").
		Pluck("id", &tenantIDs).Error; err != nil {
		return 0, 0, err
	}

	// Process each tenant
	for _, tenantID := range tenantIDs {
		propertiesCount, _ := s.expirePropertiesForTenant(ctx, tenantID)
		propertiesExpired += propertiesCount

		adsCount, _ := s.expireClassifiedAdsForTenant(ctx, tenantID)
		classifiedAdsExpired += adsCount
	}

	duration := time.Since(startTime)
	log.Infof("Manual expiration job completed in %v: %d properties, %d classified ads expired",
		duration, propertiesExpired, classifiedAdsExpired)

	return propertiesExpired, classifiedAdsExpired, nil
}

// GetStats returns statistics about the cron service
func (s *CronService) GetStats() *CronJobStats {
	return &CronJobStats{
		NextRunAt: s.calculateNextRun(),
		// Other stats would be tracked in a persistent store
	}
}

// IsRunning returns whether the cron service is currently running
func (s *CronService) IsRunning() bool {
	return s.isRunning
}

// ExpireSoonProperties returns properties that will expire within the given duration
func (s *CronService) ExpireSoonProperties(ctx context.Context, tenantID uint64, within time.Duration) ([]uint64, error) {
	var propertyIDs []uint64

	threshold := time.Now().Add(within)

	err := s.db.WithContext(ctx).
		Model(&struct {
			ID uint64 `gorm:"column:id"`
		}{}).
		Table("properties").
		Select("id").
		Where("tenant_id = ? AND deleted_at IS NULL AND status = ?", tenantID, "active").
		Where("expires_at <= ? AND expires_at > ?", threshold, time.Now()).
		Pluck("id", &propertyIDs).Error

	if err != nil {
		return nil, err
	}

	return propertyIDs, nil
}

// ExpireSoonClassifiedAds returns classified ads that will expire within the given duration
func (s *CronService) ExpireSoonClassifiedAds(ctx context.Context, tenantID uint64, within time.Duration) ([]uint64, error) {
	var adIDs []uint64

	threshold := time.Now().Add(within)

	err := s.db.WithContext(ctx).
		Model(&struct {
			ID uint64 `gorm:"column:id"`
		}{}).
		Table("classified_ads").
		Select("id").
		Where("tenant_id = ? AND deleted_at IS NULL AND status = ?", tenantID, "active").
		Where("expires_at <= ? AND expires_at > ?", threshold, time.Now()).
		Pluck("id", &adIDs).Error

	if err != nil {
		return nil, err
	}

	return adIDs, nil
}

// NotifyExpiringListings sends notifications for listings expiring soon
// This would integrate with the notification service
func (s *CronService) NotifyExpiringListings(ctx context.Context) error {
	log.Info("Checking for listings expiring soon...")

	// Get all tenants
	var tenantIDs []uint64
	if err := s.db.Model(&struct {
		ID uint64 `gorm:"column:id"`
	}{}).
		Table("tenants").
		Pluck("id", &tenantIDs).Error; err != nil {
		return err
	}

	// Check for properties expiring in 7 days
	for _, tenantID := range tenantIDs {
		propertyIDs, err := s.ExpireSoonProperties(ctx, tenantID, 7*24*time.Hour)
		if err != nil {
			log.Errorf("Failed to check expiring properties for tenant %d: %v", tenantID, err)
			continue
		}

		if len(propertyIDs) > 0 {
			log.Infof("Tenant %d has %d properties expiring in 7 days", tenantID, len(propertyIDs))
			// Note: Notification integration pending - will use NotificationService.SendExpirationWarning()
		}

		adIDs, err := s.ExpireSoonClassifiedAds(ctx, tenantID, 7*24*time.Hour)
		if err != nil {
			log.Errorf("Failed to check expiring ads for tenant %d: %v", tenantID, err)
			continue
		}

		if len(adIDs) > 0 {
			log.Infof("Tenant %d has %d classified ads expiring in 7 days", tenantID, len(adIDs))
			// Note: Notification integration pending - will use NotificationService.SendExpirationWarning()
		}
	}

	return nil
}

// ScheduleTask schedules a custom task to run at a specific time
type ScheduledTask struct {
	Name      string
	RunAt     time.Time
	Task      func() error
	Recurring bool
	Interval  time.Duration
}

// ExecuteScheduledTask executes a scheduled task
func (s *CronService) ExecuteScheduledTask(task *ScheduledTask) error {
	log.Infof("Executing scheduled task: %s", task.Name)

	if err := task.Task(); err != nil {
		log.Errorf("Task %s failed: %v", task.Name, err)
		return err
	}

	log.Infof("Task %s completed successfully", task.Name)
	return nil
}

// RunDailyAnalyticsAggregation runs daily analytics pre-aggregation
// Should be scheduled to run at 00:30 UTC daily
func (s *CronService) RunDailyAnalyticsAggregation() error {
	log.Info("Running daily analytics aggregation...")
	ctx := context.Background()

	if err := s.analyticsService.PreAggregateDailySummaries(ctx); err != nil {
		log.Errorf("Daily analytics aggregation failed: %v", err)
		return err
	}

	log.Info("Daily analytics aggregation completed successfully")
	return nil
}

// RunWeeklyAnalyticsAggregation runs weekly analytics pre-aggregation
// Should be scheduled to run on Mondays at 01:00 UTC
func (s *CronService) RunWeeklyAnalyticsAggregation() error {
	log.Info("Running weekly analytics aggregation...")
	ctx := context.Background()

	if err := s.analyticsService.PreAggregateWeeklySummaries(ctx); err != nil {
		log.Errorf("Weekly analytics aggregation failed: %v", err)
		return err
	}

	log.Info("Weekly analytics aggregation completed successfully")
	return nil
}

// RunMonthlyAnalyticsAggregation runs monthly analytics pre-aggregation
// Should be scheduled to run on 1st of each month at 02:00 UTC
func (s *CronService) RunMonthlyAnalyticsAggregation() error {
	log.Info("Running monthly analytics aggregation...")
	ctx := context.Background()

	if err := s.analyticsService.PreAggregateMonthlySummaries(ctx); err != nil {
		log.Errorf("Monthly analytics aggregation failed: %v", err)
		return err
	}

	log.Info("Monthly analytics aggregation completed successfully")
	return nil
}

// StartAnalyticsAggregationScheduler starts the analytics aggregation cron jobs
func (s *CronService) StartAnalyticsAggregationScheduler() {
	log.Info("Starting analytics aggregation scheduler...")

	// Schedule daily aggregation at 00:30 UTC
	go func() {
		for {
			now := time.Now().UTC()
			next := time.Date(now.Year(), now.Month(), now.Day(), 0, 30, 0, 0, time.UTC)
			if now.After(next) {
				next = next.Add(24 * time.Hour)
			}

			time.Sleep(time.Until(next))
			if err := s.RunDailyAnalyticsAggregation(); err != nil {
				log.Errorf("Daily analytics aggregation error: %v", err)
			}
		}
	}()

	// Schedule weekly aggregation on Mondays at 01:00 UTC
	go func() {
		for {
			now := time.Now().UTC()
			daysUntilMonday := (8 - int(now.Weekday())) % 7
			if daysUntilMonday == 0 && now.Hour() >= 1 {
				daysUntilMonday = 7
			}

			next := time.Date(now.Year(), now.Month(), now.Day(), 1, 0, 0, 0, time.UTC).
				AddDate(0, 0, daysUntilMonday)

			time.Sleep(time.Until(next))
			if err := s.RunWeeklyAnalyticsAggregation(); err != nil {
				log.Errorf("Weekly analytics aggregation error: %v", err)
			}
		}
	}()

	// Schedule monthly aggregation on 1st of month at 02:00 UTC
	go func() {
		for {
			now := time.Now().UTC()
			next := time.Date(now.Year(), now.Month()+1, 1, 2, 0, 0, 0, time.UTC)

			time.Sleep(time.Until(next))
			if err := s.RunMonthlyAnalyticsAggregation(); err != nil {
				log.Errorf("Monthly analytics aggregation error: %v", err)
			}
		}
	}()

	log.Info("Analytics aggregation scheduler started successfully")
}

// SendQuestReminders sends notifications for quests ending within 7 days
// T803: Implement quest reminder notifications
func (s *CronService) SendQuestReminders(ctx context.Context) error {
	now := time.Now()
	sevenDaysFromNow := now.AddDate(0, 0, 7)

	// T805: Structured logging for quest reminders
	log.Infof("Starting quest reminder notifications: current_time=%s, deadline_window=%s",
		now.Format(time.RFC3339), sevenDaysFromNow.Format(time.RFC3339))

	// Get active quests ending within 7 days
	var quests []models.Quest
	if err := s.db.Where("status = ? AND end_date IS NOT NULL AND end_date > ? AND end_date <= ?",
		models.QuestStatusActive,
		now,
		sevenDaysFromNow,
	).Find(&quests).Error; err != nil {
		log.Errorf("Failed to fetch quests for reminders: error=%v", err)
		return err
	}

	if len(quests) == 0 {
		log.Info("No quests ending within 7 days, skipping reminders")
		return nil
	}

	// T805: Log quest count
	log.Infof("Found quests ending soon: count=%d", len(quests))

	reminderCount := 0

	// Send reminders for each quest
	for _, quest := range quests {
		daysLeft := int(quest.EndDate.Sub(now).Hours() / 24)

		// T805: Structured logging per quest
		log.Infof("Processing quest reminder: quest_id=%d, title=%s, end_date=%s, days_left=%d",
			quest.ID, quest.Title, quest.EndDate.Format(time.RFC3339), daysLeft)

		// Get all users (simplified - in production would query enrolled users)
		var users []models.User
		if err := s.db.Find(&users).Error; err != nil {
			log.Warnf("Failed to fetch users for quest=%d: error=%v", quest.ID, err)
			continue
		}

		// Send notification to each user
		for _, user := range users {
			title := "Quest Deadline Approaching"
			message := "Your quest '" + quest.Title + "' ends in " + string(rune(daysLeft+'0')) + " days!"

			_, err := s.notificationService.CreateNotification(
				ctx,
				user.TenantID.String(),
				user.ID.String(),
				models.NotificationTypeQuestReminder,
				title,
				message,
				"", // actionURL
				"", // iconURL
				models.NotificationPriorityNormal,
				[]string{models.NotificationChannelInApp, models.NotificationChannelPush},
				map[string]any{
					"quest_id":  quest.ID,
					"days_left": daysLeft,
					"end_date":  quest.EndDate.Format(time.RFC3339),
				},
			)

			if err != nil {
				// T805: Log failure but continue
				log.Warnf("Failed to send quest reminder: user_id=%s, quest_id=%d, error=%v",
					user.ID, quest.ID, err)
				continue
			}

			reminderCount++
		}
	}

	// T805: Log completion summary
	log.Infof("Quest reminders sent: total_reminders=%d, quests_processed=%d",
		reminderCount, len(quests))

	return nil
}

// SendCourseDeadlineNotifications sends notifications for courses with upcoming deadlines
// T804: Implement course deadline notifications
func (s *CronService) SendCourseDeadlineNotifications(ctx context.Context) error {
	// Note: Course deadline notification logic to be implemented (T804)
	// Will query enrollments where course.deadline < 7 days
	// For now, log that feature is pending
	log.Info("Course deadline notifications not yet implemented (T804)")
	return nil
}
