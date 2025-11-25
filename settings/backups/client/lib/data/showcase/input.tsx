import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Search } from 'lucide-react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const inputShowcaseData: ShowcaseComponentData = {
  id: 'input',
  name: 'Input',
  description:
    'Text input component with full ARIA support, validation states, and various input types. Implements FR-008 with aria-labelledby, aria-invalid, and aria-describedby.',
  category: 'form',
  imports: ['@/components/ui/input', '@/components/ui/label', '@/components/ui/text'],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'Implements aria-labelledby for proper label association (FR-008, WCAG 3.3.2)',
    'Uses aria-invalid to communicate error states (FR-008, WCAG 3.3.1)',
    'Supports aria-describedby for error and help text (FR-008, WCAG 3.3.1, 3.3.2)',
    'Includes aria-required for required field indication',
    'Placeholder text has sufficient contrast (WCAG 1.4.3)',
    'Focus indicators visible for keyboard navigation (WCAG 2.4.7)',
    'Disabled state properly communicated via editable={false}',
    'Supports all native TextInput accessibility props',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default',
      description: 'Basic text input with label',
      preview: (
        <View className="w-full gap-2">
          <Label nativeID="name-label">Name</Label>
          <Input
            placeholder="Enter your name"
            aria-labelledby="name-label"
            accessibilityLabel="Name"
          />
        </View>
      ),
      code: `<View className="gap-2">
  <Label nativeID="name-label">Name</Label>
  <Input
    placeholder="Enter your name"
    aria-labelledby="name-label"
    accessibilityLabel="Name"
  />
</View>`,
    },
    {
      id: 'email',
      label: 'Email Input',
      description: 'Email input with appropriate keyboard type',
      preview: (
        <View className="w-full gap-2">
          <Label nativeID="email-label">Email</Label>
          <Input
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            aria-labelledby="email-label"
            accessibilityLabel="Email address"
          />
        </View>
      ),
      code: `<View className="gap-2">
  <Label nativeID="email-label">Email</Label>
  <Input
    placeholder="you@example.com"
    keyboardType="email-address"
    autoCapitalize="none"
    autoComplete="email"
    aria-labelledby="email-label"
    accessibilityLabel="Email address"
  />
</View>`,
    },
    {
      id: 'password',
      label: 'Password Input',
      description: 'Secure password input field',
      preview: (
        <View className="w-full gap-2">
          <Label nativeID="password-label">Password</Label>
          <Input
            placeholder="Enter password"
            secureTextEntry={true}
            autoCapitalize="none"
            autoComplete="password"
            aria-labelledby="password-label"
            accessibilityLabel="Password"
          />
        </View>
      ),
      code: `<View className="gap-2">
  <Label nativeID="password-label">Password</Label>
  <Input
    placeholder="Enter password"
    secureTextEntry={true}
    autoCapitalize="none"
    autoComplete="password"
    aria-labelledby="password-label"
    accessibilityLabel="Password"
  />
</View>`,
    },
    {
      id: 'with-icon',
      label: 'With Icon',
      description: 'Input with leading icon',
      preview: (
        <View className="w-full gap-2">
          <Label nativeID="search-label">Search</Label>
          <View className="relative">
            <View className="absolute left-3 top-2.5 z-10">
              <Icon as={Search} size={18} className="text-muted-foreground" />
            </View>
            <Input
              placeholder="Search courses..."
              className="pl-10"
              aria-labelledby="search-label"
              accessibilityLabel="Search"
            />
          </View>
        </View>
      ),
      code: `<View className="gap-2">
  <Label nativeID="search-label">Search</Label>
  <View className="relative">
    <View className="absolute left-3 top-2.5 z-10">
      <Icon as={Search} size={18} className="text-muted-foreground" />
    </View>
    <Input
      placeholder="Search courses..."
      className="pl-10"
      aria-labelledby="search-label"
      accessibilityLabel="Search"
    />
  </View>
</View>`,
    },
    {
      id: 'error',
      label: 'Error State',
      description: 'Input with validation error',
      preview: (
        <View className="w-full gap-2">
          <Label nativeID="email-error-label">Email</Label>
          <Input
            placeholder="you@example.com"
            keyboardType="email-address"
            className="border-destructive"
            aria-labelledby="email-error-label"
            aria-invalid={true}
            aria-describedby="email-error"
            accessibilityLabel="Email address"
          />
          <Text nativeID="email-error" className="text-xs text-destructive">
            Please enter a valid email address
          </Text>
        </View>
      ),
      code: `<View className="gap-2">
  <Label nativeID="email-error-label">Email</Label>
  <Input
    placeholder="you@example.com"
    keyboardType="email-address"
    className="border-destructive"
    aria-labelledby="email-error-label"
    aria-invalid={true}
    aria-describedby="email-error"
    accessibilityLabel="Email address"
  />
  <Text nativeID="email-error" className="text-xs text-destructive">
    Please enter a valid email address
  </Text>
</View>`,
    },
    {
      id: 'disabled',
      label: 'Disabled',
      description: 'Disabled input state',
      preview: (
        <View className="w-full gap-2">
          <Label nativeID="disabled-label">Username</Label>
          <Input
            placeholder="Not editable"
            value="johndoe"
            editable={false}
            aria-labelledby="disabled-label"
            accessibilityLabel="Username (read only)"
          />
        </View>
      ),
      code: `<View className="gap-2">
  <Label nativeID="disabled-label">Username</Label>
  <Input
    placeholder="Not editable"
    value="johndoe"
    editable={false}
    aria-labelledby="disabled-label"
    accessibilityLabel="Username (read only)"
  />
</View>`,
    },
    {
      id: 'required',
      label: 'Required Field',
      description: 'Input marked as required',
      preview: (
        <View className="w-full gap-2">
          <Label nativeID="required-label">
            Full Name <Text className="text-destructive">*</Text>
          </Label>
          <Input
            placeholder="Enter your full name"
            aria-labelledby="required-label"
            aria-required={true}
            accessibilityLabel="Full name"
            accessibilityHint="Required field"
          />
          <Text className="text-xs text-muted-foreground">* Required field</Text>
        </View>
      ),
      code: `<View className="gap-2">
  <Label nativeID="required-label">
    Full Name <Text className="text-destructive">*</Text>
  </Label>
  <Input
    placeholder="Enter your full name"
    aria-labelledby="required-label"
    aria-required={true}
    accessibilityLabel="Full name"
    accessibilityHint="Required field"
  />
  <Text className="text-xs text-muted-foreground">* Required field</Text>
</View>`,
    },
    {
      id: 'multiline',
      label: 'Multiline',
      description: 'Textarea for longer text input',
      preview: (
        <View className="w-full gap-2">
          <Label nativeID="bio-label">Bio</Label>
          <Input
            placeholder="Tell us about yourself..."
            multiline={true}
            numberOfLines={4}
            className="h-24"
            textAlignVertical="top"
            aria-labelledby="bio-label"
            accessibilityLabel="Biography"
          />
        </View>
      ),
      code: `<View className="gap-2">
  <Label nativeID="bio-label">Bio</Label>
  <Input
    placeholder="Tell us about yourself..."
    multiline={true}
    numberOfLines={4}
    className="h-24"
    textAlignVertical="top"
    aria-labelledby="bio-label"
    accessibilityLabel="Biography"
  />
</View>`,
    },
  ],
};
