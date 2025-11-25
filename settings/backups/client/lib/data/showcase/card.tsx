import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Heart, Share2, BookOpen } from 'lucide-react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const cardShowcaseData: ShowcaseComponentData = {
  id: 'card',
  name: 'Card',
  description:
    'Versatile container component with header, content, and footer sections. Supports multiple visual styles and interactive states.',
  category: 'layout',
  imports: ['@/components/ui/card', '@/components/ui/text', '@/components/ui/button'],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'Uses accessibilityRole="summary" for screen readers',
    'Supports grouping related content with proper semantic structure',
    'CardTitle implements proper heading hierarchy',
    'CardDescription provides additional context for screen readers',
    'Interactive cards include accessibilityState for pressed/disabled states',
    'Sufficient color contrast for all text and borders (4.5:1 minimum)',
    'Keyboard navigation supported via focusable prop on interactive cards',
    'Touch target meets 44x44 minimum when interactive',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default',
      description: 'Basic card with header, content, and footer',
      preview: (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>
              This is a description that provides additional context
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Text>
              Card content goes here. This can include any components like text, images, or
              interactive elements.
            </Text>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm">
              <Text>Cancel</Text>
            </Button>
            <Button size="sm">
              <Text>Continue</Text>
            </Button>
          </CardFooter>
        </Card>
      ),
      code: `<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>
      This is a description that provides additional context
    </CardDescription>
  </CardHeader>
  <CardContent>
    <Text>
      Card content goes here. This can include any components.
    </Text>
  </CardContent>
  <CardFooter>
    <Button variant="outline" size="sm">
      <Text>Cancel</Text>
    </Button>
    <Button size="sm">
      <Text>Continue</Text>
    </Button>
  </CardFooter>
</Card>`,
    },
    {
      id: 'elevated',
      label: 'Elevated',
      description: 'Card with shadow elevation for depth',
      preview: (
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle>Elevated Card</CardTitle>
            <CardDescription>Card with enhanced shadow depth</CardDescription>
          </CardHeader>
          <CardContent>
            <Text>This card uses shadow-lg for a more prominent elevation effect.</Text>
          </CardContent>
        </Card>
      ),
      code: `<Card className="shadow-lg">
  <CardHeader>
    <CardTitle>Elevated Card</CardTitle>
    <CardDescription>Card with enhanced shadow depth</CardDescription>
  </CardHeader>
  <CardContent>
    <Text>
      This card uses shadow-lg for a more prominent elevation effect.
    </Text>
  </CardContent>
</Card>`,
    },
    {
      id: 'outlined',
      label: 'Outlined',
      description: 'Card with border emphasis',
      preview: (
        <Card className="w-full border-2 border-primary">
          <CardHeader>
            <CardTitle>Outlined Card</CardTitle>
            <CardDescription>Card with prominent border</CardDescription>
          </CardHeader>
          <CardContent>
            <Text>This card uses a thicker border for visual emphasis.</Text>
          </CardContent>
        </Card>
      ),
      code: `<Card className="border-2 border-primary">
  <CardHeader>
    <CardTitle>Outlined Card</CardTitle>
    <CardDescription>Card with prominent border</CardDescription>
  </CardHeader>
  <CardContent>
    <Text>This card uses a thicker border for visual emphasis.</Text>
  </CardContent>
</Card>`,
    },
    {
      id: 'with-icon',
      label: 'With Icon',
      description: 'Card with icon in header',
      preview: (
        <Card className="w-full">
          <CardHeader className="flex-row items-center gap-3">
            <Icon as={BookOpen} size={24} className="text-primary" />
            <CardTitle>Course Card</CardTitle>
          </CardHeader>
          <CardContent>
            <Text>
              Learn the fundamentals of React Native development with this comprehensive course.
            </Text>
          </CardContent>
          <CardFooter>
            <Button size="sm">
              <Text>Enroll Now</Text>
            </Button>
          </CardFooter>
        </Card>
      ),
      code: `<Card>
  <CardHeader className="flex-row items-center gap-3">
    <Icon as={BookOpen} size={24} className="text-primary" />
    <CardTitle>Course Card</CardTitle>
  </CardHeader>
  <CardContent>
    <Text>
      Learn the fundamentals of React Native development.
    </Text>
  </CardContent>
  <CardFooter>
    <Button size="sm">
      <Text>Enroll Now</Text>
    </Button>
  </CardFooter>
</Card>`,
    },
    {
      id: 'interactive',
      label: 'Interactive',
      description: 'Clickable card with press feedback',
      preview: (
        <Card
          className="w-full"
          accessibilityRole="button"
          accessibilityLabel="Course card: Introduction to TypeScript"
          accessibilityHint="Double tap to view course details">
          <CardHeader>
            <CardTitle>Introduction to TypeScript</CardTitle>
            <CardDescription>4.8 ⭐ • 12,450 students</CardDescription>
          </CardHeader>
          <CardContent>
            <Text>
              Master TypeScript fundamentals and advanced patterns in this comprehensive course.
            </Text>
          </CardContent>
          <CardFooter className="flex-row justify-between">
            <Text className="text-lg font-bold text-primary">$49.99</Text>
            <Button variant="ghost" size="sm">
              <Icon as={Heart} size={18} />
            </Button>
          </CardFooter>
        </Card>
      ),
      code: `<Card
  accessibilityRole="button"
  accessibilityLabel="Course card: Introduction to TypeScript"
  accessibilityHint="Double tap to view course details">
  <CardHeader>
    <CardTitle>Introduction to TypeScript</CardTitle>
    <CardDescription>4.8 ⭐ • 12,450 students</CardDescription>
  </CardHeader>
  <CardContent>
    <Text>
      Master TypeScript fundamentals and advanced patterns.
    </Text>
  </CardContent>
  <CardFooter className="flex-row justify-between">
    <Text className="text-lg font-bold text-primary">$49.99</Text>
    <Button variant="ghost" size="sm">
      <Icon as={Heart} size={18} />
    </Button>
  </CardFooter>
</Card>`,
    },
    {
      id: 'content-only',
      label: 'Content Only',
      description: 'Card with only content section',
      preview: (
        <Card className="w-full">
          <CardContent>
            <Text>
              A simple card with just content. Perfect for displaying concise information without
              additional structure.
            </Text>
          </CardContent>
        </Card>
      ),
      code: `<Card>
  <CardContent>
    <Text>
      A simple card with just content. Perfect for displaying 
      concise information without additional structure.
    </Text>
  </CardContent>
</Card>`,
    },
    {
      id: 'actions',
      label: 'With Actions',
      description: 'Card with multiple action buttons',
      preview: (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Advanced React Patterns</CardTitle>
            <CardDescription>New course available</CardDescription>
          </CardHeader>
          <CardContent>
            <Text>
              Dive deep into advanced React patterns including render props, compound components,
              and custom hooks.
            </Text>
          </CardContent>
          <CardFooter className="flex-row justify-end gap-2">
            <Button variant="ghost" size="sm">
              <Icon as={Share2} size={18} />
            </Button>
            <Button variant="ghost" size="sm">
              <Icon as={Heart} size={18} />
            </Button>
            <Button size="sm">
              <Text>View Course</Text>
            </Button>
          </CardFooter>
        </Card>
      ),
      code: `<Card>
  <CardHeader>
    <CardTitle>Advanced React Patterns</CardTitle>
    <CardDescription>New course available</CardDescription>
  </CardHeader>
  <CardContent>
    <Text>
      Dive deep into advanced React patterns including render props,
      compound components, and custom hooks.
    </Text>
  </CardContent>
  <CardFooter className="flex-row justify-end gap-2">
    <Button variant="ghost" size="sm">
      <Icon as={Share2} size={18} />
    </Button>
    <Button variant="ghost" size="sm">
      <Icon as={Heart} size={18} />
    </Button>
    <Button size="sm">
      <Text>View Course</Text>
    </Button>
  </CardFooter>
</Card>`,
    },
    {
      id: 'compact',
      label: 'Compact',
      description: 'Minimal padding for dense layouts',
      preview: (
        <Card className="w-full">
          <CardHeader className="py-2">
            <CardTitle className="text-base">Compact Card</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <Text className="text-sm">Reduced padding for space-efficient layouts.</Text>
          </CardContent>
        </Card>
      ),
      code: `<Card>
  <CardHeader className="py-2">
    <CardTitle className="text-base">Compact Card</CardTitle>
  </CardHeader>
  <CardContent className="py-2">
    <Text className="text-sm">
      Reduced padding for space-efficient layouts.
    </Text>
  </CardContent>
</Card>`,
    },
  ],
};
