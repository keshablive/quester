import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const textareaShowcaseData: ShowcaseComponentData = {
  id: 'textarea',
  name: 'Textarea',
  description:
    'Multiline text input with proper ARIA attributes. Implements FR-008: aria-labelledby, aria-invalid, aria-describedby when appropriate.',
  category: 'form',
  imports: ["import { Textarea } from '@/components/ui/textarea';"],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'FR-008: Supports aria-labelledby and aria-describedby for form guidance',
    'WCAG 3.3.2: Provide clear instructions and help text',
    'Use aria-invalid for validation errors',
    'On native, accessibilityLabelledBy is used instead of aria-labelledby',
    'Supports multiline input and proper text alignment',
    'Ensure placeholder text is not the only label',
    'Provide helper text below the textarea when necessary',
    'Keyboard accessible and supports large text entry',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default',
      description: 'Basic textarea with placeholder',
      preview: (
        <View className="w-full">
          <Label nativeID="desc-label">Description</Label>
          <Textarea placeholder="Enter a short description" aria-labelledby="desc-label" />
        </View>
      ),
      code: `<Label nativeID="desc-label">Description</Label>\n<Textarea placeholder="Enter a short description" aria-labelledby="desc-label" />`,
    },
    {
      id: 'with-helper',
      label: 'With Helper',
      description: 'Textarea with helper text and aria-describedby',
      preview: (
        <View className="w-full">
          <Label nativeID="notes-label">Notes</Label>
          <Textarea
            placeholder="Add notes"
            aria-labelledby="notes-label"
            aria-describedby="notes-help"
          />
          <Text nativeID="notes-help" className="text-xs text-muted-foreground">
            Keep this concise and relevant.
          </Text>
        </View>
      ),
      code: `// Use aria-describedby to link helper text`,
    },
    {
      id: 'error',
      label: 'Error State',
      description: 'Textarea showing aria-invalid when validation fails',
      preview: (
        <View className="w-full">
          <Label nativeID="msg-label">Message</Label>
          <Textarea placeholder="Type message" aria-labelledby="msg-label" aria-invalid />
          <Text className="text-xs text-destructive">Message is required</Text>
        </View>
      ),
      code: `// Use aria-invalid prop when validation fails`,
    },
    {
      id: 'large',
      label: 'Large',
      description: 'Textarea with larger initial size',
      preview: (
        <View className="w-full">
          <Label nativeID="bio-label">Bio</Label>
          <Textarea placeholder="Write a bio" numberOfLines={6} aria-labelledby="bio-label" />
        </View>
      ),
      code: `// numberOfLines controls initial height on native`,
    },
    {
      id: 'readonly',
      label: 'Read Only',
      description: 'Non-editable textarea for display',
      preview: (
        <View className="w-full">
          <Label nativeID="notes-label">Read Only Notes</Label>
          <Textarea placeholder="Not editable" editable={false} aria-labelledby="notes-label" />
        </View>
      ),
      code: `// Set editable={false} to make readonly`,
    },
    {
      id: 'with-counter',
      label: 'With Character Counter',
      description: 'Textarea with a visible character counter (UI only)',
      preview: (
        <View className="w-full">
          <Label nativeID="comment-label">Comment</Label>
          <Textarea placeholder="Leave a comment" aria-labelledby="comment-label" />
          <Text className="text-xs text-muted-foreground">0 / 500</Text>
        </View>
      ),
      code: `// Implement character counters with state in your app`,
    },
  ],
};
