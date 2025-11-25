/**
 * Developer Mode State Type Definitions
 * 
 * Type definitions for developer mode context and state management.
 * 
 * Implements FR-032, FR-033
 * 
 * @module developer-mode
 */

/**
 * Developer mode state
 */
export interface DeveloperModeState {
  /** Developer mode is enabled (activated via 10 rapid taps) */
  enabled: boolean;

  /** Verbose component lifecycle logging enabled */
  verboseLogging: boolean;

  /** Show performance metrics overlay */
  showPerformanceOverlay: boolean;

  /** Show accessibility audit overlay */
  showAccessibilityOverlay: boolean;
}

/**
 * Developer mode settings
 */
export interface DeveloperModeSettings {
  /** Enable/disable developer mode globally */
  enabled: boolean;

  /** Performance monitoring settings */
  performance: {
    /** Track component render times */
    trackRenderTimes: boolean;

    /** Track frame drops */
    trackFrameDrops: boolean;

    /** Show performance overlay */
    showOverlay: boolean;

    /** Alert threshold for slow renders (ms) */
    slowRenderThreshold: number;
  };

  /** Accessibility audit settings */
  accessibility: {
    /** Run accessibility audits on render */
    auditOnRender: boolean;

    /** Show accessibility overlay */
    showOverlay: boolean;

    /** Show warnings in console */
    showWarnings: boolean;
  };

  /** Logging settings */
  logging: {
    /** Enable verbose component lifecycle logging */
    verbose: boolean;

    /** Log performance metrics */
    logPerformance: boolean;

    /** Log accessibility issues */
    logAccessibility: boolean;

    /** Log error boundary catches */
    logErrors: boolean;
  };

  /** Component showcase settings */
  showcase: {
    /** Show component showcase in navigation */
    visible: boolean;

    /** Show code snippets in showcase */
    showCode: boolean;

    /** Show accessibility notes */
    showAccessibilityNotes: boolean;

    /** Show WCAG criteria */
    showWcagCriteria: boolean;
  };
}

/**
 * Default developer mode settings
 */
export const DEFAULT_DEVELOPER_MODE_SETTINGS: DeveloperModeSettings = {
  enabled: false,
  performance: {
    trackRenderTimes: true,
    trackFrameDrops: true,
    showOverlay: false,
    slowRenderThreshold: 1000, // 1 second (SC-006)
  },
  accessibility: {
    auditOnRender: false, // Too expensive for production
    showOverlay: false,
    showWarnings: true,
  },
  logging: {
    verbose: false,
    logPerformance: true,
    logAccessibility: true,
    logErrors: true,
  },
  showcase: {
    visible: false,
    showCode: true,
    showAccessibilityNotes: true,
    showWcagCriteria: true,
  },
};

/**
 * Developer mode activation method
 */
export interface DeveloperModeActivation {
  /** Method used to activate developer mode */
  method: 'tap-sequence' | 'settings' | 'code';

  /** Timestamp of activation */
  timestamp: number;

  /** Number of taps (if method is 'tap-sequence') */
  tapCount?: number;
}

/**
 * Developer mode analytics event
 */
export interface DeveloperModeEvent {
  /** Event type */
  type: 'activated' | 'deactivated' | 'setting-changed' | 'showcase-viewed';

  /** Activation details (if type is 'activated') */
  activation?: DeveloperModeActivation;

  /** Setting that changed (if type is 'setting-changed') */
  setting?: string;

  /** New value (if type is 'setting-changed') */
  value?: unknown;

  /** Component viewed in showcase (if type is 'showcase-viewed') */
  component?: string;

  /** Timestamp */
  timestamp: number;
}

/**
 * Type guard to check if developer mode is enabled
 */
export function isDeveloperModeEnabled(state: DeveloperModeState): boolean {
  return state.enabled;
}

/**
 * Type guard to check if verbose logging is enabled
 */
export function isVerboseLoggingEnabled(state: DeveloperModeState): boolean {
  return state.enabled && state.verboseLogging;
}

/**
 * Type guard to check if showcase should be visible
 */
export function isShowcaseVisible(settings: DeveloperModeSettings): boolean {
  return settings.enabled && settings.showcase.visible;
}
