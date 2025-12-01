/**
 * @fileoverview API Client Barrel File
 *
 * Exports the core API client infrastructure.
 * Service modules have been moved to @/core/services/.
 *
 * @module @/core/api
 */

// API Client
export { apiClient, ApiError } from './client';
export type { RequestConfig, ServiceRequestOptions } from './client';
