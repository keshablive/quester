import React from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const collapsibleShowcaseData: ShowcaseComponentData = {
  id: 'collapsible',
  name: 'Collapsible',
  description:
    'Collapsible panel for showing/hiding content. Implements FR-006 and FR-010 accessibility patterns (trigger role and expanded/collapsed announcements). Useful for progressive disclosure.',
  category: 'layout',
  imports: [
    "import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';",
  ],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'FR-006: Trigger exposes accessibilityRole="button"',
    'FR-010: Expanded/collapsed state is programmatically available',
    'Keyboard accessible: Enter/Space toggles the trigger',
    'Focus remains logical when content expands/collapses',
    'Supports nested collapsibles',
    'Use for progressive disclosure to reduce cognitive load',
    'ARIA attributes managed by primitive for screen readers',
    'Animations are non-blocking and short (200ms)',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default',
      description: 'Simple collapsible with text content',
      preview: (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline">Toggle Details</Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <View className="p-3">
              <Text>
                These are additional details revealed when the collapsible opens. Use collapsible
                panels for optional content.
              </Text>
            </View>
          </CollapsibleContent>
        </Collapsible>
      ),
      code: `<Collapsible>
  <CollapsibleTrigger asChild>
    <Button variant="outline">Toggle Details</Button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    <View className="p-3">
      <Text>Your extra content goes here</Text>
    </View>
  </CollapsibleContent>
</Collapsible>`,
    },
    {
      id: 'accordion-style',
      label: 'Accordion Style',
      description: 'Multiple collapsibles together to form an accordion-like UI',
      preview: (
        <View className="gap-2">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost">Section A</Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <View className="p-2">
                <Text>Content for section A</Text>
              </View>
            </CollapsibleContent>
          </Collapsible>
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost">Section B</Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <View className="p-2">
                <Text>Content for section B</Text>
              </View>
            </CollapsibleContent>
          </Collapsible>
        </View>
      ),
      code: `// Two Collapsible components stacked to create accordion behavior`,
    },
    {
      id: 'controlled',
      label: 'Controlled State',
      description: 'Programmatically control open/close state',
      preview: (
        <View>
          {/* Example code uses controlled API in real app */}
          <Text className="text-sm text-muted-foreground">
            Use value/onValueChange in the real component
          </Text>
        </View>
      ),
      code: `// Use controlled API if primitive exposes value/onValueChange. Example depends on implementation.`,
    },
    {
      id: 'nested',
      label: 'Nested',
      description: 'Collapsible inside a collapsible for nested disclosure',
      preview: (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline">Parent</Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <View className="p-2">
              <Text>Parent content</Text>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost">Child</Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <View className="p-2">
                    <Text>Child content</Text>
                  </View>
                </CollapsibleContent>
              </Collapsible>
            </View>
          </CollapsibleContent>
        </Collapsible>
      ),
      code: `// Nested Collapsible example`,
    },
    {
      id: 'with-icons',
      label: 'With Icons',
      description: 'Collapsible trigger with icon indicator',
      preview: (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline">More Info</Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <View className="p-2">
              <Text>Icon indicators are optional and should be paired with state changes.</Text>
            </View>
          </CollapsibleContent>
        </Collapsible>
      ),
      code: `// Trigger can include icons to indicate state`,
    },
  ],
};
