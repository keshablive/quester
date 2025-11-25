// API Client Exports
// Central export point for all API clients

export * as authApi from './auth';
export * as analyticsApi from './analytics';
export * as badgesApi from './badges';
export * as certificatesApi from './certificates';
export * as classifiedsApi from './classifieds';
export * as coursesApi from './courses';
export * as interactionsApi from './interactions';
export * as kmsApi from './kms';
export * as leaderboardsApi from './leaderboards';
export * as lessonsApi from './lessons';
export * as marketplaceApi from './marketplace';
export * as messagingApi from './messaging';
export * as notificationsApi from './notifications';
export * as profileApi from './profile';
export * as propertiesApi from './properties';
export * as reportsApi from './reports';
export * as socialApi from './social';
export * as transactionsApi from './transactions';
export * as videosApi from './videos';

// Re-export commonly used types
export type { RFC7807Error } from '../utils/error-handler';
export type { Certificate, CertificateStats, CertificateVerification } from './certificates';
export type { KMSKey, AuditLogEntry, KMSStats } from './kms';
export type { Transaction, TransactionStatus, PaymentGateway } from './transactions';
export type { Stream, StreamStats, CreateStreamRequest } from './videos';

// Export API client instance
export { apiClient } from './client';
