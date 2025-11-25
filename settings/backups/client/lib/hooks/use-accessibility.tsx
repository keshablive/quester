/**
 * Accessibility Hook (useAccessibility)
 * 
 * Provides accessibility context and utilities:
 * - Screen reader detection
 * - Font scaling preferences
 * - Reduce motion preferences
 * - High contrast mode detection
 * 
 * Used throughout the app to adapt UI for accessibility needs
 */

import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { AccessibilityInfo, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  FONT_SCALE_OVERRIDE: '@accessibility/font_scale_override',
  REDUCE_MOTION_OVERRIDE: '@accessibility/reduce_motion_override',
  HIGH_CONTRAST_OVERRIDE: '@accessibility/high_contrast_override',
};

/**
 * Accessibility Context Interface
 */
export interface AccessibilityContextValue {
  // Screen reader state
  isScreenReaderEnabled: boolean;
  announceForAccessibility: (message: string) => void;
  
  // Font scaling
  fontScale: number;
  setFontScaleOverride: (scale: number | null) => Promise<void>;
  
  // Motion preferences
  prefersReducedMotion: boolean;
  setPrefersReducedMotionOverride: (value: boolean | null) => Promise<void>;
  
  // High contrast
  prefersHighContrast: boolean;
  setPrefersHighContrastOverride: (value: boolean | null) => Promise<void>;
  
  // Utility
  getAccessibilityLabel: (label: string, hint?: string) => string;
}

/**
 * Accessibility Context
 */
const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

/**
 * Hook: Screen Reader Detection
 */
export function useScreenReader(): {
  isScreenReaderEnabled: boolean;
  announceForAccessibility: (message: string) => void;
} {
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  
  useEffect(() => {
    // Check initial state
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      setIsScreenReaderEnabled(enabled);
    });
    
    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled) => {
        setIsScreenReaderEnabled(enabled);
      }
    );
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  const announceForAccessibility = useCallback((message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  }, []);
  
  return {
    isScreenReaderEnabled,
    announceForAccessibility,
  };
}

/**
 * Hook: Font Scale Detection
 */
export function useFontScale(): {
  fontScale: number;
  setFontScaleOverride: (scale: number | null) => Promise<void>;
} {
  const { fontScale: systemFontScale } = useWindowDimensions();
  const [override, setOverride] = useState<number | null>(null);
  
  useEffect(() => {
    // Load saved override
    AsyncStorage.getItem(STORAGE_KEYS.FONT_SCALE_OVERRIDE).then((value) => {
      if (value) {
        setOverride(parseFloat(value));
      }
    });
  }, []);
  
  const setFontScaleOverride = useCallback(async (scale: number | null) => {
    if (scale === null) {
      await AsyncStorage.removeItem(STORAGE_KEYS.FONT_SCALE_OVERRIDE);
      setOverride(null);
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.FONT_SCALE_OVERRIDE, scale.toString());
      setOverride(scale);
    }
  }, []);
  
  return {
    fontScale: override ?? systemFontScale,
    setFontScaleOverride,
  };
}

/**
 * Hook: Reduce Motion Detection
 */
export function useReduceMotion(): {
  prefersReducedMotion: boolean;
  setPrefersReducedMotionOverride: (value: boolean | null) => Promise<void>;
} {
  const [systemPreference, setSystemPreference] = useState(false);
  const [override, setOverride] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Check system preference
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setSystemPreference(enabled);
    });
    
    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        setSystemPreference(enabled);
      }
    );
    
    // Load saved override
    AsyncStorage.getItem(STORAGE_KEYS.REDUCE_MOTION_OVERRIDE).then((value) => {
      if (value) {
        setOverride(value === 'true');
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  const setPrefersReducedMotionOverride = useCallback(async (value: boolean | null) => {
    if (value === null) {
      await AsyncStorage.removeItem(STORAGE_KEYS.REDUCE_MOTION_OVERRIDE);
      setOverride(null);
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.REDUCE_MOTION_OVERRIDE, value.toString());
      setOverride(value);
    }
  }, []);
  
  return {
    prefersReducedMotion: override ?? systemPreference,
    setPrefersReducedMotionOverride,
  };
}

/**
 * Hook: High Contrast Detection
 * 
 * Note: React Native doesn't have built-in high contrast detection.
 * This is a manual preference stored in AsyncStorage.
 */
export function useHighContrast(): {
  prefersHighContrast: boolean;
  setPrefersHighContrastOverride: (value: boolean | null) => Promise<void>;
} {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);
  
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST_OVERRIDE).then((value) => {
      if (value) {
        setPrefersHighContrast(value === 'true');
      }
    });
  }, []);
  
  const setPrefersHighContrastOverride = useCallback(async (value: boolean | null) => {
    if (value === null) {
      await AsyncStorage.removeItem(STORAGE_KEYS.HIGH_CONTRAST_OVERRIDE);
      setPrefersHighContrast(false);
    } else {
      await AsyncStorage.setItem(STORAGE_KEYS.HIGH_CONTRAST_OVERRIDE, value.toString());
      setPrefersHighContrast(value);
    }
  }, []);
  
  return {
    prefersHighContrast,
    setPrefersHighContrastOverride,
  };
}

