/**
 * Button Component Showcase Data (Phase 6, T149)
 * 
 * Live examples of all Button variants with code snippets
 * and accessibility documentation
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Download } from 'lucide-react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const buttonShowcaseData: ShowcaseComponentData = {
  id: 'button',
  name: 'Button',
  description: 'Versatile button component with multiple variants, sizes, and full accessibility support',
  category: 'form',
  imports: ['@/components/ui/button', '@/components/ui/text'],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'Properly implements accessibilityRole="button" for screen readers',
    'Has accessible touch target size (minimum 44x44 pixels)',
    'Supports accessibilityLabel and accessibilityHint props',
    'Keyboard navigation supported via focusable prop',
    'Visual focus indicators for keyboard navigation',
    'Disabled state properly communicated via accessibilityState',
    'High contrast mode compatible',
    'Text wrapping enabled by default (FR-001)',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default',
      description: 'Primary button for main actions',
      preview: (
        <Button accessibilityLabel="Default button example">
          <Text>Default Button</Text>
        </Button>
      ),
      code: `<Button>
  <Text>Default Button</Text>
</Button>`,
    },
    {
      id: 'destructive',
      label: 'Destructive',
      description: 'For destructive or dangerous actions',
      preview: (
        <Button variant="destructive" accessibilityLabel="Destructive button example">
          <Text>Delete Item</Text>
        </Button>
      ),
      code: `<Button variant="destructive">
  <Text>Delete Item</Text>
</Button>`,
    },
    {
      id: 'outline',
      label: 'Outline',
      description: 'Secondary button with border',
      preview: (
        <Button variant="outline" accessibilityLabel="Outline button example">
          <Text>Outline Button</Text>
        </Button>
      ),
      code: `<Button variant="outline">
  <Text>Outline Button</Text>
</Button>`,
    },
    {
      id: 'secondary',
      label: 'Secondary',
      description: 'Less prominent secondary actions',
      preview: (
        <Button variant="secondary" accessibilityLabel="Secondary button example">
          <Text>Secondary Button</Text>
        </Button>
      ),
      code: `<Button variant="secondary">
  <Text>Secondary Button</Text>
</Button>`,
    },
    {
      id: 'ghost',
      label: 'Ghost',
      description: 'Minimal button for subtle actions',
      preview: (
        <Button variant="ghost" accessibilityLabel="Ghost button example">
          <Text>Ghost Button</Text>
        </Button>
      ),
      code: `<Button variant="ghost">
  <Text>Ghost Button</Text>
</Button>`,
    },
    {
      id: 'link',
      label: 'Link',
      description: 'Styled like a hyperlink',
      preview: (
        <Button variant="link" accessibilityLabel="Link button example">
          <Text>Link Button</Text>
        </Button>
      ),
      code: `<Button variant="link">
  <Text>Link Button</Text>
</Button>`,
    },
    {
      id: 'sizes',
      label: 'Sizes',
      description: 'Small, default, large, and icon sizes',
      preview: (
        <>
          <Button size="sm" accessibilityLabel="Small button">
            <Text>Small</Text>
          </Button>
          <Button size="default" className="mt-2" accessibilityLabel="Default size button">
            <Text>Default</Text>
          </Button>
          <Button size="lg" className="mt-2" accessibilityLabel="Large button">
            <Text>Large</Text>
          </Button>
          <Button size="icon" className="mt-2" accessibilityLabel="Icon only button">
            <Icon as={Download} size={20} />
          </Button>
        </>
      ),
      code: `<Button size="sm">
  <Text>Small</Text>
</Button>

<Button size="default">
  <Text>Default</Text>
</Button>

<Button size="lg">
  <Text>Large</Text>
</Button>

<Button size="icon">
  <Icon as={Download} size={20} />
</Button>`,
    },
    {
      id: 'with-icon',
      label: 'With Icon',
      description: 'Button with icon and text',
      preview: (
        <Button className="flex-row items-center gap-2" accessibilityLabel="Download button">
          <Icon as={Download} size={20} />
          <Text>Download</Text>
        </Button>
      ),
      code: `<Button className="flex-row items-center gap-2">
  <Icon as={Download} size={20} />
  <Text>Download</Text>
</Button>`,
    },
    {
      id: 'disabled',
      label: 'Disabled',
      description: 'Disabled state for all variants',
      preview: (
        <>
          <Button disabled accessibilityLabel="Disabled button" accessibilityHint="This button is currently disabled">
            <Text>Disabled</Text>
          </Button>
          <Button variant="outline" disabled className="mt-2" accessibilityLabel="Disabled outline button">
            <Text>Disabled Outline</Text>
          </Button>
        </>
      ),
      code: `<Button disabled>
  <Text>Disabled</Text>
</Button>

<Button variant="outline" disabled>
  <Text>Disabled Outline</Text>
</Button>`,
    },
  ],
};
