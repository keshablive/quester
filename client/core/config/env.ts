/**
 * Environment Configuration
 * 
 * Centralized environment variables and configuration.
 * Uses Expo's environment variable system.
 * 
 * @see https://docs.expo.dev/guides/environment-variables/
 * 
 * @example
 * ```tsx
 * import { ENV } from '@/core';
 * 
 * const response = await fetch(`${ENV.API_URL}/users`);
 * ```
 */

/**
 * Get environment variable with fallback
 */
function getEnv(key: string, fallback: string = ''): string {
  // @ts-ignore - Expo environment variables
  return process.env[`EXPO_PUBLIC_${key}`] || fallback;
}

/**
 * Environment configuration object
 */
export const ENV = {
  /**
   * Current environment (development, staging, production)
   */
  NODE_ENV: getEnv('ENV', 'development') as 'development' | 'staging' | 'production',

  /**
   * API base URL
   * Loaded from EXPO_PUBLIC_API_URL environment variable
   */
  API_URL: getEnv('API_URL', ''),

  /**
   * WebSocket URL
   * Loaded from EXPO_PUBLIC_WS_URL environment variable
   */
  WS_URL: getEnv('WS_URL', ''),

  /**
   * API timeout in milliseconds
   */
  API_TIMEOUT: parseInt(getEnv('API_TIMEOUT', '30000'), 10),

  /**
   * Enable debug mode
   */
  DEBUG: getEnv('DEBUG', 'false') === 'true' || __DEV__,

  /**
   * Enable analytics
   */
  ENABLE_ANALYTICS: getEnv('ENABLE_ANALYTICS', 'false') === 'true',

  /**
   * Analytics tracking ID (e.g., Google Analytics)
   */
  ANALYTICS_ID: getEnv('ANALYTICS_ID', ''),

  /**
   * Sentry DSN for error tracking
   */
  SENTRY_DSN: getEnv('SENTRY_DSN', ''),

  /**
   * App version from package.json
   */
  APP_VERSION: getEnv('APP_VERSION', '1.0.0'),

  /**
   * Build number/commit hash
   */
  BUILD_NUMBER: getEnv('BUILD_NUMBER', 'dev'),
} as const;

/**
 * Check if running in development
 */
export const isDevelopment = ENV.NODE_ENV === 'development' || __DEV__;

/**
 * Check if running in production
 */
export const isProduction = ENV.NODE_ENV === 'production' && !__DEV__;

/**
 * Check if running in staging
 */
export const isStaging = ENV.NODE_ENV === 'staging';

