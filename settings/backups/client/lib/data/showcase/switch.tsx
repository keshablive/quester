import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const switchShowcaseData: ShowcaseComponentData = {
  id: 'switch',
  name: 'Switch',
  description:
    'Toggle switch component for binary on/off states. Implements FR-006 with accessibilityRole="switch".',
  category: 'form',
  imports: ['@/components/ui/switch', '@/components/ui/label'],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'Implements accessibilityRole="switch" for screen readers (FR-006)',
    'Uses accessibilityState to communicate checked/unchecked state',
    'Touch target meets 44x44 minimum requirement',
    'Visual focus indicators for keyboard navigation',
    'High contrast mode compatible',
    'Disabled state properly communicated',
    'Animated transition provides visual feedback',
    'Label association via Label component',
  ],
  variants: [
    {
      id: 'checked',
      label: 'Checked',
      description: 'Switch in on/checked state',
      preview: (
        <Switch checked={true} onCheckedChange={() => {}} accessibilityLabel="Toggle switch on" />
      ),
      code: `<Switch
  checked={true}
  onCheckedChange={(checked) => setChecked(checked)}
  accessibilityLabel="Toggle switch"
/>`,
    },
    {
      id: 'unchecked',
      label: 'Unchecked',
      description: 'Switch in off/unchecked state',
      preview: (
        <Switch checked={false} onCheckedChange={() => {}} accessibilityLabel="Toggle switch off" />
      ),
      code: `<Switch
  checked={false}
  onCheckedChange={(checked) => setChecked(checked)}
  accessibilityLabel="Toggle switch"
/>`,
    },
    {
      id: 'with-label',
      label: 'With Label',
      description: 'Switch with accompanying label',
      preview: (
        <View className="w-full flex-row items-center justify-between">
          <Label nativeID="notifications-label">Enable notifications</Label>
          <Switch
            checked={true}
            onCheckedChange={() => {}}
            aria-labelledby="notifications-label"
            accessibilityLabel="Enable notifications"
          />
        </View>
      ),
      code: `<View className="flex-row items-center justify-between">
  <Label nativeID="notifications-label">Enable notifications</Label>
  <Switch
    checked={checked}
    onCheckedChange={setChecked}
    aria-labelledby="notifications-label"
    accessibilityLabel="Enable notifications"
  />
</View>`,
    },
    {
      id: 'disabled',
      label: 'Disabled',
      description: 'Switch in disabled state',
      preview: (
        <View className="gap-3">
          <View className="w-full flex-row items-center justify-between">
            <Label nativeID="disabled-on-label" className="opacity-50">
              Disabled (On)
            </Label>
            <Switch
              checked={true}
              disabled={true}
              onCheckedChange={() => {}}
              aria-labelledby="disabled-on-label"
              accessibilityLabel="Disabled switch (on)"
            />
          </View>
          <View className="w-full flex-row items-center justify-between">
            <Label nativeID="disabled-off-label" className="opacity-50">
              Disabled (Off)
            </Label>
            <Switch
              checked={false}
              disabled={true}
              onCheckedChange={() => {}}
              aria-labelledby="disabled-off-label"
              accessibilityLabel="Disabled switch (off)"
            />
          </View>
        </View>
      ),
      code: `{/* Disabled (On) */}
<View className="flex-row items-center justify-between">
  <Label nativeID="disabled-on" className="opacity-50">
    Disabled (On)
  </Label>
  <Switch
    checked={true}
    disabled={true}
    aria-labelledby="disabled-on"
  />
</View>

{/* Disabled (Off) */}
<View className="flex-row items-center justify-between">
  <Label nativeID="disabled-off" className="opacity-50">
    Disabled (Off)
  </Label>
  <Switch
    checked={false}
    disabled={true}
    aria-labelledby="disabled-off"
  />
</View>`,
    },
    {
      id: 'settings-list',
      label: 'Settings List',
      description: 'Multiple switches in settings',
      preview: (
        <View className="w-full gap-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="font-medium">Push Notifications</Text>
              <Text className="text-sm text-muted-foreground">
                Receive notifications on your device
              </Text>
            </View>
            <Switch
              checked={true}
              onCheckedChange={() => {}}
              accessibilityLabel="Push notifications"
            />
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="font-medium">Email Updates</Text>
              <Text className="text-sm text-muted-foreground">Get updates via email</Text>
            </View>
            <Switch checked={false} onCheckedChange={() => {}} accessibilityLabel="Email updates" />
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="font-medium">Auto-play Videos</Text>
              <Text className="text-sm text-muted-foreground">Videos play automatically</Text>
            </View>
            <Switch
              checked={true}
              onCheckedChange={() => {}}
              accessibilityLabel="Auto-play videos"
            />
          </View>
        </View>
      ),
      code: `<View className="gap-4">
  <View className="flex-row items-center justify-between">
    <View className="flex-1">
      <Text className="font-medium">Push Notifications</Text>
      <Text className="text-sm text-muted-foreground">
        Receive notifications on your device
      </Text>
    </View>
    <Switch
      checked={pushEnabled}
      onCheckedChange={setPushEnabled}
      accessibilityLabel="Push notifications"
    />
  </View>
  {/* More switches... */}
</View>`,
    },
    {
      id: 'compact',
      label: 'Compact',
      description: 'Minimal switch for dense layouts',
      preview: (
        <View className="flex-row items-center gap-2">
          <Switch
            checked={true}
            onCheckedChange={() => {}}
            className="scale-90"
            accessibilityLabel="Compact toggle"
          />
          <Text className="text-sm">Compact mode</Text>
        </View>
      ),
      code: `<View className="flex-row items-center gap-2">
  <Switch
    checked={checked}
    onCheckedChange={setChecked}
    className="scale-90"
    accessibilityLabel="Compact toggle"
  />
  <Text className="text-sm">Compact mode</Text>
</View>`,
    },
  ],
};
