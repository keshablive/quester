/**
 * Developer Mode Context
 *
 * Manages developer mode state for component showcase, verbose logging,
 * and debug utilities. Activated via 10 rapid taps on app version.
 *
 * @module developer-mode-context
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { performanceMonitor } from '../services/performance-monitor';

const DEVELOPER_MODE_KEY = '@quester:developer_mode';
const TAP_WINDOW_MS = 3000; // 3 seconds for 10 taps (FR-033)
const REQUIRED_TAPS = 10;

export interface DeveloperModeState {
  enabled: boolean;
  verboseLogging: boolean;
  showPerformanceOverlay: boolean;
  showAccessibilityOverlay: boolean;
  componentLifecycleLogging: boolean; // T174
}

interface DeveloperModeContextType {
  state: DeveloperModeState;
  toggleDeveloperMode: () => Promise<void>;
  toggleVerboseLogging: () => void;
  togglePerformanceOverlay: () => void;
  toggleAccessibilityOverlay: () => void;
  toggleComponentLifecycleLogging: () => void; // T174
  handleVersionTap: () => void;
  tapCount: number;
}

const defaultState: DeveloperModeState = {
  enabled: false,
  verboseLogging: false,
  showPerformanceOverlay: false,
  showAccessibilityOverlay: false,
  componentLifecycleLogging: false, // T174
};

const DeveloperModeContext = createContext<DeveloperModeContextType | undefined>(undefined);

export function DeveloperModeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DeveloperModeState>(defaultState);
  const [tapCount, setTapCount] = useState(0);
  const [tapTimeout, setTapTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Load developer mode state from storage on mount
  useEffect(() => {
    loadDeveloperModeState();
  }, []);

  // Sync verbose logging with performance monitor
  useEffect(() => {
    performanceMonitor.setVerboseLogging(state.verboseLogging);
  }, [state.verboseLogging]);

  const loadDeveloperModeState = async () => {
    try {
      const stored = await AsyncStorage.getItem(DEVELOPER_MODE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState(parsed);
        if (__DEV__) {
          console.log('[DeveloperMode] Loaded state:', parsed);
        }
      }
    } catch (error) {
      console.error('[DeveloperMode] Failed to load state:', error);
    }
  };

  const saveDeveloperModeState = async (newState: DeveloperModeState) => {
    try {
      await AsyncStorage.setItem(DEVELOPER_MODE_KEY, JSON.stringify(newState));
      if (__DEV__) {
        console.log('[DeveloperMode] Saved state:', newState);
      }
    } catch (error) {
      console.error('[DeveloperMode] Failed to save state:', error);
    }
  };

  const toggleDeveloperMode = useCallback(async () => {
    const newState = { ...state, enabled: !state.enabled };
    setState(newState);
    await saveDeveloperModeState(newState);

    if (newState.enabled) {
      console.log('[DeveloperMode] 🔧 Developer mode enabled');
    } else {
      console.log('[DeveloperMode] Developer mode disabled');
    }
  }, [state]);

  const toggleVerboseLogging = useCallback(() => {
    const newState = { ...state, verboseLogging: !state.verboseLogging };
    setState(newState);
    saveDeveloperModeState(newState);

    console.log(
      `[DeveloperMode] Verbose logging ${newState.verboseLogging ? 'enabled' : 'disabled'}`
    );
  }, [state]);

  const togglePerformanceOverlay = useCallback(() => {
    const newState = { ...state, showPerformanceOverlay: !state.showPerformanceOverlay };
    setState(newState);
    saveDeveloperModeState(newState);

    console.log(
      `[DeveloperMode] Performance overlay ${newState.showPerformanceOverlay ? 'enabled' : 'disabled'}`
    );
  }, [state]);

  const toggleAccessibilityOverlay = useCallback(() => {
    const newState = { ...state, showAccessibilityOverlay: !state.showAccessibilityOverlay };
    setState(newState);
    saveDeveloperModeState(newState);

    console.log(
      `[DeveloperMode] Accessibility overlay ${newState.showAccessibilityOverlay ? 'enabled' : 'disabled'}`
    );
  }, [state]);

  const toggleComponentLifecycleLogging = useCallback(() => {
    const newState = { ...state, componentLifecycleLogging: !state.componentLifecycleLogging };
    setState(newState);
    saveDeveloperModeState(newState);

    console.log(
      `[DeveloperMode] Component lifecycle logging ${newState.componentLifecycleLogging ? 'enabled' : 'disabled'}`
    );
  }, [state]);

  /**
   * Handle version tap for developer mode activation
   * Requires 10 rapid taps within 3 seconds
   */
  const handleVersionTap = useCallback(() => {
    // Clear existing timeout
    if (tapTimeout) {
      clearTimeout(tapTimeout);
    }

    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);

    // Enable developer mode on 10th tap
    if (newTapCount >= REQUIRED_TAPS) {
      setTapCount(0);
      setTapTimeout(null);

      // Toggle developer mode
      const newState = { ...state, enabled: !state.enabled };
      setState(newState);
      saveDeveloperModeState(newState);

      if (newState.enabled) {
        console.log('[DeveloperMode] 🔧 Developer mode activated! (10 rapid taps detected)');
      } else {
        console.log('[DeveloperMode] Developer mode deactivated');
      }

      return;
    }

    // Reset tap count after window expires
    const timeout = setTimeout(() => {
      if (__DEV__) {
        console.log(`[DeveloperMode] Tap count reset (${newTapCount}/${REQUIRED_TAPS})`);
      }
      setTapCount(0);
      setTapTimeout(null);
    }, TAP_WINDOW_MS);

    setTapTimeout(timeout);

    if (__DEV__) {
      console.log(`[DeveloperMode] Tap ${newTapCount}/${REQUIRED_TAPS}`);
    }
  }, [tapCount, tapTimeout, state]);

  const value: DeveloperModeContextType = {
    state,
    toggleDeveloperMode,
    toggleVerboseLogging,
    togglePerformanceOverlay,
    toggleAccessibilityOverlay,
    toggleComponentLifecycleLogging,
    handleVersionTap,
    tapCount,
  };

  return <DeveloperModeContext.Provider value={value}>{children}</DeveloperModeContext.Provider>;
}

/**
 * Hook to access developer mode context
 *
 * @example
 * ```tsx
 * const { state, toggleDeveloperMode } = useDeveloperMode();
 * if (state.enabled) {
 *   // Show developer menu
 * }
 * ```
 */
export function useDeveloperMode(): DeveloperModeContextType {
  const context = useContext(DeveloperModeContext);
  if (!context) {
    throw new Error('useDeveloperMode must be used within DeveloperModeProvider');
  }
  return context;
}
