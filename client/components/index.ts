/**
 * @fileoverview Components Barrel File
 *
 * Exports all component modules organized by category:
 * - ui/ - UI primitives (shadcn components)
 * - layout/ - Layout components (sidebar, header, etc.)
 * - shared/ - Shared utility components (offline indicator, etc.)
 * - auth/ - Authentication components
 * - features/ - Domain-specific feature components
 *
 * @module @/components
 */

// UI primitives
export * from './ui';

// Layout components
export * from './layout';

// Shared utility components
export * from './shared';

// Auth components
export * from './auth';

// Feature components (domain-specific)
export * from './features/learning';
