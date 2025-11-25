/**
 * Test wrapper utilities
 *
 * Provides wrapper components for testing with required providers
 */

import React, { ReactNode } from 'react';
import { AccessibilityProvider } from '@/lib/hooks/use-accessibility';

/**
 * Wrapper for tests that need AccessibilityProvider
 */
export function AccessibilityWrapper({ children }: { children: ReactNode }) {
  return <AccessibilityProvider>{children}</AccessibilityProvider>;
}

/**
 * Default wrapper with all common providers
 */
export function AllProvidersWrapper({ children }: { children: ReactNode }) {
  return <AccessibilityProvider>{children}</AccessibilityProvider>;
}
