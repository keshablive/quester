package routes

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/controllers"
	"github.com/keshablive/quester/internal/framework/middleware"
)

// SetupStreamRoutes sets up video streaming and recording routes
func SetupStreamRoutes(router fiber.Router, videoController *controllers.VideoStreamingController) {
	// Video Streaming routes (Feature #003 Phase 2 - T506, T507)
	streams := router.Group("/streams")

	// POST /api/v1/streams - Create new stream (requires auth)
	// T506: Creates stream with generated key, returns RTMP/HLS endpoints
	streams.Post("",
		middleware.FiberAuthMiddleware(),
		middleware.FiberRateLimitByIP(10, 1*time.Hour),
		videoController.CreateStream,
	)

	// POST /api/v1/streams/validate - RTMP auth callback (NO auth middleware)
	// T507: Called by nginx-rtmp on_publish, validates stream key
	streams.Post("/validate",
		middleware.FiberRateLimitByIP(1000, 1*time.Minute), // High rate for nginx callbacks
		videoController.ValidateStream,
	)

	// POST /api/v1/streams/publish-done - RTMP publish done callback (NO auth middleware)
	// Called by nginx-rtmp on_publish_done, marks stream as ended
	streams.Post("/publish-done",
		middleware.FiberRateLimitByIP(1000, 1*time.Minute),
		videoController.PublishDone,
	)

	// GET /api/v1/streams/:key/master.m3u8 - Get master ABR playlist
	// T524, T529: Serves enhanced HLS master playlist with full ABR metadata
	streams.Get("/:key/master.m3u8",
		middleware.FiberRateLimitByIP(1000, 1*time.Minute), // High rate for video playback
		videoController.GetMasterPlaylist,
	)

	// GET /api/v1/streams/:key/dvr/playlist.m3u8 - Get DVR playlist for time-shifted playback
	// T533: Serves DVR playlist with optional seek parameter
	streams.Get("/:key/dvr/playlist.m3u8",
		middleware.FiberRateLimitByIP(1000, 1*time.Minute),
		videoController.GetDVRPlaylist,
	)

	// Recordings routes (Feature #003 Phase 2 - T535-T537)
	recordings := router.Group("/recordings")

	// GET /api/v1/recordings/:id - Get recording details
	// T536: Retrieves metadata and playback URL for saved recording
	recordings.Get("/:id",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		videoController.GetRecording,
	)

	// DELETE /api/v1/recordings/:id - Delete recording
	// T537: Deletes recording from database and S3 storage
	recordings.Delete("/:id",
		middleware.FiberAuthMiddleware(),
		middleware.FiberRateLimitByIP(10, 1*time.Hour),
		videoController.DeleteRecording,
	)
}
