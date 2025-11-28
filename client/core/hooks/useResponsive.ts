import { useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
};

export function useResponsive() {
    const { width } = useWindowDimensions();

    return {
        isMobile: width < BREAKPOINTS.md,
        isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
        isDesktop: width >= BREAKPOINTS.lg,
        isLargeDesktop: width >= BREAKPOINTS.xl,
        width,
        breakpoints: BREAKPOINTS,
    };
}
