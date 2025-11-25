import React, { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const accordionShowcaseData: ShowcaseComponentData = {
  id: 'accordion',
  name: 'Accordion',
  description:
    'Collapsible content sections with smooth animations. Implements FR-006 accessibilityRole="button" on triggers (WCAG 4.1.2) and FR-010 navigation state announcements for expanded/collapsed states. Uses LinearTransition for smooth expand/collapse with ChevronDown rotation.',
  category: 'layout',
  imports: [
    "import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';",
  ],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'FR-006: AccordionTrigger has accessibilityRole="button" (WCAG 4.1.2)',
    'FR-010: Navigation state announcements for expanded/collapsed states',
    'Screen readers announce "button, expanded" or "button, collapsed"',
    'Keyboard navigation: Space/Enter to toggle, Tab to navigate between items',
    'LinearTransition provides smooth 200ms expand/collapse animations',
    'ChevronDown rotates 180° to indicate state (0.25s timing)',
    'Supports single or multiple expanded items via type prop',
    'Border separators between items (last item has no border on web)',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default Single',
      description: 'Single accordion with one item expandable at a time',
      preview: (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>
              <Text>What is Quester?</Text>
            </AccordionTrigger>
            <AccordionContent>
              <Text>
                Quester is a gamified learning management system with video streaming, achievements,
                and adaptive learning paths.
              </Text>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>
              <Text>How does XP work?</Text>
            </AccordionTrigger>
            <AccordionContent>
              <Text>
                Students earn XP by completing lessons, quizzes, and assignments. XP unlocks badges
                and levels.
              </Text>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>
              <Text>Is it accessible?</Text>
            </AccordionTrigger>
            <AccordionContent>
              <Text>
                Yes! Quester implements WCAG AA standards with screen reader support, keyboard
                navigation, and proper ARIA labels.
              </Text>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ),
      code: `<Accordion type="single" collapsible className="w-full">
  <AccordionItem value="item-1">
    <AccordionTrigger>
      <Text>What is Quester?</Text>
    </AccordionTrigger>
    <AccordionContent>
      <Text>
        Quester is a gamified learning management system with 
        video streaming, achievements, and adaptive learning paths.
      </Text>
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="item-2">
    <AccordionTrigger>
      <Text>How does XP work?</Text>
    </AccordionTrigger>
    <AccordionContent>
      <Text>
        Students earn XP by completing lessons, quizzes, and 
        assignments. XP unlocks badges and levels.
      </Text>
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="item-3">
    <AccordionTrigger>
      <Text>Is it accessible?</Text>
    </AccordionTrigger>
    <AccordionContent>
      <Text>
        Yes! Quester implements WCAG AA standards with screen 
        reader support, keyboard navigation, and proper ARIA labels.
      </Text>
    </AccordionContent>
  </AccordionItem>
</Accordion>`,
    },
    {
      id: 'multiple',
      label: 'Multiple Expandable',
      description: 'Multiple items can be expanded simultaneously',
      preview: (
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="features">
            <AccordionTrigger>
              <Text>Features</Text>
            </AccordionTrigger>
            <AccordionContent>
              <Text>
                Video streaming, gamification, adaptive learning, progress tracking, certificates.
              </Text>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="pricing">
            <AccordionTrigger>
              <Text>Pricing</Text>
            </AccordionTrigger>
            <AccordionContent>
              <Text>Free for educators, flexible pricing for institutions.</Text>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="support">
            <AccordionTrigger>
              <Text>Support</Text>
            </AccordionTrigger>
            <AccordionContent>
              <Text>24/7 email support, documentation, and community forums.</Text>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ),
      code: `<Accordion type="multiple" className="w-full">
  <AccordionItem value="features">
    <AccordionTrigger>
      <Text>Features</Text>
    </AccordionTrigger>
    <AccordionContent>
      <Text>
        Video streaming, gamification, adaptive learning, 
        progress tracking, certificates.
      </Text>
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="pricing">
    <AccordionTrigger>
      <Text>Pricing</Text>
    </AccordionTrigger>
    <AccordionContent>
      <Text>
        Free for educators, flexible pricing for institutions.
      </Text>
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="support">
    <AccordionTrigger>
      <Text>Support</Text>
    </AccordionTrigger>
    <AccordionContent>
      <Text>
        24/7 email support, documentation, and community forums.
      </Text>
    </AccordionContent>
  </AccordionItem>
</Accordion>`,
    },
    {
      id: 'with-rich-content',
      label: 'Rich Content',
      description: 'Accordion with formatted text and nested elements',
      preview: (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="course-content">
            <AccordionTrigger>
              <Text className="font-semibold">Course Content</Text>
            </AccordionTrigger>
            <AccordionContent>
              <View className="gap-3">
                <Text className="font-medium">Module 1: Introduction</Text>
                <Text className="text-sm text-muted-foreground">
                  • Getting started{'\n'}• Platform overview{'\n'}• First assignment
                </Text>
                <Text className="font-medium">Module 2: Advanced Topics</Text>
                <Text className="text-sm text-muted-foreground">
                  • Deep dive into features{'\n'}• Best practices{'\n'}• Final project
                </Text>
              </View>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ),
      code: `<Accordion type="single" collapsible className="w-full">
  <AccordionItem value="course-content">
    <AccordionTrigger>
      <Text className="font-semibold">Course Content</Text>
    </AccordionTrigger>
    <AccordionContent>
      <View className="gap-3">
        <Text className="font-medium">Module 1: Introduction</Text>
        <Text className="text-sm text-muted-foreground">
          • Getting started{'\n'}
          • Platform overview{'\n'}
          • First assignment
        </Text>
        <Text className="font-medium">Module 2: Advanced Topics</Text>
        <Text className="text-sm text-muted-foreground">
          • Deep dive into features{'\n'}
          • Best practices{'\n'}
          • Final project
        </Text>
      </View>
    </AccordionContent>
  </AccordionItem>
</Accordion>`,
    },
    {
      id: 'controlled',
      label: 'Controlled State',
      description: 'Accordion with controlled expanded state',
      preview: (() => {
        const [value, setValue] = useState<string | undefined>('item-1');
        const handleValueChange = (newValue: string | undefined) => {
          setValue(newValue);
        };
        return (
          <View className="gap-2">
            <Text className="text-sm text-muted-foreground">
              Currently expanded: {value || 'none'}
            </Text>
            <Accordion
              type="single"
              collapsible
              value={value}
              onValueChange={handleValueChange}
              className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  <Text>Section 1</Text>
                </AccordionTrigger>
                <AccordionContent>
                  <Text>Content for section 1</Text>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>
                  <Text>Section 2</Text>
                </AccordionTrigger>
                <AccordionContent>
                  <Text>Content for section 2</Text>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </View>
        );
      })(),
      code: `const [value, setValue] = useState<string | undefined>('item-1');

return (
  <View className="gap-2">
    <Text className="text-sm text-muted-foreground">
      Currently expanded: {value || 'none'}
    </Text>
    <Accordion 
      type="single" 
      collapsible
      value={value}
      onValueChange={setValue}
      className="w-full"
    >
      <AccordionItem value="item-1">
        <AccordionTrigger>
          <Text>Section 1</Text>
        </AccordionTrigger>
        <AccordionContent>
          <Text>Content for section 1</Text>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>
          <Text>Section 2</Text>
        </AccordionTrigger>
        <AccordionContent>
          <Text>Content for section 2</Text>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </View>
);`,
    },
    {
      id: 'faq-style',
      label: 'FAQ Style',
      description: 'Accordion formatted as frequently asked questions',
      preview: (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="q1">
            <AccordionTrigger>
              <Text>How do I reset my password?</Text>
            </AccordionTrigger>
            <AccordionContent>
              <Text className="text-sm">
                Click "Forgot Password" on the login page and follow the email instructions.
              </Text>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q2">
            <AccordionTrigger>
              <Text>Can I download course materials?</Text>
            </AccordionTrigger>
            <AccordionContent>
              <Text className="text-sm">
                Yes, course materials marked as downloadable can be saved for offline viewing.
              </Text>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q3">
            <AccordionTrigger>
              <Text>What devices are supported?</Text>
            </AccordionTrigger>
            <AccordionContent>
              <Text className="text-sm">
                Quester works on iOS, Android, and web browsers (Chrome, Safari, Firefox, Edge).
              </Text>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ),
      code: `<Accordion type="single" collapsible className="w-full">
  <AccordionItem value="q1">
    <AccordionTrigger>
      <Text>How do I reset my password?</Text>
    </AccordionTrigger>
    <AccordionContent>
      <Text className="text-sm">
        Click "Forgot Password" on the login page and follow 
        the email instructions.
      </Text>
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="q2">
    <AccordionTrigger>
      <Text>Can I download course materials?</Text>
    </AccordionTrigger>
    <AccordionContent>
      <Text className="text-sm">
        Yes, course materials marked as downloadable can be 
        saved for offline viewing.
      </Text>
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="q3">
    <AccordionTrigger>
      <Text>What devices are supported?</Text>
    </AccordionTrigger>
    <AccordionContent>
      <Text className="text-sm">
        Quester works on iOS, Android, and web browsers 
        (Chrome, Safari, Firefox, Edge).
      </Text>
    </AccordionContent>
  </AccordionItem>
</Accordion>`,
    },
    {
      id: 'nested',
      label: 'Nested Accordions',
      description: 'Accordion items containing nested accordions',
      preview: (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="parent">
            <AccordionTrigger>
              <Text>Course Modules</Text>
            </AccordionTrigger>
            <AccordionContent>
              <Accordion type="single" collapsible className="w-full border-l-2 border-border pl-2">
                <AccordionItem value="child-1">
                  <AccordionTrigger>
                    <Text className="text-sm">Module 1: Basics</Text>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Text className="text-sm text-muted-foreground">
                      Lessons 1-5: Introduction to core concepts
                    </Text>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="child-2">
                  <AccordionTrigger>
                    <Text className="text-sm">Module 2: Advanced</Text>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Text className="text-sm text-muted-foreground">
                      Lessons 6-10: Deep dive into advanced topics
                    </Text>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ),
      code: `<Accordion type="single" collapsible className="w-full">
  <AccordionItem value="parent">
    <AccordionTrigger>
      <Text>Course Modules</Text>
    </AccordionTrigger>
    <AccordionContent>
      <Accordion 
        type="single" 
        collapsible 
        className="w-full border-l-2 border-border pl-2"
      >
        <AccordionItem value="child-1">
          <AccordionTrigger>
            <Text className="text-sm">Module 1: Basics</Text>
          </AccordionTrigger>
          <AccordionContent>
            <Text className="text-sm text-muted-foreground">
              Lessons 1-5: Introduction to core concepts
            </Text>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="child-2">
          <AccordionTrigger>
            <Text className="text-sm">Module 2: Advanced</Text>
          </AccordionTrigger>
          <AccordionContent>
            <Text className="text-sm text-muted-foreground">
              Lessons 6-10: Deep dive into advanced topics
            </Text>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </AccordionContent>
  </AccordionItem>
</Accordion>`,
    },
  ],
};