/**
 * Accessibility Provider Component
 */
export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const screenReader = useScreenReader();
  const fontScale = useFontScale();
  const reduceMotion = useReduceMotion();
  const highContrast = useHighContrast();
  
  const getAccessibilityLabel = useCallback((label: string, hint?: string): string => {
    if (hint) {
      return `${label}. ${hint}`;
    }
    return label;
  }, []);
  
  const value: AccessibilityContextValue = {
    isScreenReaderEnabled: screenReader.isScreenReaderEnabled,
    announceForAccessibility: screenReader.announceForAccessibility,
    fontScale: fontScale.fontScale,
    setFontScaleOverride: fontScale.setFontScaleOverride,
    prefersReducedMotion: reduceMotion.prefersReducedMotion,
    setPrefersReducedMotionOverride: reduceMotion.setPrefersReducedMotionOverride,
    prefersHighContrast: highContrast.prefersHighContrast,
    setPrefersHighContrastOverride: highContrast.setPrefersHighContrastOverride,
    getAccessibilityLabel,
  };
  
  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

/**
 * Hook: Access Accessibility Context
 */
export function useAccessibility(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext);
  
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  
  return context;
}

/**
 * Utility: Calculate Scaled Size
 * 
 * Scales a size value based on font scale preference.
 * Useful for touch targets and spacing.
 */
export function useScaledSize(baseSize: number): number {
  const { fontScale } = useAccessibility();
  return Math.round(baseSize * fontScale);
}

/**
 * Utility: Get Animation Duration
 * 
 * Returns 0ms if reduce motion is enabled, otherwise returns specified duration.
 */
export function useAnimationDuration(baseDuration: number): number {
  const { prefersReducedMotion } = useAccessibility();
  return prefersReducedMotion ? 0 : baseDuration;
}

/**
 * Utility: Get Contrast Color
 * 
 * Returns high contrast version of color if high contrast mode is enabled.
 */
export function useContrastColor(normalColor: string, highContrastColor: string): string {
  const { prefersHighContrast } = useAccessibility();
  return prefersHighContrast ? highContrastColor : normalColor;
}

/**
 * Utility: Format Accessible Number
 * 
 * Formats numbers for screen readers (e.g., "1234" -> "one thousand two hundred thirty-four")
 */
export function formatAccessibleNumber(value: number): string {
  // Basic implementation - can be extended with number-to-words library
  if (value < 1000) {
    return value.toString();
  }
  
  if (value < 1000000) {
    const thousands = Math.floor(value / 1000);
    const remainder = value % 1000;
    if (remainder === 0) {
      return `${thousands} thousand`;
    }
    return `${thousands} thousand ${remainder}`;
  }
  
  const millions = Math.floor(value / 1000000);
  const remainder = value % 1000000;
  if (remainder === 0) {
    return `${millions} million`;
  }
  return `${millions} million ${Math.floor(remainder / 1000)} thousand`;
}

/**
 * Utility: Format Accessible Date
 * 
 * Formats dates for screen readers
 */
export function formatAccessibleDate(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  
  const weekdays = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  ];
  
  return `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Utility: Format Accessible Time
 * 
 * Formats time for screen readers (e.g., "14:30" -> "2:30 PM")
 */
export function formatAccessibleTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  
  return `${displayHours}:${displayMinutes} ${ampm}`;
}
