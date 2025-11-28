/**
 * Responsive Utilities
 * 
 * This file contains utilities for handling responsive design
 * and breakpoint detection.
 */

import type { Breakpoints } from '../types';
import { appConfig } from '../config';

/**
 * Device type based on screen width
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'wide';

/**
 * Gets the current device type based on window width
 * 
 * @param width - Current window width
 * @param breakpoints - Breakpoint configuration (optional)
 * @returns Device type
 * 
 * @example
 * ```tsx
 * const { width } = useWindowDimensions();
 * const device = getDeviceType(width); // 'mobile' | 'tablet' | 'desktop' | 'wide'
 * ```
 */
export function getDeviceType(
    width: number,
    breakpoints: Breakpoints = appConfig.breakpoints
): DeviceType {
    if (width >= breakpoints.wide) return 'wide';
    if (width >= breakpoints.desktop) return 'desktop';
    if (width >= breakpoints.tablet) return 'tablet';
    return 'mobile';
}

/**
 * Checks if the current device is mobile
 * 
 * @param width - Current window width
 * @returns True if mobile
 */
export function isMobile(width: number): boolean {
    return getDeviceType(width) === 'mobile';
}

/**
 * Checks if the current device is tablet
 * 
 * @param width - Current window width
 * @returns True if tablet
 */
export function isTablet(width: number): boolean {
    return getDeviceType(width) === 'tablet';
}

/**
 * Checks if the current device is desktop or wider
 * 
 * @param width - Current window width
 * @returns True if desktop or wider
 */
export function isDesktop(width: number): boolean {
    const type = getDeviceType(width);
    return type === 'desktop' || type === 'wide';
}

/**
 * Checks if the current device is at least the specified type
 * 
 * @param width - Current window width
 * @param minDevice - Minimum device type
 * @returns True if device is at least the specified type
 * 
 * @example
 * ```tsx
 * isAtLeast(1000, 'tablet') // true if width >= tablet breakpoint
 * ```
 */
export function isAtLeast(width: number, minDevice: DeviceType): boolean {
    const deviceOrder: DeviceType[] = ['mobile', 'tablet', 'desktop', 'wide'];
    const current = getDeviceType(width);
    return deviceOrder.indexOf(current) >= deviceOrder.indexOf(minDevice);
}

/**
 * Returns a value based on the current device type
 * 
 * @param width - Current window width
 * @param values - Values for each device type
 * @returns Value for current device type
 * 
 * @example
 * ```tsx
 * const padding = responsiveValue(width, {
 *   mobile: 16,
 *   tablet: 24,
 *   desktop: 32,
 *   wide: 48,
 * });
 * ```
 */
export function responsiveValue<T>(
    width: number,
    values: Partial<Record<DeviceType, T>> & { mobile: T }
): T {
    const device = getDeviceType(width);
    return values[device] ?? values.mobile;
}
