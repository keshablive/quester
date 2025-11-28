/**
 * Core Type Definitions
 * 
 * This file contains all shared TypeScript types and interfaces
 * used throughout the framework.
 */

import { LucideIcon } from 'lucide-react-native';

// Export Component types
export * from './components';
// Export Learning Gamification types
export * from './learning-gamification.types';
// Note: ApiError is now exported from '@/core/api' to avoid conflicts

/**
 * Navigation item definition
 */
export interface NavigationItem {
    /** Icon component from lucide-react-native */
    icon: LucideIcon;
    /** Display label for the navigation item */
    label: string;
    /** Route path (must match expo-router path) */
    href: string;
    /** Optional badge count */
    badge?: number;
    /** Optional authentication requirement */
    requiresAuth?: boolean;
}

/**
 * Theme mode configuration
 */
export type ThemeMode = 'light' | 'dark';

/**
 * Color scheme definition
 */
export interface ColorScheme {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    border: string;
    input: string;
    ring: string;
    radius: string;
    chart1: string;
    chart2: string;
    chart3: string;
    chart4: string;
    chart5: string;
}

/**
 * Layout orientation for responsive components
 */
export type Orientation = 'vertical' | 'horizontal';

/**
 * Breakpoint definitions for responsive design
 */
export interface Breakpoints {
    mobile: number;
    tablet: number;
    desktop: number;
    wide: number;
}

/**
 * App configuration interface
 */
export interface AppConfig {
    /** Application name */
    name: string;
    /** Application version */
    version: string;
    /** Application description */
    description?: string;
    /** Navigation items */
    navigation: NavigationItem[];
    /** Breakpoint configuration */
    breakpoints: Breakpoints;
    /** Default theme mode */
    defaultTheme: ThemeMode;
    /** External links */
    links?: {
        docs?: string;
        github?: string;
        [key: string]: string | undefined;
    };
    /** App-specific branding and content */
    branding?: {
        welcomeSteps?: string[];
        actions?: Record<string, string>;
    };
    /** App assets (images, icons, etc.) */
    assets?: {
        logo?: {
            light: any;
            dark: any;
        };
        [key: string]: any;
    };
}

/**
 * User profile interface
 */
export interface UserProfile {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role?: string;
}
