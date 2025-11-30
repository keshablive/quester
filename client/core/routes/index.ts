import { RouteConfig } from './types';

// Lazy loading utilities
export {
  ChunkErrorBoundary,
  LoadingFallback,
  withLazyLoading,
} from './LazyRoute';

export type {
  LazyRouteConfig,
  ChunkLoadingState,
  ChunkErrorBoundaryProps,
  ChunkErrorFallbackProps,
} from './LazyRoute';

export const ROUTES = {
    HOME: 'index',
    DASHBOARD: 'dashboard',
    PROFILE: 'profile',
    SETTINGS: 'settings',
    ANALYTICS: 'analytics',
    COMMUNICATE: 'communicate',
    MESSAGES: 'messages', // Legacy - redirects to communicate
    QUESTS: 'quests',
    MARKETPLACE: 'marketplace',
    CLASSIFIEDS: 'classifieds', // Legacy - redirects to marketplace
    STREAMS: 'streams', // Legacy - redirects to communicate
    SOCIAL: 'social', // Legacy - redirects to communicate
    PROPERTIES: 'properties', // Legacy - redirects to marketplace
    ADMIN: 'admin',
    TRANSACTIONS: 'transactions',
    CERTIFICATES: 'certificates',
    NOTIFICATIONS: 'notifications',
    COURSES: 'courses',
    LESSONS: 'lessons',
    BADGES: 'badges',
    ACHIEVEMENTS: 'achievements',
    LEARNING: 'learning',
} as const;

export const ROUTE_CONFIG: Record<string, RouteConfig> = {
    [ROUTES.HOME]: { path: '/', name: ROUTES.HOME, type: 'public', label: 'Home' },
    [ROUTES.DASHBOARD]: { path: '/dashboard', name: ROUTES.DASHBOARD, type: 'protected', label: 'Dashboard' },
    [ROUTES.PROFILE]: { path: '/profile', name: ROUTES.PROFILE, type: 'protected', label: 'Profile' },
    [ROUTES.SETTINGS]: { path: '/settings', name: ROUTES.SETTINGS, type: 'protected', label: 'Settings' },
    [ROUTES.ANALYTICS]: { path: '/analytics', name: ROUTES.ANALYTICS, type: 'protected', label: 'Analytics' },
    [ROUTES.COMMUNICATE]: { path: '/communicate', name: ROUTES.COMMUNICATE, type: 'protected', label: 'Communicate' },
    [ROUTES.MESSAGES]: { path: '/communicate', name: ROUTES.MESSAGES, type: 'protected', label: 'Messages' },
    [ROUTES.QUESTS]: { path: '/quests', name: ROUTES.QUESTS, type: 'protected', label: 'Quests' },
    [ROUTES.MARKETPLACE]: { path: '/marketplace', name: ROUTES.MARKETPLACE, type: 'protected', label: 'Marketplace' },
    [ROUTES.CLASSIFIEDS]: { path: '/marketplace', name: ROUTES.CLASSIFIEDS, type: 'protected', label: 'Classifieds' },
    [ROUTES.STREAMS]: { path: '/communicate', name: ROUTES.STREAMS, type: 'protected', label: 'Streams' },
    [ROUTES.SOCIAL]: { path: '/communicate', name: ROUTES.SOCIAL, type: 'protected', label: 'Social' },
    [ROUTES.PROPERTIES]: { path: '/marketplace', name: ROUTES.PROPERTIES, type: 'protected', label: 'Properties' },
    [ROUTES.ADMIN]: { path: '/admin', name: ROUTES.ADMIN, type: 'protected', label: 'Admin' },
    [ROUTES.TRANSACTIONS]: { path: '/transactions', name: ROUTES.TRANSACTIONS, type: 'protected', label: 'Transactions' },
    [ROUTES.CERTIFICATES]: { path: '/certificates', name: ROUTES.CERTIFICATES, type: 'protected', label: 'Certificates' },
    [ROUTES.NOTIFICATIONS]: { path: '/notifications', name: ROUTES.NOTIFICATIONS, type: 'protected', label: 'Notifications' },
    [ROUTES.COURSES]: { path: '/courses', name: ROUTES.COURSES, type: 'protected', label: 'Courses' },
    [ROUTES.LESSONS]: { path: '/lessons', name: ROUTES.LESSONS, type: 'protected', label: 'Lessons' },
    [ROUTES.BADGES]: { path: '/badges', name: ROUTES.BADGES, type: 'protected', label: 'Badges' },
    [ROUTES.ACHIEVEMENTS]: { path: '/achievements', name: ROUTES.ACHIEVEMENTS, type: 'protected', label: 'Achievements' },
    [ROUTES.LEARNING]: { path: '/learning', name: ROUTES.LEARNING, type: 'protected', label: 'Learning Center' },
};

export const isProtectedRoute = (routeName: string): boolean => {
    const route = Object.values(ROUTE_CONFIG).find(r => r.name === routeName);
    return route?.type === 'protected';
};
