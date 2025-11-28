// Server initialization, graceful shutdown
package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/keshablive/quester/internal/app"
)

func main() {
	// Create application instance
	application, err := app.New()
	if err != nil {
		log.Fatalf("Failed to create application: %v", err)
	}

	// Setup graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	// Start server in goroutine
	go func() {
		if err := application.Start(); err != nil {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal
	<-quit
	log.Println("Received shutdown signal")

	// Graceful shutdown
	if err := application.Shutdown(); err != nil {
		log.Printf("Error during shutdown: %v", err)
	}

	log.Println("Server stopped gracefully")
}
