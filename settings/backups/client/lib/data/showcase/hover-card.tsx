import React from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import { Calendar, MapPin, Link as LinkIcon } from 'lucide-react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const hoverCardShowcaseData: ShowcaseComponentData = {
  id: 'hover-card',
  name: 'Hover Card',
  description:
    'Rich preview card that appears on hover or long-press. Implements FR-009 accessibilityHint for hover interactions. Uses FadeIn/FadeOut animations with aria-haspopup and aria-expanded for proper screen reader support.',
  category: 'display',
  imports: [
    "import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';",
  ],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'FR-009: accessibilityHint on trigger explains hover interaction',
    '@rn-primitives/hover-card handles aria-haspopup and aria-expanded internally',
    'WCAG 1.4.13: Content on Hover or Focus - Card is dismissible and hoverable',
    'Web: Shows on hover, mobile: shows on long-press',
    'FadeIn/FadeOut animations for smooth appearance',
    'z-50 with shadow ensures visibility above other content',
    'Supports keyboard navigation with Tab and Escape keys',
    'FullWindowOverlay on iOS ensures proper layering',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default Hover Card',
      description: 'Basic hover card with text content preview',
      preview: (
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button variant="link" accessibilityHint="Shows preview on hover">
              <Text className="underline">@johndoe</Text>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent>
            <View className="gap-2">
              <Text className="font-semibold">John Doe</Text>
              <Text className="text-sm text-muted-foreground">
                Software developer and open source contributor
              </Text>
            </View>
          </HoverCardContent>
        </HoverCard>
      ),
      code: `<HoverCard>
  <HoverCardTrigger asChild>
    <Button variant="link" accessibilityHint="Shows preview on hover">
      <Text className="underline">@johndoe</Text>
    </Button>
  </HoverCardTrigger>
  <HoverCardContent>
    <View className="gap-2">
      <Text className="font-semibold">John Doe</Text>
      <Text className="text-sm text-muted-foreground">
        Software developer and open source contributor
      </Text>
    </View>
  </HoverCardContent>
</HoverCard>`,
    },
    {
      id: 'with-avatar',
      label: 'User Profile Preview',
      description: 'Hover card showing user profile with avatar',
      preview: (
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button variant="link" accessibilityHint="Shows user profile">
              <Text className="underline">@alicesmith</Text>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <View className="flex-row gap-4">
              <Avatar className="size-12" alt="Alice Smith profile">
                <AvatarFallback>
                  <Text>AS</Text>
                </AvatarFallback>
              </Avatar>
              <View className="flex-1 gap-1">
                <Text className="font-semibold">Alice Smith</Text>
                <Text className="text-sm text-muted-foreground">Product Designer at TechCo</Text>
                <Text className="text-xs text-muted-foreground">
                  Passionate about creating accessible and beautiful user experiences.
                </Text>
              </View>
            </View>
          </HoverCardContent>
        </HoverCard>
      ),
      code: `<HoverCard>
  <HoverCardTrigger asChild>
    <Button variant="link" accessibilityHint="Shows user profile">
      <Text className="underline">@alicesmith</Text>
    </Button>
  </HoverCardTrigger>
  <HoverCardContent className="w-80">
    <View className="flex-row gap-4">
      <Avatar className="size-12" alt="Alice Smith profile">
        <AvatarFallback>
          <Text>AS</Text>
        </AvatarFallback>
      </Avatar>
      <View className="flex-1 gap-1">
        <Text className="font-semibold">Alice Smith</Text>
        <Text className="text-sm text-muted-foreground">
          Product Designer at TechCo
        </Text>
        <Text className="text-xs text-muted-foreground">
          Passionate about creating accessible experiences.
        </Text>
      </View>
    </View>
  </HoverCardContent>
</HoverCard>`,
    },
    {
      id: 'with-metadata',
      label: 'With Metadata',
      description: 'Hover card showing detailed metadata with icons',
      preview: (
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button variant="outline" accessibilityHint="Shows project details">
              <Text>Project Info</Text>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <View className="gap-3">
              <Text className="text-base font-semibold">Quester LMS</Text>
              <Text className="text-sm text-muted-foreground">
                Gamified learning management system with video streaming
              </Text>
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <Calendar className="size-4 text-muted-foreground" />
                  <Text className="text-xs text-muted-foreground">Started January 2025</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  <Text className="text-xs text-muted-foreground">Remote</Text>
                </View>
              </View>
            </View>
          </HoverCardContent>
        </HoverCard>
      ),
      code: `<HoverCard>
  <HoverCardTrigger asChild>
    <Button variant="outline" accessibilityHint="Shows project details">
      <Text>Project Info</Text>
    </Button>
  </HoverCardTrigger>
  <HoverCardContent className="w-80">
    <View className="gap-3">
      <Text className="font-semibold text-base">Quester LMS</Text>
      <Text className="text-sm text-muted-foreground">
        Gamified learning management system with video streaming
      </Text>
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <Calendar className="size-4 text-muted-foreground" />
          <Text className="text-xs text-muted-foreground">
            Started January 2025
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <MapPin className="size-4 text-muted-foreground" />
          <Text className="text-xs text-muted-foreground">
            Remote
          </Text>
        </View>
      </View>
    </View>
  </HoverCardContent>
</HoverCard>`,
    },
    {
      id: 'link-preview',
      label: 'Link Preview',
      description: 'Hover card for link previews with URL',
      preview: (
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button variant="link" accessibilityHint="Shows link preview">
              <LinkIcon className="size-4" />
              <Text className="ml-2 underline">Documentation</Text>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <View className="gap-2">
              <Text className="font-semibold">React Native Documentation</Text>
              <Text className="text-sm text-muted-foreground">
                Learn once, write anywhere. React Native lets you build mobile apps using only
                JavaScript.
              </Text>
              <Text className="text-xs text-blue-500">https://reactnative.dev</Text>
            </View>
          </HoverCardContent>
        </HoverCard>
      ),
      code: `<HoverCard>
  <HoverCardTrigger asChild>
    <Button variant="link" accessibilityHint="Shows link preview">
      <LinkIcon className="size-4" />
      <Text className="underline ml-2">Documentation</Text>
    </Button>
  </HoverCardTrigger>
  <HoverCardContent className="w-80">
    <View className="gap-2">
      <Text className="font-semibold">
        React Native Documentation
      </Text>
      <Text className="text-sm text-muted-foreground">
        Learn once, write anywhere. React Native lets you build 
        mobile apps using only JavaScript.
      </Text>
      <Text className="text-xs text-blue-500">
        https://reactnative.dev
      </Text>
    </View>
  </HoverCardContent>
</HoverCard>`,
    },
    {
      id: 'positioned-bottom',
      label: 'Bottom Positioning',
      description: 'Hover card positioned below the trigger',
      preview: (
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button variant="secondary" accessibilityHint="Shows details below">
              <Text>Hover for details</Text>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent side="bottom" className="w-72">
            <View className="gap-2">
              <Text className="font-semibold">Bottom Panel Info</Text>
              <Text className="text-sm text-muted-foreground">
                This hover card appears below the trigger element for better layout control.
              </Text>
            </View>
          </HoverCardContent>
        </HoverCard>
      ),
      code: `<HoverCard>
  <HoverCardTrigger asChild>
    <Button 
      variant="secondary"
      accessibilityHint="Shows details below"
    >
      <Text>Hover for details</Text>
    </Button>
  </HoverCardTrigger>
  <HoverCardContent side="bottom" className="w-72">
    <View className="gap-2">
      <Text className="font-semibold">Bottom Panel Info</Text>
      <Text className="text-sm text-muted-foreground">
        This hover card appears below the trigger 
        element for better layout control.
      </Text>
    </View>
  </HoverCardContent>
</HoverCard>`,
    },
    {
      id: 'compact',
      label: 'Compact Card',
      description: 'Smaller hover card for brief previews',
      preview: (
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button variant="ghost" size="sm" accessibilityHint="Shows quick preview">
              <Text>Quick info</Text>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-56 p-3">
            <Text className="text-sm">This is a compact hover card with minimal content.</Text>
          </HoverCardContent>
        </HoverCard>
      ),
      code: `<HoverCard>
  <HoverCardTrigger asChild>
    <Button 
      variant="ghost" 
      size="sm"
      accessibilityHint="Shows quick preview"
    >
      <Text>Quick info</Text>
    </Button>
  </HoverCardTrigger>
  <HoverCardContent className="w-56 p-3">
    <Text className="text-sm">
      This is a compact hover card with minimal content.
    </Text>
  </HoverCardContent>
</HoverCard>`,
    },
  ],
};
