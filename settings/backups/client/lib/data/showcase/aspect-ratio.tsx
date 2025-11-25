import React from 'react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const aspectRatioShowcaseData: ShowcaseComponentData = {
  id: 'aspect-ratio',
  name: 'Aspect Ratio',
  description:
    'Container that maintains a specific aspect ratio for its content. Implements WCAG 1.4.10 (Reflow) by preserving media proportions. Essential for responsive images and videos.',
  category: 'layout',
  imports: ["import { AspectRatio } from '@/components/ui/aspect-ratio';"],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'WCAG 1.4.10: AspectRatio helps maintain content proportions during reflow',
    'Use with Image alt props for accessible media',
    'Preserves aspect ratio across different screen sizes',
    'Prevents layout shift when loading images',
    'Ensures consistent visual presentation',
    'Works with responsive design patterns',
    'Compatible with screen reader navigation',
    'Use role="img" and aria-label for decorative containers',
  ],
  variants: [
    {
      id: 'square',
      label: '1:1 (Square)',
      description: 'Square aspect ratio for profile images and thumbnails',
      preview: (
        <View className="w-48">
          <AspectRatio ratio={1 / 1}>
            <View className="h-full items-center justify-center rounded-md bg-muted">
              <Text className="text-muted-foreground">1:1</Text>
            </View>
          </AspectRatio>
        </View>
      ),
      code: `<AspectRatio ratio={1 / 1}>\n  <Image source={{ uri: '...' }} style={{ width: '100%', height: '100%' }} />\n</AspectRatio>`,
    },
    {
      id: 'video',
      label: '16:9 (Video)',
      description: 'Standard video aspect ratio',
      preview: (
        <View className="w-64">
          <AspectRatio ratio={16 / 9}>
            <View className="h-full items-center justify-center rounded-md bg-muted">
              <Text className="text-muted-foreground">16:9 Video</Text>
            </View>
          </AspectRatio>
        </View>
      ),
      code: `<AspectRatio ratio={16 / 9}>\n  <Video source={{ uri: '...' }} />\n</AspectRatio>`,
    },
    {
      id: 'portrait',
      label: '3:4 (Portrait)',
      description: 'Portrait orientation for mobile-first content',
      preview: (
        <View className="w-32">
          <AspectRatio ratio={3 / 4}>
            <View className="h-full items-center justify-center rounded-md bg-muted">
              <Text className="text-muted-foreground">3:4</Text>
            </View>
          </AspectRatio>
        </View>
      ),
      code: `<AspectRatio ratio={3 / 4}>...</AspectRatio>`,
    },
    {
      id: 'ultrawide',
      label: '21:9 (Ultrawide)',
      description: 'Ultrawide cinematic aspect ratio',
      preview: (
        <View className="w-64">
          <AspectRatio ratio={21 / 9}>
            <View className="h-full items-center justify-center rounded-md bg-muted">
              <Text className="text-muted-foreground">21:9 Ultrawide</Text>
            </View>
          </AspectRatio>
        </View>
      ),
      code: `<AspectRatio ratio={21 / 9}>...</AspectRatio>`,
    },
    {
      id: 'golden',
      label: '1.618:1 (Golden Ratio)',
      description: 'Golden ratio for aesthetically pleasing layouts',
      preview: (
        <View className="w-48">
          <AspectRatio ratio={1.618 / 1}>
            <View className="h-full items-center justify-center rounded-md bg-muted">
              <Text className="text-muted-foreground">φ 1.618:1</Text>
            </View>
          </AspectRatio>
        </View>
      ),
      code: `<AspectRatio ratio={1.618 / 1}>...</AspectRatio>`,
    },
    {
      id: 'with-image',
      label: 'With Image',
      description: 'Aspect ratio container with actual image (use placeholder)',
      preview: (
        <View className="w-48">
          <AspectRatio ratio={16 / 9}>
            <View className="h-full items-center justify-center rounded-md bg-muted">
              <Text className="text-xs text-muted-foreground">Image placeholder</Text>
              <Text className="text-xs text-muted-foreground">(Use real image in app)</Text>
            </View>
          </AspectRatio>
        </View>
      ),
      code: `<AspectRatio ratio={16 / 9}>\n  <Image\n    alt="Description for screen readers"\n    source={{ uri: 'https://...' }}\n    style={{ width: '100%', height: '100%' }}\n    resizeMode="cover"\n  />\n</AspectRatio>`,
    },
  ],
};
