/**
 * Page Component Template
 *
 * Use this template when creating new page components.
 *
 * Steps:
 * 1. Copy this file to components/pages/[category]/[ComponentName].tsx
 * 2. Rename the component
 * 3. Update imports as needed
 * 4. Implement your page logic
 *
 * @example
 * components/pages/dashboard/OverviewPage.tsx
 */

import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Stack, Row, Container } from '@/core';

/**
 * Props interface for the component
 *
 * Define all props your component needs here.
 */
interface PageComponentProps {
  // Add your props here
  // Example:
  // userId?: string;
  // onAction?: () => void;
}

/**
 * Page Component
 *
 * Brief description of what this page does.
 *
 * @example
 * ```tsx
 * <PageComponent />
 * ```
 */
export function PageComponent({}: PageComponentProps) {
  // State
  const [loading, setLoading] = React.useState(false);

  // Effects
  React.useEffect(() => {
    // Component mount logic
    return () => {
      // Cleanup
    };
  }, []);

  // Handlers
  const handleAction = () => {
    // Handle user action
  };

  // Render
  return (
    <ScrollView className="flex-1 bg-background">
      <Container size="lg" padding>
        <Stack gap={6} className="py-6">
          {/* Page Header */}
          <Stack gap={2}>
            <Text className="text-3xl font-bold">Page Title</Text>
            <Text className="text-muted-foreground">Page description goes here</Text>
          </Stack>

          {/* Page Content */}
          <Card>
            <CardHeader>
              <CardTitle>Section Title</CardTitle>
              <CardDescription>Section description</CardDescription>
            </CardHeader>
            <CardContent>
              <Stack gap={4}>
                <Text>Content goes here</Text>

                <Row gap={2} justify="end">
                  <Button variant="outline" onPress={handleAction}>
                    <Text>Cancel</Text>
                  </Button>
                  <Button onPress={handleAction}>
                    <Text>Save</Text>
                  </Button>
                </Row>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </ScrollView>
  );
}