/**
 * API endpoints configuration
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    SIGNUP: '/api/v1/auth/signup',
    LOGOUT: '/api/v1/auth/logout',
    LOGOUT_ALL: '/api/v1/auth/logout-all',
    REFRESH: '/api/v1/auth/refresh',
    FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
    RESET_PASSWORD: '/api/v1/auth/reset-password',
    TOKENS: '/api/v1/auth/tokens',
    BLACKLIST_CHECK: '/api/v1/auth/blacklist/check',
    TWO_FACTOR: {
      ENABLE: '/api/v1/auth/2fa/enable',
      VERIFY: '/api/v1/auth/2fa/verify',
      DISABLE: '/api/v1/auth/2fa/disable',
      VALIDATE: '/api/v1/auth/2fa/validate',
      DEVICES: '/api/v1/auth/2fa/devices',
    },
  },
  PROPERTIES: {
    BASE: '/api/v1/properties',
    SEARCH: '/api/v1/properties/search',
    STATS: '/api/v1/properties/stats',
    BY_ID: (id: string) => `/api/v1/properties/${id}`,
    DOCUMENTS: (id: string) => `/api/v1/properties/${id}/documents`,
    VERIFY: (id: string) => `/api/v1/properties/${id}/verify`,
    PUBLISH: (id: string) => `/api/v1/properties/${id}/publish`,
    CONTACT: (id: string) => `/api/v1/properties/${id}/contact`,
  },
  CLASSIFIEDS: {
    BASE: '/api/v1/classifieds',
    SEARCH: '/api/v1/classifieds/search',
    MY_ADS: '/api/v1/classifieds/my-ads',
    RECENT: '/api/v1/classifieds/recent',
    POPULAR: '/api/v1/classifieds/popular',
    STATS: '/api/v1/classifieds/stats',
    BY_ID: (id: string) => `/api/v1/classifieds/${id}`,
    PUBLISH: (id: string) => `/api/v1/classifieds/${id}/publish`,
    RENEW: (id: string) => `/api/v1/classifieds/${id}/renew`,
    SOLD: (id: string) => `/api/v1/classifieds/${id}/sold`,
  },
  CERTIFICATES: {
    BASE: '/api/v1/certificates',
    BY_ID: (id: string) => `/api/v1/certificates/${id}`,
    DOWNLOAD: (id: string) => `/api/v1/certificates/${id}/download`,
    REGENERATE: (id: string) => `/api/v1/certificates/${id}/regenerate`,
    COURSE: (courseId: string) => `/api/v1/certificates/course/${courseId}`,
    STATS: (courseId: string) => `/api/v1/certificates/stats/course/${courseId}`,
    VERIFY: (code: string) => `/api/v1/certificates/verify/${code}`,
  },
  STREAMS: {
    BASE: '/api/v1/streams',
    VALIDATE: '/api/v1/streams/validate',
    PUBLISH_DONE: '/api/v1/streams/publish-done',
    MASTER_PLAYLIST: (key: string) => `/api/v1/streams/${key}/master.m3u8`,
    DVR_PLAYLIST: (key: string) => `/api/v1/streams/${key}/dvr/playlist.m3u8`,
  },
  RECORDINGS: {
    BY_ID: (id: string) => `/api/v1/recordings/${id}`,
  },
  TRANSACTIONS: {
    BASE: '/api/v1/transactions',
    BY_ID: (id: string) => `/api/v1/transactions/${id}`,
    CONFIRM: (id: string) => `/api/v1/transactions/${id}/confirm`,
    DELIVERY: (id: string) => `/api/v1/transactions/${id}/delivery`,
    RELEASE: (id: string) => `/api/v1/transactions/${id}/release`,
    DISPUTE: (id: string) => `/api/v1/transactions/${id}/dispute`,
    RESOLVE: (id: string) => `/api/v1/transactions/${id}/resolve`,
    MY: '/api/v1/transactions',
    DISPUTED: '/api/v1/transactions/disputed',
  },
  SOCIAL: {
    FEED: '/api/v1/social/feed',
    POSTS: '/api/v1/social/posts',
    POST_BY_ID: (id: string) => `/api/v1/social/posts/${id}`,
    LIKE: (id: string) => `/api/v1/social/posts/${id}/like`,
    COMMENT: (id: string) => `/api/v1/social/posts/${id}/comments`,
    SHARE: (id: string) => `/api/v1/social/posts/${id}/share`,
    FOLLOW: (userId: string) => `/api/v1/social/users/${userId}/follow`,
    FOLLOWERS: (userId: string) => `/api/v1/social/users/${userId}/followers`,
    FOLLOWING: (userId: string) => `/api/v1/social/users/${userId}/following`,
    FOLLOW_STATS: (userId: string) => `/api/v1/social/users/${userId}/follow-stats`,
    IS_FOLLOWING: (userId: string) => `/api/v1/social/users/${userId}/is-following`,
    // Social XP endpoints
    XP: {
      SUMMARY: '/api/v1/social/xp/summary',
      TRANSACTIONS: '/api/v1/social/xp/transactions',
      LEADERBOARD: '/api/v1/leaderboards/social', // T058: Updated to use leaderboards endpoint
      CHALLENGES: '/api/v1/social/challenges',
      CHALLENGE_PROGRESS: (id: string) => `/api/v1/social/challenges/${id}/progress`,
      MILESTONES: '/api/v1/social/milestones',
    },
    // Social Achievements endpoints (US3)
    ACHIEVEMENTS: {
      MY: '/api/v1/social/achievements',
      USER: (userId: string) => `/api/v1/users/${userId}/social/achievements`,
    },
  },
  ADMIN: {
    KMS: {
      ROTATE_DEK: '/api/v1/admin/kms/rotate-dek',
      KEYS: '/api/v1/admin/kms/keys',
      AUDIT_LOG: '/api/v1/admin/kms/audit-log',
      STATS: '/api/v1/admin/kms/stats',
    },
  },
  NOTIFICATIONS: {
    BASE: '/api/v1/notifications',
    BY_ID: (id: string) => `/api/v1/notifications/${id}`,
    UNREAD_COUNT: '/api/v1/notifications/unread/count',
    STATS: '/api/v1/notifications/stats',
    MARK_READ: (id: string) => `/api/v1/notifications/${id}/read`,
    MARK_ALL_READ: '/api/v1/notifications/read-all',
    SETTINGS: '/api/v1/notifications/settings',
    FCM_REGISTER: '/api/v1/notifications/fcm/register',
    FCM_UNREGISTER: '/api/v1/notifications/fcm/unregister',
    FCM_TOKENS: '/api/v1/notifications/fcm/tokens',
  },
  COURSES: {
    BASE: '/api/v1/courses',
    BY_ID: (id: string) => `/api/v1/courses/${id}`,
    LESSONS: (id: string) => `/api/v1/courses/${id}/lessons`,
    ENROLL: (id: string) => `/api/v1/courses/${id}/enroll`,
    PROGRESS: (id: string) => `/api/v1/courses/${id}/progress`,
  },
  LESSONS: {
    BASE: '/api/v1/lessons',
    BY_ID: (id: string) => `/api/v1/lessons/${id}`,
    COMPLETE: (id: string) => `/api/v1/lessons/${id}/complete`,
  },
  // Learning Gamification XP endpoints (006-course-gamification)
  LEARNING: {
    XP: {
      SUMMARY: '/api/v1/learning/xp/summary',
      TRANSACTIONS: '/api/v1/learning/xp/transactions',
      LEADERBOARD: '/api/v1/leaderboards/learning',
      COURSE_PROGRESS: (courseId: string) => `/api/v1/learning/courses/${courseId}/progress`,
    },
    STREAK: {
      CURRENT: '/api/v1/learning/streak',
      MILESTONES: '/api/v1/learning/streak/milestones',
    },
    CHALLENGES: {
      DAILY: '/api/v1/learning/challenges/daily',
      BY_ID: (id: string) => `/api/v1/learning/challenges/${id}`,
      PROGRESS: (id: string) => `/api/v1/learning/challenges/${id}/progress`,
    },
    ACHIEVEMENTS: {
      MY: '/api/v1/learning/achievements',
      USER: (userId: string) => `/api/v1/users/${userId}/learning/achievements`,
    },
    LEVELS: {
      CURRENT: '/api/v1/learning/level',
      ALL: '/api/v1/learning/levels',
    },
  },
  BADGES: {
    BASE: '/api/v1/badges',
    BY_ID: (id: string) => `/api/v1/badges/${id}`,
    USER: '/api/v1/badges/user',
    AWARD_INSTRUCTOR: '/api/v1/learning/badges/award',
  },
  ACHIEVEMENTS: {
    BASE: '/api/v1/achievements',
    BY_ID: (id: string) => `/api/v1/achievements/${id}`,
    USER: '/api/v1/achievements/user',
    CLAIM: (id: string) => `/api/v1/achievements/${id}/claim`,
  },
  MESSAGES: {
    BASE: '/api/v1/messages',
    BY_ID: (id: string) => `/api/v1/messages/${id}`,
    DIRECT: '/api/v1/messages/direct',
    USERS: (userId: string) => `/api/v1/messages/users/${userId}`,
    GROUPS: (groupId: string) => `/api/v1/messages/groups/${groupId}`,
    THREADS: '/api/v1/messages/threads',
    SEARCH: '/api/v1/messages/search',
    STATS: '/api/v1/messages/stats',
    UNREAD_COUNT: '/api/v1/messages/unread/count',
    MARK_READ: (id: string) => `/api/v1/messages/${id}/read`,
    MARK_MULTIPLE_READ: '/api/v1/messages/read',
    TYPING: '/api/v1/messages/typing',
  },
  GROUPS: {
    BASE: '/api/v1/groups',
    BY_ID: (id: string) => `/api/v1/groups/${id}`,
    MEMBERS: (id: string) => `/api/v1/groups/${id}/members`,
    ADD_MEMBER: (id: string) => `/api/v1/groups/${id}/members`,
    REMOVE_MEMBER: (id: string, userId: string) => `/api/v1/groups/${id}/members/${userId}`,
    UPDATE_ROLE: (id: string, userId: string) => `/api/v1/groups/${id}/members/${userId}/role`,
    LEAVE: (id: string) => `/api/v1/groups/${id}/leave`,
  },
  ANALYTICS: {
    USER_TRACK: (userId: string) => `/api/v1/analytics/users/${userId}/track`,
    USER_SUMMARY: (userId: string) => `/api/v1/analytics/users/${userId}/summary`,
    USER_TIMESERIES: (userId: string) => `/api/v1/analytics/users/${userId}/timeseries`,
    COURSE_TRACK: (courseId: string) => `/api/v1/analytics/courses/${courseId}/track`,
    COURSE_SUMMARY: (courseId: string) => `/api/v1/analytics/courses/${courseId}/summary`,
    COURSE_TIMESERIES: (courseId: string) => `/api/v1/analytics/courses/${courseId}/timeseries`,
    TOP_COURSES: '/api/v1/analytics/courses/top',
    ENGAGEMENT_TRACK: '/api/v1/analytics/engagement/track',
    ENGAGEMENT_SUMMARY: '/api/v1/analytics/engagement/summary',
    ENGAGEMENT_TIMESERIES: '/api/v1/analytics/engagement/timeseries',
  },
  REPORTS: {
    BASE: '/api/v1/reports',
    STATS: '/api/v1/reports/stats',
  },
} as const;


/**
 * Feature flags configuration
 * 
 * Control feature availability based on environment.
 */
