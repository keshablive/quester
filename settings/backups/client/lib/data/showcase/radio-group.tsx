import React, { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const radioGroupShowcaseData: ShowcaseComponentData = {
  id: 'radio-group',
  name: 'Radio Group',
  description:
    'Radio group for single-choice selection. Implements FR-006 accessibilityRole="radio" and keyboard navigation. Use with labels for form accessibility.',
  category: 'form',
  imports: ["import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';"],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'FR-006: Each RadioGroupItem has accessibilityRole="radio"',
    'Only one item can be selected at a time in a radio group',
    'Keyboard navigation: Arrow keys move focus between radios',
    'Label association via surrounding text improves screen reader announcements',
    'Use radio groups for exclusive choices',
    'Provide descriptive labels for each option',
    'Ensure checked state is programmatically exposed',
    'Support disabled states for items',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default',
      description: 'Simple radio group with three options',
      preview: (() => {
        const [value, setValue] = useState<string | undefined>('option-1');
        return (
          <RadioGroup value={value} onValueChange={setValue}>
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <RadioGroupItem value="option-1" />
                <Text>Option 1</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <RadioGroupItem value="option-2" />
                <Text>Option 2</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <RadioGroupItem value="option-3" />
                <Text>Option 3</Text>
              </View>
            </View>
          </RadioGroup>
        );
      })(),
      code: `// Controlled example:\nconst [value, setValue] = useState('option-1');\n<RadioGroup value={value} onValueChange={setValue}>\n  <RadioGroupItem value=\"option-1\" />\n  <RadioGroupItem value=\"option-2\" />\n  <RadioGroupItem value=\"option-3\" />\n</RadioGroup>`,
    },
    {
      id: 'disabled',
      label: 'Disabled Option',
      description: 'One option disabled',
      preview: (() => {
        const [value, setValue] = useState<string | undefined>('a');
        return (
          <RadioGroup value={value} onValueChange={setValue}>
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <RadioGroupItem value="a" />
                <Text>Available</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <RadioGroupItem value="b" disabled />
                <Text className="text-muted-foreground">Unavailable</Text>
              </View>
            </View>
          </RadioGroup>
        );
      })(),
      code: `// RadioGroup example with a disabled item`,
    },
    {
      id: 'with-labels',
      label: 'With Labels',
      description: 'Radio options with explicit labels for screen readers',
      preview: (() => {
        const [value, setValue] = useState<string | undefined>('x');
        return (
          <RadioGroup value={value} onValueChange={setValue}>
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <RadioGroupItem value="x" />
                <Text>Small</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <RadioGroupItem value="y" />
                <Text>Medium</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <RadioGroupItem value="z" />
                <Text>Large</Text>
              </View>
            </View>
          </RadioGroup>
        );
      })(),
      code: `// Provide descriptive labels for radio options`,
    },
    {
      id: 'inline',
      label: 'Inline',
      description: 'Inline radio group for compact layouts',
      preview: (() => {
        const [value, setValue] = useState<string | undefined>('1');
        return (
          <RadioGroup value={value} onValueChange={setValue}>
            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center gap-2">
                <RadioGroupItem value="1" />
                <Text>Yes</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <RadioGroupItem value="2" />
                <Text>No</Text>
              </View>
            </View>
          </RadioGroup>
        );
      })(),
      code: `const [value, setValue] = useState('1');\n<RadioGroup value={value} onValueChange={setValue}>...`,
    },
    {
      id: 'controlled',
      label: 'Controlled',
      description: 'Controlled radio group example (use state in real app)',
      preview: (
        <Text className="text-sm text-muted-foreground">
          Use controlled API in the app for external state
        </Text>
      ),
      code: `// Example: const [value, setValue] = useState('1');\n// <RadioGroup value={value} onValueChange={setValue}>...`,
    },
  ],
};
