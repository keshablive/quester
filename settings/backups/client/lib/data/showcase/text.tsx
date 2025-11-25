import React from 'react';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const textShowcaseData: ShowcaseComponentData = {
  id: 'text',
  name: 'Text',
  description:
    'Typography component with semantic variants for headings, paragraphs, and specialized text styles. Implements proper heading hierarchy and WCAG-compliant text rendering.',
  category: 'display',
  imports: ['@/components/ui/text'],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'Heading variants (h1-h4) automatically use accessibilityRole="heading"',
    'Proper heading hierarchy maintained for screen reader navigation',
    'Text meets WCAG AA contrast requirements (4.5:1 for normal text, 3:1 for large text)',
    'Muted variant maintains sufficient contrast for readability',
    'Code variant uses monospace font for technical content',
    'Text is selectable by default on web (FR-001)',
    'Line height ensures readability (WCAG 1.4.8)',
    'Supports all native Text accessibility props',
  ],
  variants: [
    {
      id: 'h1',
      label: 'Heading 1',
      description: 'Large heading for page titles',
      preview: <Text variant="h1">The Power of Learning</Text>,
      code: `<Text variant="h1">The Power of Learning</Text>`,
    },
    {
      id: 'h2',
      label: 'Heading 2',
      description: 'Section heading with border',
      preview: <Text variant="h2">Getting Started</Text>,
      code: `<Text variant="h2">Getting Started</Text>`,
    },
    {
      id: 'h3',
      label: 'Heading 3',
      description: 'Subsection heading',
      preview: <Text variant="h3">Course Overview</Text>,
      code: `<Text variant="h3">Course Overview</Text>`,
    },
    {
      id: 'h4',
      label: 'Heading 4',
      description: 'Smaller heading for nested sections',
      preview: <Text variant="h4">Module 1: Introduction</Text>,
      code: `<Text variant="h4">Module 1: Introduction</Text>`,
    },
    {
      id: 'paragraph',
      label: 'Paragraph',
      description: 'Body text with proper spacing',
      preview: (
        <Text variant="p">
          This is a paragraph of text that demonstrates the default styling for body content. It
          includes proper line height and spacing for optimal readability.
        </Text>
      ),
      code: `<Text variant="p">
  This is a paragraph of text that demonstrates the default styling 
  for body content. It includes proper line height and spacing for 
  optimal readability.
</Text>`,
    },
    {
      id: 'lead',
      label: 'Lead Text',
      description: 'Larger text for introductions',
      preview: (
        <Text variant="lead">Discover thousands of courses taught by expert instructors.</Text>
      ),
      code: `<Text variant="lead">
  Discover thousands of courses taught by expert instructors.
</Text>`,
    },
    {
      id: 'large',
      label: 'Large Text',
      description: 'Emphasized large text',
      preview: <Text variant="large">Important Information</Text>,
      code: `<Text variant="large">Important Information</Text>`,
    },
    {
      id: 'small',
      label: 'Small Text',
      description: 'Smaller text for metadata',
      preview: <Text variant="small">Last updated: 2 hours ago</Text>,
      code: `<Text variant="small">Last updated: 2 hours ago</Text>`,
    },
    {
      id: 'muted',
      label: 'Muted Text',
      description: 'De-emphasized secondary text',
      preview: (
        <Text variant="muted">
          This is secondary information that is less important than the main content.
        </Text>
      ),
      code: `<Text variant="muted">
  This is secondary information that is less important than the main content.
</Text>`,
    },
    {
      id: 'blockquote',
      label: 'Blockquote',
      description: 'Quoted text with border accent',
      preview: (
        <Text variant="blockquote">
          "Education is the most powerful weapon which you can use to change the world."
        </Text>
      ),
      code: `<Text variant="blockquote">
  "Education is the most powerful weapon which you can use to change the world."
</Text>`,
    },
    {
      id: 'code',
      label: 'Inline Code',
      description: 'Monospace text for code snippets',
      preview: (
        <View className="flex-row items-center gap-2">
          <Text>Use the</Text>
          <Text variant="code">useState</Text>
          <Text>hook for state management.</Text>
        </View>
      ),
      code: `<View className="flex-row items-center gap-2">
  <Text>Use the</Text>
  <Text variant="code">useState</Text>
  <Text>hook for state management.</Text>
</View>`,
    },
    {
      id: 'combination',
      label: 'Combined Styles',
      description: 'Multiple text variants in content',
      preview: (
        <View className="gap-3">
          <Text variant="h3">Welcome to React Native</Text>
          <Text variant="lead">Build native mobile apps using JavaScript and React.</Text>
          <Text variant="p">
            React Native combines the best parts of native development with React, a best-in-class
            JavaScript library for building user interfaces.
          </Text>
          <Text variant="muted">Updated January 2025</Text>
        </View>
      ),
      code: `<View className="gap-3">
  <Text variant="h3">Welcome to React Native</Text>
  <Text variant="lead">
    Build native mobile apps using JavaScript and React.
  </Text>
  <Text variant="p">
    React Native combines the best parts of native development with React,
    a best-in-class JavaScript library for building user interfaces.
  </Text>
  <Text variant="muted">Updated January 2025</Text>
</View>`,
    },
  ],
};
