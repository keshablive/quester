/**
 * Collapsible Component
 *
 * Implements FR-006: accessibilityRole="button" for trigger
 * Implements FR-010: Expanded state announcements
 *
 * Note: @rn-primitives/collapsible handles accessibility internally.
 * This is a thin wrapper maintaining RNR patterns.
 */
import * as CollapsiblePrimitive from '@rn-primitives/collapsible';

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.Trigger;

const CollapsibleContent = CollapsiblePrimitive.Content;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
