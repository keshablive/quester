/**
 * @fileoverview Service Layer Barrel File
 *
 * Exports all service modules for API interactions.
 * Services encapsulate business logic and API calls.
 *
 * @module @/core/services
 */

// Admin services
export * from './admin.service';

// Analytics services
export * from './analytics.service';

// Authentication services
export * from './auth.service';

// Certificate services
export * from './certificates.service';

// Classifieds/Marketplace services
export * from './classifieds.service';

// Course services
export * from './courses.service';

// Gamification services
export * from './gamification.service';
export * from './learning-gamification.service';
export * from './social-gamification.service';

// Messaging services
export * from './messages.service';

// Notification services
export * from './notifications.service';

// Property services
export * from './properties.service';

// Quest services
export * from './quest.service';

// Report services
export * from './reports.service';

// Social services
export * from './social.service';

// Streaming services
export * from './streams.service';

// Transaction services
export * from './transactions.service';

// WebSocket services
export * from './websocket.service';
