import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { View } from 'react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const skeletonShowcaseData: ShowcaseComponentData = {
  id: 'skeleton',
  name: 'Skeleton',
  description:
    'Loading placeholder component with pulse animation. Uses aria-hidden pattern for decorative content (WCAG 4.1.2).',
  category: 'feedback',
  imports: ['@/components/ui/skeleton'],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'Uses aria-hidden pattern - not announced to screen readers',
    'Decorative placeholder hidden from assistive technology',
    'Parent component should provide loading state announcement',
    'Pulse animation provides visual loading feedback',
    'Sufficient contrast for visibility in loading state',
    'Does not interfere with keyboard navigation',
    'Parent should use accessibilityLiveRegion for updates',
    'Temporary placeholder replaced with actual content',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default',
      description: 'Basic skeleton shape',
      preview: <Skeleton className="h-12 w-full" />,
      code: `<Skeleton className="h-12 w-full" />`,
    },
    {
      id: 'circle',
      label: 'Circle',
      description: 'Circular skeleton for avatars',
      preview: <Skeleton className="size-12 rounded-full" />,
      code: `<Skeleton className="size-12 rounded-full" />`,
    },
    {
      id: 'card',
      label: 'Card Skeleton',
      description: 'Skeleton layout for card loading',
      preview: (
        <View className="w-full gap-3 rounded-lg border border-border p-4">
          <View className="flex-row items-center gap-3">
            <Skeleton className="size-12 rounded-full" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-4 w-[60%]" />
              <Skeleton className="h-3 w-[40%]" />
            </View>
          </View>
          <Skeleton className="h-32 w-full" />
          <View className="gap-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[90%]" />
            <Skeleton className="h-3 w-[80%]" />
          </View>
        </View>
      ),
      code: `<View className="gap-3 p-4 border border-border rounded-lg">
  <View className="flex-row items-center gap-3">
    <Skeleton className="size-12 rounded-full" />
    <View className="flex-1 gap-2">
      <Skeleton className="h-4 w-[60%]" />
      <Skeleton className="h-3 w-[40%]" />
    </View>
  </View>
  <Skeleton className="h-32 w-full" />
  <View className="gap-2">
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-[90%]" />
    <Skeleton className="h-3 w-[80%]" />
  </View>
</View>`,
    },
    {
      id: 'list',
      label: 'List Skeleton',
      description: 'Skeleton for list items',
      preview: (
        <View className="w-full gap-3">
          <View className="flex-row items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-4 w-[70%]" />
              <Skeleton className="h-3 w-[50%]" />
            </View>
          </View>
          <View className="flex-row items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-4 w-[70%]" />
              <Skeleton className="h-3 w-[50%]" />
            </View>
          </View>
          <View className="flex-row items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-4 w-[70%]" />
              <Skeleton className="h-3 w-[50%]" />
            </View>
          </View>
        </View>
      ),
      code: `<View className="gap-3">
  {Array.from({ length: 3 }).map((_, i) => (
    <View key={i} className="flex-row items-center gap-3">
      <Skeleton className="size-10 rounded-full" />
      <View className="flex-1 gap-2">
        <Skeleton className="h-4 w-[70%]" />
        <Skeleton className="h-3 w-[50%]" />
      </View>
    </View>
  ))}
</View>`,
    },
    {
      id: 'text-block',
      label: 'Text Block',
      description: 'Skeleton for paragraph content',
      preview: (
        <View className="w-full gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[95%]" />
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[85%]" />
        </View>
      ),
      code: `<View className="gap-2">
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-[95%]" />
  <Skeleton className="h-4 w-[90%]" />
  <Skeleton className="h-4 w-[85%]" />
</View>`,
    },
    {
      id: 'course-card',
      label: 'Course Card Skeleton',
      description: 'Skeleton for course listings',
      preview: (
        <View className="w-full gap-3 rounded-lg border border-border p-4">
          <Skeleton className="h-40 w-full rounded-md" />
          <View className="gap-2">
            <Skeleton className="h-5 w-[80%]" />
            <Skeleton className="h-3 w-[60%]" />
          </View>
          <View className="flex-row items-center gap-2">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-3 w-24" />
          </View>
          <View className="flex-row items-center justify-between">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </View>
        </View>
      ),
      code: `<View className="gap-3 p-4 border border-border rounded-lg">
  <Skeleton className="h-40 w-full rounded-md" />
  <View className="gap-2">
    <Skeleton className="h-5 w-[80%]" />
    <Skeleton className="h-3 w-[60%]" />
  </View>
  <View className="flex-row items-center gap-2">
    <Skeleton className="size-6 rounded-full" />
    <Skeleton className="h-3 w-24" />
  </View>
  <View className="flex-row justify-between items-center">
    <Skeleton className="h-6 w-16" />
    <Skeleton className="h-8 w-20 rounded-md" />
  </View>
</View>`,
    },
  ],
};
