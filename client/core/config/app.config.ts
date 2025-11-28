/**
 * Framework Configuration
 * 
 * This file contains the main configuration for the application.
 * Modify this file to customize your app's behavior, navigation, and branding.
 */

import {
    LayoutDashboard,
    Trophy,
    GraduationCap,
    Users,
    ShoppingBag,
} from 'lucide-react-native';
import type { AppConfig } from '../types';
import { ROUTES } from '../routes';

/**
 * Main application configuration
 * 
 * @example
 * ```tsx
 * import { appConfig } from '@/core/config';
 * 
 * console.log(appConfig.name); // "Quester"
 * ```
 */
export const appConfig: AppConfig = {
    name: 'Quester',
    version: '1.0.0',
    description: 'A modern React Native application framework',

    /**
     * Navigation items shown in NavigationRail and BottomNavigationBar
     * Add or remove items to customize your app's navigation
     */
    navigation: [
        {
            icon: LayoutDashboard,
            label: 'Dashboard',
            href: `/${ROUTES.DASHBOARD}`,
            requiresAuth: false,
        },
        {
            icon: Trophy,
            label: 'Quests',
            href: `/${ROUTES.QUESTS}`,
            requiresAuth: false,
        },
        {
            icon: GraduationCap,
            label: 'Learning',
            href: `/${ROUTES.LEARNING}`,
            requiresAuth: false,
        },
        {
            icon: Users,
            label: 'Communicate',
            href: `/${ROUTES.COMMUNICATE}`,
            requiresAuth: false,
        },
        {
            icon: ShoppingBag,
            label: 'Marketplace',
            href: `/${ROUTES.MARKETPLACE}`,
            requiresAuth: false,
        },
    ],

    /**
     * Responsive breakpoints (in pixels)
     * Used to determine layout behavior across different screen sizes
     */
    breakpoints: {
        mobile: 0,      // 0-767px
        tablet: 768,    // 768-1023px
        desktop: 1024,  // 1024-1439px
        wide: 1440,     // 1440px+
    },

    /**
     * Default theme mode
     */
    defaultTheme: 'light',

    /**
     * External links used in the application
     */
    links: {
        docs: 'https://reactnativereusables.com',
        github: 'https://github.com/founded-labs/react-native-reusables',
    },

    /**
     * App-specific branding and content
     */
    branding: {
        welcomeSteps: [
            '1. Edit app/index.tsx to get started.',
            '2. Save to see your changes instantly.',
        ],
        actions: {
            browseDocs: 'Browse the Docs',
            starRepo: 'Star the Repo',
        },
    },

    /**
     * App assets (images, icons, etc.)
     */
    assets: {
        logo: {
            light: require('@/assets/images/react-native-reusables-light.png'),
            dark: require('@/assets/images/react-native-reusables-dark.png'),
        },
    },
};

/**
 * Feature flags for enabling/disabling framework features
 */
export const featureFlags = {
    enableUserSidebar: true,
    enableThemeToggle: true,
    enableNavigationExpansion: true,
    enableAnimations: true,
} as const;

/**
 * Animation configuration
 */
export const animationConfig = {
    spring: {
        friction: 8,
        tension: 40,
    },
    timing: {
        duration: 250,
    },
} as const;

/**
 * Layout configuration
 */
export const layoutConfig = {
    navigationRail: {
        collapsedWidth: 80,
        expandedWidth: 240,
    },
    bottomNav: {
        collapsedHeight: 64,
        expandedHeight: 280,
    },
    header: {
        height: 64,
    },
} as const;
