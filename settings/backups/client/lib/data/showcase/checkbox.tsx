import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const checkboxShowcaseData: ShowcaseComponentData = {
  id: 'checkbox',
  name: 'Checkbox',
  description:
    'Native checkbox component with full accessibility support, keyboard navigation, and customizable styles. Supports checked, unchecked, and indeterminate states.',
  category: 'form',
  imports: ['@/components/ui/checkbox', '@/components/ui/text'],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'Implements accessibilityRole="checkbox" for proper screen reader identification',
    'Uses accessibilityState to communicate checked/unchecked/indeterminate states',
    'Supports accessibilityLabel for labeling checkbox purpose',
    'Keyboard navigation enabled with Space key to toggle',
    'Visual focus indicators for keyboard navigation (FR-006)',
    'Touch target meets 44x44 minimum requirement',
    'High contrast mode compatible with border and fill states',
    'Error states communicated through accessibilityState and visual styling',
  ],
  variants: [
    {
      id: 'checked',
      label: 'Checked',
      description: 'Checkbox in checked state',
      preview: (
        <Checkbox
          checked={true}
          onCheckedChange={() => {}}
          accessibilityLabel="Example checked checkbox"
        />
      ),
      code: `<Checkbox
  checked={true}
  onCheckedChange={(checked) => setChecked(checked)}
  accessibilityLabel="Example checked checkbox"
/>`,
    },
    {
      id: 'unchecked',
      label: 'Unchecked',
      description: 'Checkbox in unchecked state',
      preview: (
        <Checkbox
          checked={false}
          onCheckedChange={() => {}}
          accessibilityLabel="Example unchecked checkbox"
        />
      ),
      code: `<Checkbox
  checked={false}
  onCheckedChange={(checked) => setChecked(checked)}
  accessibilityLabel="Example unchecked checkbox"
/>`,
    },
    {
      id: 'indeterminate',
      label: 'Indeterminate',
      description: 'Checkbox with indeterminate styling (via className)',
      preview: (
        <Checkbox
          checked={true}
          onCheckedChange={() => {}}
          className="opacity-60"
          accessibilityLabel="Example partially selected checkbox"
          accessibilityHint="Partially selected state"
        />
      ),
      code: `<Checkbox
  checked={true}
  onCheckedChange={(checked) => setChecked(checked)}
  className="opacity-60"
  accessibilityLabel="Example partially selected checkbox"
  accessibilityHint="Partially selected state"
/>`,
    },
    {
      id: 'disabled',
      label: 'Disabled',
      description: 'Checkbox in disabled state',
      preview: (
        <Checkbox
          checked={true}
          disabled={true}
          onCheckedChange={() => {}}
          accessibilityLabel="Disabled checkbox"
        />
      ),
      code: `<Checkbox
  checked={true}
  disabled={true}
  onCheckedChange={(checked) => setChecked(checked)}
  accessibilityLabel="Disabled checkbox"
/>`,
    },
    {
      id: 'with-label',
      label: 'With Label',
      description: 'Checkbox with accompanying text label',
      preview: (
        <View className="flex-row items-center gap-2">
          <Checkbox
            checked={true}
            onCheckedChange={() => {}}
            accessibilityLabel="Accept terms and conditions"
          />
          <Text>Accept terms and conditions</Text>
        </View>
      ),
      code: `<View className="flex-row items-center gap-2">
  <Checkbox
    checked={checked}
    onCheckedChange={setChecked}
    accessibilityLabel="Accept terms and conditions"
  />
  <Text>Accept terms and conditions</Text>
</View>`,
    },
    {
      id: 'in-form',
      label: 'In Form',
      description: 'Multiple checkboxes in a form group',
      preview: (
        <View className="gap-3">
          <Text className="font-semibold">Select your interests:</Text>
          <View className="flex-row items-center gap-2">
            <Checkbox
              checked={true}
              onCheckedChange={() => {}}
              accessibilityLabel="Web Development"
            />
            <Text>Web Development</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Checkbox
              checked={false}
              onCheckedChange={() => {}}
              accessibilityLabel="Mobile Development"
            />
            <Text>Mobile Development</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Checkbox checked={true} onCheckedChange={() => {}} accessibilityLabel="Data Science" />
            <Text>Data Science</Text>
          </View>
        </View>
      ),
      code: `<View className="gap-3">
  <Text className="font-semibold">Select your interests:</Text>
  <View className="flex-row items-center gap-2">
    <Checkbox
      checked={webDev}
      onCheckedChange={setWebDev}
      accessibilityLabel="Web Development"
    />
    <Text>Web Development</Text>
  </View>
  <View className="flex-row items-center gap-2">
    <Checkbox
      checked={mobileDev}
      onCheckedChange={setMobileDev}
      accessibilityLabel="Mobile Development"
    />
    <Text>Mobile Development</Text>
  </View>
  <View className="flex-row items-center gap-2">
    <Checkbox
      checked={dataScience}
      onCheckedChange={setDataScience}
      accessibilityLabel="Data Science"
    />
    <Text>Data Science</Text>
  </View>
</View>`,
    },
    {
      id: 'error',
      label: 'Error State',
      description: 'Checkbox with validation error',
      preview: (
        <View className="gap-1">
          <View className="flex-row items-center gap-2">
            <Checkbox
              checked={false}
              onCheckedChange={() => {}}
              accessibilityLabel="I agree to the terms"
              className="border-destructive"
            />
            <Text>I agree to the terms</Text>
          </View>
          <Text className="text-xs text-destructive">You must accept the terms to continue</Text>
        </View>
      ),
      code: `<View className="gap-1">
  <View className="flex-row items-center gap-2">
    <Checkbox
      checked={agreed}
      onCheckedChange={setAgreed}
      accessibilityLabel="I agree to the terms"
      className="border-destructive"
    />
    <Text>I agree to the terms</Text>
  </View>
  <Text className="text-xs text-destructive">
    You must accept the terms to continue
  </Text>
</View>`,
    },
    {
      id: 'sizes',
      label: 'Different Sizes',
      description: 'Checkbox in small, default, and large sizes',
      preview: (
        <View className="flex-row items-center gap-4">
          <View className="flex-row items-center gap-2">
            <Checkbox
              checked={true}
              onCheckedChange={() => {}}
              className="h-4 w-4"
              accessibilityLabel="Small checkbox"
            />
            <Text className="text-sm">Small</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Checkbox
              checked={true}
              onCheckedChange={() => {}}
              accessibilityLabel="Default checkbox"
            />
            <Text>Default</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Checkbox
              checked={true}
              onCheckedChange={() => {}}
              className="h-7 w-7"
              accessibilityLabel="Large checkbox"
            />
            <Text className="text-lg">Large</Text>
          </View>
        </View>
      ),
      code: `{/* Small */}
<Checkbox
  checked={checked}
  onCheckedChange={setChecked}
  className="h-4 w-4"
  accessibilityLabel="Small checkbox"
/>

{/* Default */}
<Checkbox
  checked={checked}
  onCheckedChange={setChecked}
  accessibilityLabel="Default checkbox"
/>

{/* Large */}
<Checkbox
  checked={checked}
  onCheckedChange={setChecked}
  className="h-7 w-7"
  accessibilityLabel="Large checkbox"
/>`,
    },
  ],
};