export const FEATURE_FLAGS = {
  /**
   * Enable user sidebar
   */
  ENABLE_USER_SIDEBAR: getEnv('FEATURE_USER_SIDEBAR', 'true') === 'true',

  /**
   * Enable theme toggle
   */
  ENABLE_THEME_TOGGLE: getEnv('FEATURE_THEME_TOGGLE', 'true') === 'true',

  /**
   * Enable analytics
   */
  ENABLE_ANALYTICS: ENV.ENABLE_ANALYTICS,

  /**
   * Enable push notifications
   */
  ENABLE_PUSH_NOTIFICATIONS: getEnv('FEATURE_PUSH_NOTIFICATIONS', 'false') === 'true',

  /**
   * Enable social features
   */
  ENABLE_SOCIAL: getEnv('FEATURE_SOCIAL', 'true') === 'true',

  /**
   * Enable beta features
   */
  ENABLE_BETA_FEATURES: isDevelopment || getEnv('FEATURE_BETA', 'false') === 'true',
} as const;

/**
 * Storage keys prefix
 */
export const STORAGE_PREFIX = '@quester:';

/**
 * App constants
 */
export const APP_CONSTANTS = {
  /**
   * Default items per page for pagination
   */
  DEFAULT_PAGE_SIZE: 20,

  /**
   * Maximum file upload size (bytes)
   */
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB

  /**
   * Supported image formats
   */
  SUPPORTED_IMAGE_FORMATS: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],

  /**
   * Session timeout (milliseconds)
   */
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes

  /**
   * Debounce delay for search (milliseconds)
   */
  SEARCH_DEBOUNCE_MS: 300,

  /**
   * Toast duration (milliseconds)
   */
  TOAST_DURATION: 3000,
} as const;

/**
 * Log environment info (development only)
 */
if (isDevelopment && ENV.DEBUG) {
  console.log('🔧 Environment:', ENV.NODE_ENV);
  console.log('🌐 API URL:', ENV.API_URL);
  console.log('🚀 App Version:', ENV.APP_VERSION);
  console.log('🏗️  Build:', ENV.BUILD_NUMBER);
}
