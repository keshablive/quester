import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const avatarShowcaseData: ShowcaseComponentData = {
  id: 'avatar',
  name: 'Avatar',
  description:
    'User profile image component with fallback support. Implements FR-007 with accessibilityLabel for images (WCAG 1.1.1).',
  category: 'display',
  imports: ['@/components/ui/avatar'],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'Implements accessibilityLabel for images (FR-007, WCAG 1.1.1)',
    'Fallback provides alternative when image fails to load',
    'User initials serve as text alternative in fallback',
    'Proper contrast for fallback text (4.5:1 minimum)',
    'Circular shape indicated to screen readers',
    'Appropriate size for touch targets when interactive',
    'High contrast mode compatible',
    'Supports different sizes for various contexts',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default',
      description: 'Basic avatar with image',
      preview: (
        <Avatar alt="User avatar">
          <AvatarImage
            source={{ uri: 'https://github.com/shadcn.png' }}
            accessibilityLabel="User avatar"
          />
          <AvatarFallback>
            <Text>CN</Text>
          </AvatarFallback>
        </Avatar>
      ),
      code: `<Avatar alt="User avatar">
  <AvatarImage
    source={{ uri: 'https://github.com/shadcn.png' }}
    accessibilityLabel="User avatar"
  />
  <AvatarFallback>
    <Text>CN</Text>
  </AvatarFallback>
</Avatar>`,
    },
    {
      id: 'fallback',
      label: 'Fallback',
      description: 'Avatar with initials fallback',
      preview: (
        <Avatar alt="John Doe avatar">
          <AvatarImage
            source={{ uri: 'https://invalid-url.com/image.png' }}
            accessibilityLabel="John Doe avatar"
          />
          <AvatarFallback>
            <Text>JD</Text>
          </AvatarFallback>
        </Avatar>
      ),
      code: `<Avatar alt={\`\${user.name} avatar\`}>
  <AvatarImage
    source={{ uri: user.avatarUrl }}
    accessibilityLabel={\`\${user.name} avatar\`}
  />
  <AvatarFallback>
    <Text>{user.initials}</Text>
  </AvatarFallback>
</Avatar>`,
    },
    {
      id: 'sizes',
      label: 'Different Sizes',
      description: 'Avatar in small, default, and large sizes',
      preview: (
        <View className="flex-row items-center gap-4">
          <Avatar className="size-8" alt="Small avatar">
            <AvatarFallback>
              <Text className="text-xs">SM</Text>
            </AvatarFallback>
          </Avatar>
          <Avatar className="size-10" alt="Medium avatar">
            <AvatarFallback>
              <Text className="text-sm">MD</Text>
            </AvatarFallback>
          </Avatar>
          <Avatar className="size-14" alt="Large avatar">
            <AvatarFallback>
              <Text>LG</Text>
            </AvatarFallback>
          </Avatar>
          <Avatar className="size-20" alt="Extra large avatar">
            <AvatarFallback>
              <Text className="text-lg">XL</Text>
            </AvatarFallback>
          </Avatar>
        </View>
      ),
      code: `{/* Small (32px) */}
<Avatar className="size-8" alt="Small avatar">
  <AvatarFallback>
    <Text className="text-xs">SM</Text>
  </AvatarFallback>
</Avatar>

{/* Medium (40px) */}
<Avatar className="size-10" alt="Medium avatar">
  <AvatarFallback>
    <Text className="text-sm">MD</Text>
  </AvatarFallback>
</Avatar>

{/* Large (56px) */}
<Avatar className="size-14" alt="Large avatar">
  <AvatarFallback>
    <Text>LG</Text>
  </AvatarFallback>
</Avatar>

{/* Extra Large (80px) */}
<Avatar className="size-20" alt="Extra large avatar">
  <AvatarFallback>
    <Text className="text-lg">XL</Text>
  </AvatarFallback>
</Avatar>`,
    },
    {
      id: 'group',
      label: 'Avatar Group',
      description: 'Multiple avatars in a row',
      preview: (
        <View className="flex-row -space-x-2">
          <Avatar className="border-2 border-background" alt="John Doe">
            <AvatarFallback>
              <Text>JD</Text>
            </AvatarFallback>
          </Avatar>
          <Avatar className="border-2 border-background" alt="Alice Smith">
            <AvatarFallback>
              <Text>AS</Text>
            </AvatarFallback>
          </Avatar>
          <Avatar className="border-2 border-background" alt="Mark Kim">
            <AvatarFallback>
              <Text>MK</Text>
            </AvatarFallback>
          </Avatar>
          <Avatar className="border-2 border-background" alt="5 more users">
            <AvatarFallback>
              <Text className="text-xs">+5</Text>
            </AvatarFallback>
          </Avatar>
        </View>
      ),
      code: `<View className="flex-row -space-x-2">
  <Avatar className="border-2 border-background" alt="John Doe">
    <AvatarFallback>
      <Text>JD</Text>
    </AvatarFallback>
  </Avatar>
  <Avatar className="border-2 border-background" alt="Alice Smith">
    <AvatarFallback>
      <Text>AS</Text>
    </AvatarFallback>
  </Avatar>
  <Avatar className="border-2 border-background" alt="Mark Kim">
    <AvatarFallback>
      <Text>MK</Text>
    </AvatarFallback>
  </Avatar>
  <Avatar className="border-2 border-background" alt="5 more users">
    <AvatarFallback>
      <Text className="text-xs">+5</Text>
    </AvatarFallback>
  </Avatar>
</View>`,
    },
    {
      id: 'with-status',
      label: 'With Status Indicator',
      description: 'Avatar with online status',
      preview: (
        <View className="relative">
          <Avatar className="size-12" alt="User online status">
            <AvatarFallback>
              <Text>JD</Text>
            </AvatarFallback>
          </Avatar>
          <View className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-background bg-green-500" />
        </View>
      ),
      code: `<View className="relative">
  <Avatar className="size-12" alt={\`\${user.name} online status\`}>
    <AvatarImage
      source={{ uri: user.avatar }}
      accessibilityLabel={\`\${user.name} avatar\`}
    />
    <AvatarFallback>
      <Text>{user.initials}</Text>
    </AvatarFallback>
  </Avatar>
  <View className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-background bg-green-500" />
</View>`,
    },
    {
      id: 'with-text',
      label: 'With Name',
      description: 'Avatar with accompanying text',
      preview: (
        <View className="flex-row items-center gap-3">
          <Avatar className="size-10" alt="John Doe profile">
            <AvatarFallback>
              <Text>JD</Text>
            </AvatarFallback>
          </Avatar>
          <View>
            <Text className="font-semibold">John Doe</Text>
            <Text className="text-xs text-muted-foreground">john@example.com</Text>
          </View>
        </View>
      ),
      code: `<View className="flex-row items-center gap-3">
  <Avatar className="size-10" alt={\`\${user.name} profile\`}>
    <AvatarImage
      source={{ uri: user.avatar }}
      accessibilityLabel={\`\${user.name} avatar\`}
    />
    <AvatarFallback>
      <Text>{user.initials}</Text>
    </AvatarFallback>
  </Avatar>
  <View>
    <Text className="font-semibold">{user.name}</Text>
    <Text className="text-xs text-muted-foreground">{user.email}</Text>
  </View>
</View>`,
    },
  ],
};
