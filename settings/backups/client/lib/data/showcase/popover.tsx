import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import { Settings, Filter, Calendar, User } from 'lucide-react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const popoverShowcaseData: ShowcaseComponentData = {
  id: 'popover',
  name: 'Popover',
  description:
    'Floating popover panel for additional content or forms. Implements FR-009 with aria-hidden management. @rn-primitives/popover handles accessibilityRole="menu", aria-haspopup, aria-expanded, and keyboard navigation (Escape to close) internally.',
  category: 'navigation',
  imports: ["import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';"],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'FR-009: Accessible popover with aria-hidden state management',
    '@rn-primitives/popover handles accessibilityRole="menu" on content',
    'aria-haspopup and aria-expanded managed automatically on trigger',
    'Keyboard navigation: Escape key closes popover',
    'FadeIn/FadeOut animations (200ms) for smooth transitions',
    'FullWindowOverlay on iOS ensures proper z-index layering',
    'Focus returns to trigger when popover closes',
    'Screen readers announce when popover opens/closes',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default Popover',
      description: 'Basic popover with text content',
      preview: (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Text>Open Popover</Text>
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <View className="gap-2">
              <Text className="font-semibold">About Quester</Text>
              <Text className="text-sm text-muted-foreground">
                A gamified learning management system with video streaming and adaptive learning
                paths.
              </Text>
            </View>
          </PopoverContent>
        </Popover>
      ),
      code: `<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">
      <Text>Open Popover</Text>
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <View className="gap-2">
      <Text className="font-semibold">About Quester</Text>
      <Text className="text-sm text-muted-foreground">
        A gamified learning management system with video 
        streaming and adaptive learning paths.
      </Text>
    </View>
  </PopoverContent>
</Popover>`,
    },
    {
      id: 'with-form',
      label: 'With Form',
      description: 'Popover containing form inputs',
      preview: (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Settings className="mr-2 size-4" />
              <Text>Settings</Text>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <View className="gap-4">
              <View className="gap-2">
                <Text className="font-semibold">Profile Settings</Text>
                <Text className="text-sm text-muted-foreground">
                  Update your profile information
                </Text>
              </View>
              <View className="gap-2">
                <Label nativeID="name-label">Display Name</Label>
                <Input
                  placeholder="John Doe"
                  aria-labelledby="name-label"
                  accessibilityLabel="Display Name"
                />
              </View>
              <View className="gap-2">
                <Label nativeID="email-label">Email</Label>
                <Input
                  placeholder="john@example.com"
                  aria-labelledby="email-label"
                  accessibilityLabel="Email"
                />
              </View>
              <Button>
                <Text>Save Changes</Text>
              </Button>
            </View>
          </PopoverContent>
        </Popover>
      ),
      code: `<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">
      <Settings className="mr-2 size-4" />
      <Text>Settings</Text>
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-80">
    <View className="gap-4">
      <View className="gap-2">
        <Text className="font-semibold">Profile Settings</Text>
        <Text className="text-sm text-muted-foreground">
          Update your profile information
        </Text>
      </View>
      <View className="gap-2">
        <Label nativeID="name-label">Display Name</Label>
        <Input 
          placeholder="John Doe"
          aria-labelledby="name-label"
          accessibilityLabel="Display Name"
        />
      </View>
      <View className="gap-2">
        <Label nativeID="email-label">Email</Label>
        <Input 
          placeholder="john@example.com"
          aria-labelledby="email-label"
          accessibilityLabel="Email"
        />
      </View>
      <Button>
        <Text>Save Changes</Text>
      </Button>
    </View>
  </PopoverContent>
</Popover>`,
    },
    {
      id: 'with-icon',
      label: 'Icon Trigger',
      description: 'Popover triggered by icon button',
      preview: (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" accessibilityLabel="Filter options">
              <Filter className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <View className="gap-3">
              <Text className="font-semibold">Filter Options</Text>
              <View className="gap-2">
                <Button variant="outline" size="sm">
                  <Text>All Items</Text>
                </Button>
                <Button variant="outline" size="sm">
                  <Text>Active Only</Text>
                </Button>
                <Button variant="outline" size="sm">
                  <Text>Archived</Text>
                </Button>
              </View>
            </View>
          </PopoverContent>
        </Popover>
      ),
      code: `<Popover>
  <PopoverTrigger asChild>
    <Button 
      variant="ghost" 
      size="icon" 
      accessibilityLabel="Filter options"
    >
      <Filter className="size-4" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-64">
    <View className="gap-3">
      <Text className="font-semibold">Filter Options</Text>
      <View className="gap-2">
        <Button variant="outline" size="sm">
          <Text>All Items</Text>
        </Button>
        <Button variant="outline" size="sm">
          <Text>Active Only</Text>
        </Button>
        <Button variant="outline" size="sm">
          <Text>Archived</Text>
        </Button>
      </View>
    </View>
  </PopoverContent>
</Popover>`,
    },
    {
      id: 'positioned-side',
      label: 'Side Position',
      description: 'Popover positioned to the side',
      preview: (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary">
              <Calendar className="mr-2 size-4" />
              <Text>Schedule</Text>
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" className="w-72">
            <View className="gap-2">
              <Text className="font-semibold">Schedule Options</Text>
              <Text className="text-sm text-muted-foreground">
                Choose when to publish this content
              </Text>
              <View className="gap-2 pt-2">
                <Button variant="outline" size="sm">
                  <Text>Publish Now</Text>
                </Button>
                <Button variant="outline" size="sm">
                  <Text>Schedule for Later</Text>
                </Button>
              </View>
            </View>
          </PopoverContent>
        </Popover>
      ),
      code: `<Popover>
  <PopoverTrigger asChild>
    <Button variant="secondary">
      <Calendar className="mr-2 size-4" />
      <Text>Schedule</Text>
    </Button>
  </PopoverTrigger>
  <PopoverContent side="bottom" className="w-72">
    <View className="gap-2">
      <Text className="font-semibold">Schedule Options</Text>
      <Text className="text-sm text-muted-foreground">
        Choose when to publish this content
      </Text>
      <View className="gap-2 pt-2">
        <Button variant="outline" size="sm">
          <Text>Publish Now</Text>
        </Button>
        <Button variant="outline" size="sm">
          <Text>Schedule for Later</Text>
        </Button>
      </View>
    </View>
  </PopoverContent>
</Popover>`,
    },
    {
      id: 'compact',
      label: 'Compact Popover',
      description: 'Smaller popover with minimal padding',
      preview: (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm">
              <User className="mr-2 size-4" />
              <Text>Profile</Text>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3">
            <View className="gap-1">
              <Text className="font-medium">John Doe</Text>
              <Text className="text-xs text-muted-foreground">john@example.com</Text>
              <Text className="text-xs text-muted-foreground">Student</Text>
            </View>
          </PopoverContent>
        </Popover>
      ),
      code: `<Popover>
  <PopoverTrigger asChild>
    <Button variant="ghost" size="sm">
      <User className="mr-2 size-4" />
      <Text>Profile</Text>
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-56 p-3">
    <View className="gap-1">
      <Text className="font-medium">John Doe</Text>
      <Text className="text-xs text-muted-foreground">
        john@example.com
      </Text>
      <Text className="text-xs text-muted-foreground">
        Student
      </Text>
    </View>
  </PopoverContent>
</Popover>`,
    },
    {
      id: 'with-actions',
      label: 'With Action Buttons',
      description: 'Popover with multiple action buttons',
      preview: (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Text>Quick Actions</Text>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <View className="gap-3">
              <View>
                <Text className="font-semibold">Course Actions</Text>
                <Text className="text-xs text-muted-foreground">Manage this course</Text>
              </View>
              <View className="gap-2">
                <Button variant="outline" size="sm">
                  <Text>Edit Course</Text>
                </Button>
                <Button variant="outline" size="sm">
                  <Text>View Students</Text>
                </Button>
                <Button variant="outline" size="sm">
                  <Text>Export Data</Text>
                </Button>
                <Button variant="destructive" size="sm">
                  <Text>Delete Course</Text>
                </Button>
              </View>
            </View>
          </PopoverContent>
        </Popover>
      ),
      code: `<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">
      <Text>Quick Actions</Text>
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-64">
    <View className="gap-3">
      <View>
        <Text className="font-semibold">Course Actions</Text>
        <Text className="text-xs text-muted-foreground">
          Manage this course
        </Text>
      </View>
      <View className="gap-2">
        <Button variant="outline" size="sm">
          <Text>Edit Course</Text>
        </Button>
        <Button variant="outline" size="sm">
          <Text>View Students</Text>
        </Button>
        <Button variant="outline" size="sm">
          <Text>Export Data</Text>
        </Button>
        <Button variant="destructive" size="sm">
          <Text>Delete Course</Text>
        </Button>
      </View>
    </View>
  </PopoverContent>
</Popover>`,
    },
  ],
};
