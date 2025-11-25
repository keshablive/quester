import React, { useState } from 'react';
import { Toggle } from '@/components/ui/toggle';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const toggleShowcaseData: ShowcaseComponentData = {
  id: 'toggle',
  name: 'Toggle',
  description:
    'Button-like toggle for binary states. Implements FR-006 accessibilityRole="button" and keyboard support. Useful as an alternative to switches for compact layouts.',
  category: 'form',
  imports: ["import { Toggle } from '@/components/ui/toggle';"],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'FR-006: Toggle exposes accessibilityRole and supports keyboard activation',
    'Provide clear labels for toggle meaning',
    'Use aria-pressed semantics on web where relevant',
    'Ensure visible focus styles for keyboard users',
    'Supporting group semantics via ToggleGroup when available',
    'Touch target meets minimum accessibility size',
    'Provide disabled state for unavailable actions',
    'Use descriptive accessible labels when icon-only',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default',
      description: 'Simple toggle button',
      preview: (() => {
        const [pressed, setPressed] = useState(false);
        return (
          <View>
            <Toggle pressed={pressed} onPressedChange={setPressed}>
              <Text>Toggle</Text>
            </Toggle>
          </View>
        );
      })(),
      code: `const [pressed, setPressed] = useState(false);\n<Toggle pressed={pressed} onPressedChange={setPressed}>Toggle</Toggle>`,
    },
    {
      id: 'outline',
      label: 'Outline',
      description: 'Outlined toggle style',
      preview: (() => {
        const [pressed, setPressed] = useState(false);
        return (
          <Toggle className="outline" pressed={pressed} onPressedChange={setPressed}>
            <Text>Toggle</Text>
          </Toggle>
        );
      })(),
      code: `const [pressed, setPressed] = useState(false);\n<Toggle className=\"outline\" pressed={pressed} onPressedChange={setPressed}>Toggle</Toggle>`,
    },
    {
      id: 'icon-only',
      label: 'Icon Only',
      description: 'Toggle that only displays an icon (use accessibilityLabel)',
      preview: (() => {
        const [pressed, setPressed] = useState(false);
        return (
          <Toggle accessibilityLabel="Bold" pressed={pressed} onPressedChange={setPressed}>
            <Text>B</Text>
          </Toggle>
        );
      })(),
      code: `const [pressed, setPressed] = useState(false);\n<Toggle accessibilityLabel=\"Bold\" pressed={pressed} onPressedChange={setPressed}>...</Toggle>`,
    },
    {
      id: 'disabled',
      label: 'Disabled',
      description: 'Disabled toggle',
      preview: (() => {
        const [pressed, setPressed] = useState(false);
        return (
          <Toggle disabled pressed={pressed} onPressedChange={setPressed}>
            <Text>Off</Text>
          </Toggle>
        );
      })(),
      code: `const [pressed, setPressed] = useState(false);\n<Toggle disabled pressed={pressed} onPressedChange={setPressed}>Off</Toggle>`,
    },
    {
      id: 'grouped',
      label: 'Grouped',
      description: 'Example of toggles used in a group (use ToggleGroup in the real UI)',
      preview: (() => {
        const [aPressed, setAPressed] = useState(false);
        const [bPressed, setBPressed] = useState(false);
        return (
          <View className="flex-row gap-2">
            <Toggle pressed={aPressed} onPressedChange={setAPressed}>
              <Text>A</Text>
            </Toggle>
            <Toggle pressed={bPressed} onPressedChange={setBPressed}>
              <Text>B</Text>
            </Toggle>
          </View>
        );
      })(),
      code: `// Prefer ToggleGroup for grouped behavior; otherwise manage each toggle's pressed state:\nconst [aPressed, setAPressed] = useState(false);\nconst [bPressed, setBPressed] = useState(false);\n<Toggle pressed={aPressed} onPressedChange={setAPressed}>A</Toggle>\n<Toggle pressed={bPressed} onPressedChange={setBPressed}>B</Toggle>`,
    },
    {
      id: 'compact',
      label: 'Compact',
      description: 'Smaller toggle appearance for dense UIs',
      preview: (() => {
        const [pressed, setPressed] = useState(false);
        return (
          <Toggle className="size-sm" pressed={pressed} onPressedChange={setPressed}>
            <Text>Sm</Text>
          </Toggle>
        );
      })(),
      code: `const [pressed, setPressed] = useState(false);\n<Toggle className=\"size-sm\" pressed={pressed} onPressedChange={setPressed}>Sm</Toggle>`,
    },
  ],
};
