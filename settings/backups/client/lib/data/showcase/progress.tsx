import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const progressShowcaseData: ShowcaseComponentData = {
  id: 'progress',
  name: 'Progress',
  description:
    'Visual progress indicator with animated transitions. Implements FR-006 with accessibilityRole="progressbar".',
  category: 'feedback',
  imports: ['@/components/ui/progress'],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'Implements accessibilityRole="progressbar" for screen readers (FR-006)',
    'Uses accessibilityValue to communicate current progress (now, min, max)',
    'Animated transitions provide visual feedback',
    'Progress percentage announced by screen readers',
    'Sufficient color contrast for visibility',
    'High contrast mode compatible',
    'Determinate progress communicated clearly',
    'Smooth spring animation for value changes',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default',
      description: 'Basic progress bar',
      preview: (
        <View className="w-full">
          <Progress value={60} />
        </View>
      ),
      code: `<Progress value={60} />`,
    },
    {
      id: 'with-label',
      label: 'With Label',
      description: 'Progress bar with percentage label',
      preview: (
        <View className="w-full gap-2">
          <View className="flex-row justify-between">
            <Text className="text-sm font-medium">Uploading...</Text>
            <Text className="text-sm text-muted-foreground">75%</Text>
          </View>
          <Progress value={75} />
        </View>
      ),
      code: `<View className="gap-2">
  <View className="flex-row justify-between">
    <Text className="text-sm font-medium">Uploading...</Text>
    <Text className="text-sm text-muted-foreground">{progress}%</Text>
  </View>
  <Progress value={progress} />
</View>`,
    },
    {
      id: 'sizes',
      label: 'Different Sizes',
      description: 'Progress bars in various heights',
      preview: (
        <View className="w-full gap-4">
          <View className="gap-1">
            <Text className="text-xs text-muted-foreground">Small</Text>
            <Progress value={50} className="h-1" />
          </View>
          <View className="gap-1">
            <Text className="text-xs text-muted-foreground">Default</Text>
            <Progress value={50} />
          </View>
          <View className="gap-1">
            <Text className="text-xs text-muted-foreground">Large</Text>
            <Progress value={50} className="h-3" />
          </View>
        </View>
      ),
      code: `{/* Small */}
<Progress value={50} className="h-1" />

{/* Default */}
<Progress value={50} />

{/* Large */}
<Progress value={50} className="h-3" />`,
    },
    {
      id: 'colors',
      label: 'Different Colors',
      description: 'Progress with custom indicator colors',
      preview: (
        <View className="w-full gap-4">
          <View className="gap-1">
            <Text className="text-xs">Success</Text>
            <Progress value={80} indicatorClassName="bg-green-500" />
          </View>
          <View className="gap-1">
            <Text className="text-xs">Warning</Text>
            <Progress value={50} indicatorClassName="bg-yellow-500" />
          </View>
          <View className="gap-1">
            <Text className="text-xs">Error</Text>
            <Progress value={30} indicatorClassName="bg-red-500" />
          </View>
        </View>
      ),
      code: `{/* Success */}
<Progress value={80} indicatorClassName="bg-green-500" />

{/* Warning */}
<Progress value={50} indicatorClassName="bg-yellow-500" />

{/* Error */}
<Progress value={30} indicatorClassName="bg-red-500" />`,
    },
    {
      id: 'course-progress',
      label: 'Course Progress',
      description: 'Progress in a course card',
      preview: (
        <View className="w-full gap-3 rounded-lg border border-border p-4">
          <View>
            <Text className="font-semibold">Introduction to React Native</Text>
            <Text className="text-sm text-muted-foreground">12 of 20 lessons completed</Text>
          </View>
          <View className="gap-1">
            <Progress value={60} />
            <Text className="text-right text-xs text-muted-foreground">60% complete</Text>
          </View>
        </View>
      ),
      code: `<View className="gap-3 p-4 border border-border rounded-lg">
  <View>
    <Text className="font-semibold">{course.title}</Text>
    <Text className="text-sm text-muted-foreground">
      {completed} of {total} lessons completed
    </Text>
  </View>
  <View className="gap-1">
    <Progress value={progress} />
    <Text className="text-xs text-right text-muted-foreground">
      {progress}% complete
    </Text>
  </View>
</View>`,
    },
    {
      id: 'stages',
      label: 'Multi-Stage Progress',
      description: 'Progress with stage indicators',
      preview: (
        <View className="w-full gap-2">
          <View className="flex-row justify-between px-1">
            <Text className="text-xs font-medium">Stage 2 of 4</Text>
            <Text className="text-xs text-muted-foreground">50%</Text>
          </View>
          <Progress value={50} className="h-2" />
          <View className="flex-row justify-between px-1">
            <Text className="text-xs text-muted-foreground">Setup</Text>
            <Text className="text-xs text-muted-foreground">Profile</Text>
            <Text className="text-xs text-muted-foreground">Preferences</Text>
            <Text className="text-xs text-muted-foreground">Complete</Text>
          </View>
        </View>
      ),
      code: `<View className="gap-2">
  <View className="flex-row justify-between px-1">
    <Text className="text-xs font-medium">Stage {current} of {total}</Text>
    <Text className="text-xs text-muted-foreground">{progress}%</Text>
  </View>
  <Progress value={progress} className="h-2" />
  <View className="flex-row justify-between px-1">
    {stages.map((stage) => (
      <Text key={stage} className="text-xs text-muted-foreground">
        {stage}
      </Text>
    ))}
  </View>
</View>`,
    },
  ],
};
