import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { CheckCircle, AlertCircle, Star } from 'lucide-react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const badgeShowcaseData: ShowcaseComponentData = {
  id: 'badge',
  name: 'Badge',
  description:
    'Small status indicators and labels with various semantic variants. Uses Text wrapping pattern (FR-001) for proper text rendering.',
  category: 'display',
  imports: ['@/components/ui/badge', '@/components/ui/text'],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'Text meets WCAG AA contrast requirements for all variants',
    'Proper color contrast maintained in high contrast mode',
    'Text wrapping enabled by default (FR-001)',
    'Supports accessibilityLabel for screen reader context',
    'Icon badges include proper icon descriptions',
    'Semantic variants convey meaning through color and text',
    'Sufficient size for readability (not below 12px)',
    'Focus indicators for interactive badges',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default',
      description: 'Primary badge variant',
      preview: (
        <Badge>
          <Text>Default</Text>
        </Badge>
      ),
      code: `<Badge>
  <Text>Default</Text>
</Badge>`,
    },
    {
      id: 'secondary',
      label: 'Secondary',
      description: 'Secondary badge for less emphasis',
      preview: (
        <Badge variant="secondary">
          <Text>Secondary</Text>
        </Badge>
      ),
      code: `<Badge variant="secondary">
  <Text>Secondary</Text>
</Badge>`,
    },
    {
      id: 'destructive',
      label: 'Destructive',
      description: 'Badge for errors or warnings',
      preview: (
        <Badge variant="destructive">
          <Text>Error</Text>
        </Badge>
      ),
      code: `<Badge variant="destructive">
  <Text>Error</Text>
</Badge>`,
    },
    {
      id: 'outline',
      label: 'Outline',
      description: 'Badge with border only',
      preview: (
        <Badge variant="outline">
          <Text>Outline</Text>
        </Badge>
      ),
      code: `<Badge variant="outline">
  <Text>Outline</Text>
</Badge>`,
    },
    {
      id: 'with-icon',
      label: 'With Icon',
      description: 'Badge with leading icon',
      preview: (
        <View className="flex-row gap-2">
          <Badge>
            <Icon as={CheckCircle} size={12} className="text-primary-foreground" />
            <Text>Completed</Text>
          </Badge>
          <Badge variant="destructive">
            <Icon as={AlertCircle} size={12} className="text-destructive-foreground" />
            <Text>Failed</Text>
          </Badge>
        </View>
      ),
      code: `<Badge>
  <Icon as={CheckCircle} size={12} className="text-primary-foreground" />
  <Text>Completed</Text>
</Badge>

<Badge variant="destructive">
  <Icon as={AlertCircle} size={12} className="text-destructive-foreground" />
  <Text>Failed</Text>
</Badge>`,
    },
    {
      id: 'status',
      label: 'Status Badges',
      description: 'Common status indicators',
      preview: (
        <View className="flex-row flex-wrap gap-2">
          <Badge>
            <Text>New</Text>
          </Badge>
          <Badge variant="secondary">
            <Text>In Progress</Text>
          </Badge>
          <Badge>
            <Icon as={CheckCircle} size={12} className="text-primary-foreground" />
            <Text>Completed</Text>
          </Badge>
          <Badge variant="destructive">
            <Text>Cancelled</Text>
          </Badge>
        </View>
      ),
      code: `<Badge>
  <Text>New</Text>
</Badge>

<Badge variant="secondary">
  <Text>In Progress</Text>
</Badge>

<Badge>
  <Icon as={CheckCircle} size={12} />
  <Text>Completed</Text>
</Badge>

<Badge variant="destructive">
  <Text>Cancelled</Text>
</Badge>`,
    },
    {
      id: 'count',
      label: 'Count Badge',
      description: 'Numeric badge for notifications',
      preview: (
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-2">
            <Text>Messages</Text>
            <Badge>
              <Text>3</Text>
            </Badge>
          </View>
          <View className="flex-row items-center gap-2">
            <Text>Notifications</Text>
            <Badge variant="destructive">
              <Text>12</Text>
            </Badge>
          </View>
        </View>
      ),
      code: `<View className="flex-row items-center gap-2">
  <Text>Messages</Text>
  <Badge>
    <Text>3</Text>
  </Badge>
</View>

<View className="flex-row items-center gap-2">
  <Text>Notifications</Text>
  <Badge variant="destructive">
    <Text>12</Text>
  </Badge>
</View>`,
    },
    {
      id: 'categories',
      label: 'Category Tags',
      description: 'Tags for categorization',
      preview: (
        <View className="flex-row flex-wrap gap-2">
          <Badge variant="outline">
            <Text>React Native</Text>
          </Badge>
          <Badge variant="outline">
            <Text>TypeScript</Text>
          </Badge>
          <Badge variant="outline">
            <Text>Mobile</Text>
          </Badge>
          <Badge variant="outline">
            <Icon as={Star} size={12} className="text-foreground" />
            <Text>Featured</Text>
          </Badge>
        </View>
      ),
      code: `<Badge variant="outline">
  <Text>React Native</Text>
</Badge>

<Badge variant="outline">
  <Text>TypeScript</Text>
</Badge>

<Badge variant="outline">
  <Icon as={Star} size={12} />
  <Text>Featured</Text>
</Badge>`,
    },
  ],
};
