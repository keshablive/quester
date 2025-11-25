import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const selectShowcaseData: ShowcaseComponentData = {
  id: 'select',
  name: 'Select',
  description:
    'Dropdown select component with full keyboard navigation and accessibility support. Implements FR-006 with accessibilityRole="combobox".',
  category: 'form',
  imports: ['@/components/ui/select', '@/components/ui/label', '@/components/ui/text'],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'Implements accessibilityRole="combobox" for screen readers (FR-006)',
    'Keyboard navigation with arrow keys and Enter/Space to select',
    'Selected value announced by screen readers',
    'Proper focus management when opening/closing dropdown',
    'Touch target meets 44x44 minimum requirement',
    'High contrast mode compatible',
    'Disabled state properly communicated',
    'Error states visually and semantically indicated',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default',
      description: 'Basic select with options',
      preview: (
        <View className="w-full gap-2">
          <Label nativeID="country-label">Country</Label>
          <Select defaultValue={{ value: 'us', label: 'United States' }}>
            <SelectTrigger aria-labelledby="country-label">
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem label="United States" value="us">
                United States
              </SelectItem>
              <SelectItem label="Canada" value="ca">
                Canada
              </SelectItem>
              <SelectItem label="United Kingdom" value="uk">
                United Kingdom
              </SelectItem>
              <SelectItem label="Germany" value="de">
                Germany
              </SelectItem>
            </SelectContent>
          </Select>
        </View>
      ),
      code: `<View className="gap-2">
  <Label nativeID="country-label">Country</Label>
  <Select defaultValue={{ value: 'us', label: 'United States' }}>
    <SelectTrigger aria-labelledby="country-label">
      <SelectValue placeholder="Select a country" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem label="United States" value="us">
        United States
      </SelectItem>
      <SelectItem label="Canada" value="ca">
        Canada
      </SelectItem>
      <SelectItem label="United Kingdom" value="uk">
        United Kingdom
      </SelectItem>
      <SelectItem label="Germany" value="de">
        Germany
      </SelectItem>
    </SelectContent>
  </Select>
</View>`,
    },
    {
      id: 'with-groups',
      label: 'With Groups',
      description: 'Select with grouped options',
      preview: (
        <View className="w-full gap-2">
          <Label nativeID="timezone-label">Time Zone</Label>
          <Select>
            <SelectTrigger aria-labelledby="timezone-label">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>North America</SelectLabel>
                <SelectItem label="Eastern Time" value="est">
                  Eastern Time
                </SelectItem>
                <SelectItem label="Central Time" value="cst">
                  Central Time
                </SelectItem>
                <SelectItem label="Pacific Time" value="pst">
                  Pacific Time
                </SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Europe</SelectLabel>
                <SelectItem label="GMT" value="gmt">
                  GMT
                </SelectItem>
                <SelectItem label="CET" value="cet">
                  CET
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </View>
      ),
      code: `<View className="gap-2">
  <Label nativeID="timezone-label">Time Zone</Label>
  <Select>
    <SelectTrigger aria-labelledby="timezone-label">
      <SelectValue placeholder="Select timezone" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectLabel>North America</SelectLabel>
        <SelectItem label="Eastern Time" value="est">
          Eastern Time
        </SelectItem>
        <SelectItem label="Central Time" value="cst">
          Central Time
        </SelectItem>
      </SelectGroup>
      <SelectGroup>
        <SelectLabel>Europe</SelectLabel>
        <SelectItem label="GMT" value="gmt">
          GMT
        </SelectItem>
        <SelectItem label="CET" value="cet">
          CET
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</View>`,
    },
    {
      id: 'disabled',
      label: 'Disabled',
      description: 'Select in disabled state',
      preview: (
        <View className="w-full gap-2">
          <Label nativeID="disabled-label">Category</Label>
          <Select disabled defaultValue={{ value: 'tech', label: 'Technology' }}>
            <SelectTrigger aria-labelledby="disabled-label">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem label="Technology" value="tech">
                Technology
              </SelectItem>
              <SelectItem label="Business" value="business">
                Business
              </SelectItem>
            </SelectContent>
          </Select>
        </View>
      ),
      code: `<View className="gap-2">
  <Label nativeID="disabled-label">Category</Label>
  <Select disabled defaultValue={{ value: 'tech', label: 'Technology' }}>
    <SelectTrigger aria-labelledby="disabled-label">
      <SelectValue placeholder="Select category" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem label="Technology" value="tech">
        Technology
      </SelectItem>
      <SelectItem label="Business" value="business">
        Business
      </SelectItem>
    </SelectContent>
  </Select>
</View>`,
    },
    {
      id: 'error',
      label: 'Error State',
      description: 'Select with validation error',
      preview: (
        <View className="w-full gap-2">
          <Label nativeID="error-label">Preferred Language</Label>
          <Select>
            <SelectTrigger
              aria-labelledby="error-label"
              aria-invalid={true}
              className="border-destructive">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem label="English" value="en">
                English
              </SelectItem>
              <SelectItem label="Spanish" value="es">
                Spanish
              </SelectItem>
            </SelectContent>
          </Select>
          <Text className="text-xs text-destructive">Please select a language to continue</Text>
        </View>
      ),
      code: `<View className="gap-2">
  <Label nativeID="error-label">Preferred Language</Label>
  <Select>
    <SelectTrigger 
      aria-labelledby="error-label"
      aria-invalid={true}
      className="border-destructive">
      <SelectValue placeholder="Select language" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem label="English" value="en">
        English
      </SelectItem>
      <SelectItem label="Spanish" value="es">
        Spanish
      </SelectItem>
    </SelectContent>
  </Select>
  <Text className="text-xs text-destructive">
    Please select a language to continue
  </Text>
</View>`,
    },
    {
      id: 'required',
      label: 'Required Field',
      description: 'Select marked as required',
      preview: (
        <View className="w-full gap-2">
          <Label nativeID="required-label">
            Experience Level <Text className="text-destructive">*</Text>
          </Label>
          <Select>
            <SelectTrigger aria-labelledby="required-label" aria-required={true}>
              <SelectValue placeholder="Select your level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem label="Beginner" value="beginner">
                Beginner
              </SelectItem>
              <SelectItem label="Intermediate" value="intermediate">
                Intermediate
              </SelectItem>
              <SelectItem label="Advanced" value="advanced">
                Advanced
              </SelectItem>
            </SelectContent>
          </Select>
        </View>
      ),
      code: `<View className="gap-2">
  <Label nativeID="required-label">
    Experience Level <Text className="text-destructive">*</Text>
  </Label>
  <Select>
    <SelectTrigger 
      aria-labelledby="required-label"
      aria-required={true}>
      <SelectValue placeholder="Select your level" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem label="Beginner" value="beginner">
        Beginner
      </SelectItem>
      <SelectItem label="Intermediate" value="intermediate">
        Intermediate
      </SelectItem>
      <SelectItem label="Advanced" value="advanced">
        Advanced
      </SelectItem>
    </SelectContent>
  </Select>
</View>`,
    },
    {
      id: 'small',
      label: 'Small Size',
      description: 'Compact select for dense layouts',
      preview: (
        <View className="w-full gap-2">
          <Label nativeID="sort-label" className="text-sm">
            Sort By
          </Label>
          <Select>
            <SelectTrigger aria-labelledby="sort-label" size="sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem label="Most Popular" value="popular">
                Most Popular
              </SelectItem>
              <SelectItem label="Newest" value="newest">
                Newest
              </SelectItem>
              <SelectItem label="Price: Low to High" value="price-asc">
                Price: Low to High
              </SelectItem>
            </SelectContent>
          </Select>
        </View>
      ),
      code: `<View className="gap-2">
  <Label nativeID="sort-label" className="text-sm">Sort By</Label>
  <Select>
    <SelectTrigger aria-labelledby="sort-label" size="sm">
      <SelectValue placeholder="Select" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem label="Most Popular" value="popular">
        Most Popular
      </SelectItem>
      <SelectItem label="Newest" value="newest">
        Newest
      </SelectItem>
      <SelectItem label="Price: Low to High" value="price-asc">
        Price: Low to High
      </SelectItem>
    </SelectContent>
  </Select>
</View>`,
    },
  ],
};
