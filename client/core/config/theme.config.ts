/**
 * Theme Configuration
 * 
 * This file contains theme-related configuration including colors,
 * navigation themes, and theme utilities.
 */

import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import type { ColorScheme, ThemeMode } from '../types';

/**
 * Color scheme definitions for light and dark modes
 * 
 * @description
 * These colors follow the shadcn/ui design system and are
 * defined using HSL color values for easy customization.
 */
export const colorSchemes: Record<ThemeMode, ColorScheme> = {
    light: {
        background: 'hsl(0 0% 100%)',
        foreground: 'hsl(0 0% 3.9%)',
        card: 'hsl(0 0% 100%)',
        cardForeground: 'hsl(0 0% 3.9%)',
        popover: 'hsl(0 0% 100%)',
        popoverForeground: 'hsl(0 0% 3.9%)',
        primary: 'hsl(0 0% 9%)',
        primaryForeground: 'hsl(0 0% 98%)',
        secondary: 'hsl(0 0% 96.1%)',
        secondaryForeground: 'hsl(0 0% 9%)',
        muted: 'hsl(0 0% 96.1%)',
        mutedForeground: 'hsl(0 0% 45.1%)',
        accent: 'hsl(0 0% 96.1%)',
        accentForeground: 'hsl(0 0% 9%)',
        destructive: 'hsl(0 84.2% 60.2%)',
        border: 'hsl(0 0% 89.8%)',
        input: 'hsl(0 0% 89.8%)',
        ring: 'hsl(0 0% 63%)',
        radius: '0.625rem',
        chart1: 'hsl(12 76% 61%)',
        chart2: 'hsl(173 58% 39%)',
        chart3: 'hsl(197 37% 24%)',
        chart4: 'hsl(43 74% 66%)',
        chart5: 'hsl(27 87% 67%)',
    },
    dark: {
        background: 'hsl(0 0% 3.9%)',
        foreground: 'hsl(0 0% 98%)',
        card: 'hsl(0 0% 3.9%)',
        cardForeground: 'hsl(0 0% 98%)',
        popover: 'hsl(0 0% 3.9%)',
        popoverForeground: 'hsl(0 0% 98%)',
        primary: 'hsl(0 0% 98%)',
        primaryForeground: 'hsl(0 0% 9%)',
        secondary: 'hsl(0 0% 14.9%)',
        secondaryForeground: 'hsl(0 0% 98%)',
        muted: 'hsl(0 0% 14.9%)',
        mutedForeground: 'hsl(0 0% 63.9%)',
        accent: 'hsl(0 0% 14.9%)',
        accentForeground: 'hsl(0 0% 98%)',
        destructive: 'hsl(0 70.9% 59.4%)',
        border: 'hsl(0 0% 14.9%)',
        input: 'hsl(0 0% 14.9%)',
        ring: 'hsl(300 0% 45%)',
        radius: '0.625rem',
        chart1: 'hsl(220 70% 50%)',
        chart2: 'hsl(160 60% 45%)',
        chart3: 'hsl(30 80% 55%)',
        chart4: 'hsl(280 65% 60%)',
        chart5: 'hsl(340 75% 55%)',
    },
};

/**
 * Navigation theme configuration for React Navigation
 * 
 * @description
 * These themes are used by @react-navigation/native to style
 * navigation components like headers and tab bars.
 */
export const navigationThemes: Record<ThemeMode, Theme> = {
    light: {
        ...DefaultTheme,
        colors: {
            background: colorSchemes.light.background,
            border: colorSchemes.light.border,
            card: colorSchemes.light.card,
            notification: colorSchemes.light.destructive,
            primary: colorSchemes.light.primary,
            text: colorSchemes.light.foreground,
        },
    },
    dark: {
        ...DarkTheme,
        colors: {
            background: colorSchemes.dark.background,
            border: colorSchemes.dark.border,
            card: colorSchemes.dark.card,
            notification: colorSchemes.dark.destructive,
            primary: colorSchemes.dark.primary,
            text: colorSchemes.dark.foreground,
        },
    },
};

/**
 * Get color scheme for a specific theme mode
 * 
 * @param mode - Theme mode ('light' or 'dark')
 * @returns Color scheme object
 */
export const getColorScheme = (mode: ThemeMode): ColorScheme => {
    return colorSchemes[mode];
};

/**
 * Get navigation theme for a specific theme mode
 * 
 * @param mode - Theme mode ('light' or 'dark')
 * @returns Navigation theme object
 */
export const getNavigationTheme = (mode: ThemeMode): Theme => {
    return navigationThemes[mode];
};

// Export legacy names for backward compatibility
export const THEME = colorSchemes;
export const NAV_THEME = navigationThemes;
