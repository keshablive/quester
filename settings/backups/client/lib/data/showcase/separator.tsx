import React from 'react';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const separatorShowcaseData: ShowcaseComponentData = {
  id: 'separator',
  name: 'Separator',
  description:
    'Visual divider for separating content sections. Implements FR-006 with accessibilityRole="separator".',
  category: 'layout',
  imports: ['@/components/ui/separator'],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'Implements accessibilityRole="separator" for screen readers (FR-006)',
    'Decorative separators hidden from screen readers by default',
    'Non-decorative separators announced for navigation structure',
    'Sufficient color contrast for visibility (3:1 minimum)',
    'Proper orientation (horizontal/vertical) communicated',
    'Works with high contrast mode',
    'Appropriate spacing for visual separation',
    'Flexible sizing for different layouts',
  ],
  variants: [
    {
      id: 'horizontal',
      label: 'Horizontal',
      description: 'Default horizontal separator',
      preview: (
        <View className="w-full gap-3">
          <Text>Content above</Text>
          <Separator />
          <Text>Content below</Text>
        </View>
      ),
      code: `<View className="gap-3">
  <Text>Content above</Text>
  <Separator />
  <Text>Content below</Text>
</View>`,
    },
    {
      id: 'vertical',
      label: 'Vertical',
      description: 'Vertical separator for inline content',
      preview: (
        <View className="h-8 flex-row items-center gap-3">
          <Text>Left</Text>
          <Separator orientation="vertical" />
          <Text>Center</Text>
          <Separator orientation="vertical" />
          <Text>Right</Text>
        </View>
      ),
      code: `<View className="flex-row items-center gap-3 h-8">
  <Text>Left</Text>
  <Separator orientation="vertical" />
  <Text>Center</Text>
  <Separator orientation="vertical" />
  <Text>Right</Text>
</View>`,
    },
    {
      id: 'in-list',
      label: 'In List',
      description: 'Separating list items',
      preview: (
        <View className="w-full gap-0">
          <View className="py-3">
            <Text className="font-semibold">Item 1</Text>
            <Text className="text-sm text-muted-foreground">Description for item 1</Text>
          </View>
          <Separator />
          <View className="py-3">
            <Text className="font-semibold">Item 2</Text>
            <Text className="text-sm text-muted-foreground">Description for item 2</Text>
          </View>
          <Separator />
          <View className="py-3">
            <Text className="font-semibold">Item 3</Text>
            <Text className="text-sm text-muted-foreground">Description for item 3</Text>
          </View>
        </View>
      ),
      code: `<View className="gap-0">
  <View className="py-3">
    <Text className="font-semibold">Item 1</Text>
    <Text className="text-sm text-muted-foreground">Description</Text>
  </View>
  <Separator />
  <View className="py-3">
    <Text className="font-semibold">Item 2</Text>
    <Text className="text-sm text-muted-foreground">Description</Text>
  </View>
  <Separator />
  <View className="py-3">
    <Text className="font-semibold">Item 3</Text>
    <Text className="text-sm text-muted-foreground">Description</Text>
  </View>
</View>`,
    },
    {
      id: 'section',
      label: 'Section Divider',
      description: 'Dividing major sections',
      preview: (
        <View className="w-full gap-4">
          <View>
            <Text variant="h4">Section 1</Text>
            <Text variant="p">Content for the first section goes here.</Text>
          </View>
          <Separator className="my-2" />
          <View>
            <Text variant="h4">Section 2</Text>
            <Text variant="p">Content for the second section goes here.</Text>
          </View>
        </View>
      ),
      code: `<View className="gap-4">
  <View>
    <Text variant="h4">Section 1</Text>
    <Text variant="p">Content for the first section.</Text>
  </View>
  <Separator className="my-2" />
  <View>
    <Text variant="h4">Section 2</Text>
    <Text variant="p">Content for the second section.</Text>
  </View>
</View>`,
    },
    {
      id: 'toolbar',
      label: 'Toolbar Divider',
      description: 'Separating toolbar groups',
      preview: (
        <View className="flex-row items-center gap-2 rounded-md border border-border p-2">
          <Text className="text-sm">File</Text>
          <Text className="text-sm">Edit</Text>
          <Separator orientation="vertical" className="h-6" />
          <Text className="text-sm">View</Text>
          <Text className="text-sm">Help</Text>
        </View>
      ),
      code: `<View className="flex-row items-center gap-2 p-2 border border-border rounded-md">
  <Text className="text-sm">File</Text>
  <Text className="text-sm">Edit</Text>
  <Separator orientation="vertical" className="h-6" />
  <Text className="text-sm">View</Text>
  <Text className="text-sm">Help</Text>
</View>`,
    },
    {
      id: 'thick',
      label: 'Thick Separator',
      description: 'Bolder separator for emphasis',
      preview: (
        <View className="w-full gap-3">
          <Text variant="h4">Important Section</Text>
          <Separator className="h-[2px] bg-primary" />
          <Text>This section is visually separated with a thicker line.</Text>
        </View>
      ),
      code: `<View className="gap-3">
  <Text variant="h4">Important Section</Text>
  <Separator className="h-[2px] bg-primary" />
  <Text>This section is visually separated.</Text>
</View>`,
    },
  ],
};
