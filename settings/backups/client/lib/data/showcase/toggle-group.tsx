import React, { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const toggleGroupShowcaseData: ShowcaseComponentData = {
  id: 'toggle-group',
  name: 'Toggle Group',
  description:
    'Group of toggles for single or multiple selection. Implements FR-006 accessibilityRole="radiogroup" and keyboard navigation. Useful for toolbar buttons or filter groups.',
  category: 'form',
  imports: ["import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';"],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'FR-006: ToggleGroup exposes accessibilityRole="radiogroup" for screen readers',
    'Keyboard navigation: Arrow keys navigate between items',
    'Use type="single" for exclusive selection (radio behavior)',
    'Use type="multiple" for multi-select (checkbox behavior)',
    'Provide clear labels or icons with accessibilityLabel',
    'Ensure selected state is programmatically announced',
    'Touch targets meet minimum size requirements',
    'Support disabled state for unavailable options',
  ],
  variants: [
    {
      id: 'single',
      label: 'Single Selection',
      description: 'Toggle group with single selection (radio behavior)',
      preview: (() => {
        const [value, setValue] = useState<string | undefined>('left');
        return (
          <ToggleGroup type="single" value={value} onValueChange={setValue}>
            <ToggleGroupItem value="left" aria-label="Align left" isFirst>
              <Text>Left</Text>
            </ToggleGroupItem>
            <ToggleGroupItem value="center" aria-label="Align center">
              <Text>Center</Text>
            </ToggleGroupItem>
            <ToggleGroupItem value="right" aria-label="Align right" isLast>
              <Text>Right</Text>
            </ToggleGroupItem>
          </ToggleGroup>
        );
      })(),
      code: `const [value, setValue] = useState('left');\n<ToggleGroup type="single" value={value} onValueChange={setValue}>\n  <ToggleGroupItem value="left" isFirst>Left</ToggleGroupItem>\n  <ToggleGroupItem value="center">Center</ToggleGroupItem>\n  <ToggleGroupItem value="right" isLast>Right</ToggleGroupItem>\n</ToggleGroup>`,
    },
    {
      id: 'multiple',
      label: 'Multiple Selection',
      description: 'Toggle group with multiple selection (checkbox behavior)',
      preview: (() => {
        const [value, setValue] = useState<string[]>(['bold']);
        return (
          <ToggleGroup type="multiple" value={value} onValueChange={setValue}>
            <ToggleGroupItem value="bold" aria-label="Bold" isFirst>
              <Text>B</Text>
            </ToggleGroupItem>
            <ToggleGroupItem value="italic" aria-label="Italic">
              <Text>I</Text>
            </ToggleGroupItem>
            <ToggleGroupItem value="underline" aria-label="Underline" isLast>
              <Text>U</Text>
            </ToggleGroupItem>
          </ToggleGroup>
        );
      })(),
      code: `const [value, setValue] = useState(['bold']);\n<ToggleGroup type="multiple" value={value} onValueChange={setValue}>\n  <ToggleGroupItem value="bold" isFirst>B</ToggleGroupItem>\n  <ToggleGroupItem value="italic">I</ToggleGroupItem>\n  <ToggleGroupItem value="underline" isLast>U</ToggleGroupItem>\n</ToggleGroup>`,
    },
    {
      id: 'outline',
      label: 'Outline Variant',
      description: 'Toggle group with outline styling',
      preview: (() => {
        const [value, setValue] = useState<string | undefined>('1');
        return (
          <ToggleGroup type="single" variant="outline" value={value} onValueChange={setValue}>
            <ToggleGroupItem value="1" aria-label="Option 1" isFirst>
              <Text>1</Text>
            </ToggleGroupItem>
            <ToggleGroupItem value="2" aria-label="Option 2">
              <Text>2</Text>
            </ToggleGroupItem>
            <ToggleGroupItem value="3" aria-label="Option 3" isLast>
              <Text>3</Text>
            </ToggleGroupItem>
          </ToggleGroup>
        );
      })(),
      code: `<ToggleGroup type="single" variant="outline" value={value} onValueChange={setValue}>...</ToggleGroup>`,
    },
    {
      id: 'disabled',
      label: 'Disabled Items',
      description: 'Toggle group with some disabled items',
      preview: (() => {
        const [value, setValue] = useState<string | undefined>('a');
        return (
          <ToggleGroup type="single" value={value} onValueChange={setValue}>
            <ToggleGroupItem value="a" aria-label="Available" isFirst>
              <Text>A</Text>
            </ToggleGroupItem>
            <ToggleGroupItem value="b" aria-label="Disabled" disabled>
              <Text>B</Text>
            </ToggleGroupItem>
            <ToggleGroupItem value="c" aria-label="Available" isLast>
              <Text>C</Text>
            </ToggleGroupItem>
          </ToggleGroup>
        );
      })(),
      code: `<ToggleGroupItem value="b" disabled>B</ToggleGroupItem>`,
    },
    {
      id: 'size-variants',
      label: 'Size Variants',
      description: 'Toggle group with different sizes',
      preview: (() => {
        const [value, setValue] = useState<string | undefined>('m');
        return (
          <View className="gap-4">
            <ToggleGroup type="single" size="sm" value={value} onValueChange={setValue}>
              <ToggleGroupItem value="s" aria-label="Small" isFirst>
                <Text>S</Text>
              </ToggleGroupItem>
              <ToggleGroupItem value="m" aria-label="Medium" isLast>
                <Text>M</Text>
              </ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup type="single" size="lg" value={value} onValueChange={setValue}>
              <ToggleGroupItem value="l" aria-label="Large" isFirst>
                <Text>L</Text>
              </ToggleGroupItem>
              <ToggleGroupItem value="xl" aria-label="Extra Large" isLast>
                <Text>XL</Text>
              </ToggleGroupItem>
            </ToggleGroup>
          </View>
        );
      })(),
      code: `<ToggleGroup type="single" size="sm">...</ToggleGroup>\n<ToggleGroup type="single" size="lg">...</ToggleGroup>`,
    },
    {
      id: 'toolbar',
      label: 'Toolbar Example',
      description: 'Toggle group used in a toolbar context',
      preview: (() => {
        const [textFormat, setTextFormat] = useState<string[]>([]);
        const [alignment, setAlignment] = useState<string | undefined>('left');
        return (
          <View className="gap-2">
            <ToggleGroup type="multiple" value={textFormat} onValueChange={setTextFormat}>
              <ToggleGroupItem value="bold" aria-label="Bold" isFirst>
                <Text className="font-bold">B</Text>
              </ToggleGroupItem>
              <ToggleGroupItem value="italic" aria-label="Italic">
                <Text className="italic">I</Text>
              </ToggleGroupItem>
              <ToggleGroupItem value="strike" aria-label="Strikethrough" isLast>
                <Text>S</Text>
              </ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup type="single" value={alignment} onValueChange={setAlignment}>
              <ToggleGroupItem value="left" aria-label="Align left" isFirst>
                <Text>L</Text>
              </ToggleGroupItem>
              <ToggleGroupItem value="center" aria-label="Align center">
                <Text>C</Text>
              </ToggleGroupItem>
              <ToggleGroupItem value="right" aria-label="Align right" isLast>
                <Text>R</Text>
              </ToggleGroupItem>
            </ToggleGroup>
          </View>
        );
      })(),
      code: `// Combine multiple toggle groups for rich toolbar UIs`,
    },
  ],
};
