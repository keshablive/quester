import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const labelShowcaseData: ShowcaseComponentData = {
  id: 'label',
  name: 'Label',
  description:
    'Text label component with nativeID support for linking to form inputs. Implements FR-005 for proper form accessibility (WCAG 3.3.2 Labels or Instructions). Essential for connecting labels to inputs via aria-labelledby.',
  category: 'form',
  imports: ["import { Label } from '@/components/ui/label';"],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'FR-005: nativeID prop links labels to form inputs via aria-labelledby',
    'WCAG 3.3.2: Labels or Instructions - Every form input has a visible label',
    'WCAG 1.3.1: Info and Relationships - Label-input relationships are programmatically determined',
    'FR-006: Supports onPress, onLongPress for interactive labels',
    'Screen readers announce label text when input receives focus',
    'Disabled state reduces opacity to 50% (peer-disabled pattern)',
    'Web: cursor-default, pointer-events-none when disabled',
    'Mobile: Works with nativeID/aria-labelledby for screen reader associations',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default Label',
      description: 'Basic label with nativeID for input association',
      preview: (
        <View className="w-full gap-2">
          <Label nativeID="email-label">Email Address</Label>
          <Input
            placeholder="Enter your email"
            aria-labelledby="email-label"
            accessibilityLabel="Email Address"
          />
        </View>
      ),
      code: `<View className="gap-2">
  <Label nativeID="email-label">Email Address</Label>
  <Input 
    placeholder="Enter your email"
    aria-labelledby="email-label"
    accessibilityLabel="Email Address"
  />
</View>`,
    },
    {
      id: 'required',
      label: 'Required Field',
      description: 'Label with asterisk for required fields',
      preview: (
        <View className="w-full gap-2">
          <View className="flex-row items-center gap-1">
            <Label nativeID="username-label">Username</Label>
            <Text className="text-destructive">*</Text>
          </View>
          <Input
            placeholder="Enter username"
            aria-labelledby="username-label"
            accessibilityLabel="Username, required"
          />
        </View>
      ),
      code: `<View className="gap-2">
  <View className="flex-row items-center gap-1">
    <Label nativeID="username-label">Username</Label>
    <Text className="text-destructive">*</Text>
  </View>
  <Input 
    placeholder="Enter username"
    aria-labelledby="username-label"
    accessibilityLabel="Username, required"
  />
</View>`,
    },
    {
      id: 'with-helper',
      label: 'With Helper Text',
      description: 'Label with additional helper text below',
      preview: (
        <View className="w-full gap-2">
          <Label nativeID="password-label">Password</Label>
          <Input
            placeholder="Enter password"
            secureTextEntry
            aria-labelledby="password-label"
            accessibilityLabel="Password"
          />
          <Text className="text-xs text-muted-foreground">Must be at least 8 characters</Text>
        </View>
      ),
      code: `<View className="gap-2">
  <Label nativeID="password-label">Password</Label>
  <Input 
    placeholder="Enter password"
    secureTextEntry
    aria-labelledby="password-label"
    accessibilityLabel="Password"
  />
  <Text className="text-xs text-muted-foreground">
    Must be at least 8 characters
  </Text>
</View>`,
    },
    {
      id: 'with-checkbox',
      label: 'With Checkbox',
      description: 'Label associated with checkbox for agreements',
      preview: (() => {
        const [checked, setChecked] = useState(false);
        return (
          <View className="flex-row items-center gap-3">
            <Checkbox
              checked={checked}
              onCheckedChange={setChecked}
              accessibilityLabel="I agree to terms"
              aria-labelledby="terms-label"
            />
            <Label nativeID="terms-label" className="flex-1">
              I agree to the terms and conditions
            </Label>
          </View>
        );
      })(),
      code: `const [checked, setChecked] = useState(false);

return (
  <View className="flex-row items-center gap-3">
    <Checkbox 
      checked={checked}
      onCheckedChange={setChecked}
      accessibilityLabel="I agree to terms"
      aria-labelledby="terms-label"
    />
    <Label nativeID="terms-label" className="flex-1">
      I agree to the terms and conditions
    </Label>
  </View>
);`,
    },
    {
      id: 'disabled',
      label: 'Disabled State',
      description: 'Label in disabled state with reduced opacity',
      preview: (
        <View className="w-full gap-2">
          <Label nativeID="disabled-label" disabled>
            Disabled Field
          </Label>
          <Input
            placeholder="Cannot edit"
            editable={false}
            aria-labelledby="disabled-label"
            accessibilityLabel="Disabled Field"
          />
        </View>
      ),
      code: `<View className="gap-2">
  <Label nativeID="disabled-label" disabled>
    Disabled Field
  </Label>
  <Input 
    placeholder="Cannot edit"
    editable={false}
    aria-labelledby="disabled-label"
    accessibilityLabel="Disabled Field"
  />
</View>`,
    },
    {
      id: 'inline',
      label: 'Inline Labels',
      description: 'Multiple label-input pairs in compact form',
      preview: (
        <View className="gap-4">
          <View className="flex-row items-center gap-3">
            <Label nativeID="first-name-label" className="w-20">
              First Name
            </Label>
            <Input
              placeholder="John"
              className="flex-1"
              aria-labelledby="first-name-label"
              accessibilityLabel="First Name"
            />
          </View>
          <View className="flex-row items-center gap-3">
            <Label nativeID="last-name-label" className="w-20">
              Last Name
            </Label>
            <Input
              placeholder="Doe"
              className="flex-1"
              aria-labelledby="last-name-label"
              accessibilityLabel="Last Name"
            />
          </View>
        </View>
      ),
      code: `<View className="gap-4">
  <View className="flex-row items-center gap-3">
    <Label nativeID="first-name-label" className="w-20">
      First Name
    </Label>
    <Input 
      placeholder="John"
      className="flex-1"
      aria-labelledby="first-name-label"
      accessibilityLabel="First Name"
    />
  </View>
  <View className="flex-row items-center gap-3">
    <Label nativeID="last-name-label" className="w-20">
      Last Name
    </Label>
    <Input 
      placeholder="Doe"
      className="flex-1"
      aria-labelledby="last-name-label"
      accessibilityLabel="Last Name"
    />
  </View>
</View>`,
    },
  ],
};
