import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Home, User, Settings } from 'lucide-react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const tabsShowcaseData: ShowcaseComponentData = {
  id: 'tabs',
  name: 'Tabs',
  description:
    'Tabbed navigation component for organizing content. Implements FR-006 with accessibilityRole="tab" and FR-010 for navigation state announcements.',
  category: 'navigation',
  imports: ['@/components/ui/tabs', '@/components/ui/text'],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'Implements accessibilityRole="tab" for screen readers (FR-006)',
    'Selected tab state announced via FR-010 navigation state',
    'Keyboard navigation with arrow keys',
    'Focus indicators visible for keyboard navigation',
    'Tab panel content properly associated with tab trigger',
    'Touch targets meet 44x44 minimum requirement',
    'High contrast mode compatible',
    'Proper ARIA roles for tablist/tab/tabpanel relationship',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default',
      description: 'Basic tabs with text content',
      preview: (
        <Tabs value="tab1" onValueChange={() => {}} className="w-full">
          <TabsList>
            <TabsTrigger value="tab1">
              <Text>Account</Text>
            </TabsTrigger>
            <TabsTrigger value="tab2">
              <Text>Password</Text>
            </TabsTrigger>
            <TabsTrigger value="tab3">
              <Text>Settings</Text>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">
            <Text>Account settings content</Text>
          </TabsContent>
          <TabsContent value="tab2">
            <Text>Password settings content</Text>
          </TabsContent>
          <TabsContent value="tab3">
            <Text>General settings content</Text>
          </TabsContent>
        </Tabs>
      ),
      code: `const [value, setValue] = useState('tab1');

<Tabs value={value} onValueChange={setValue}>
  <TabsList>
    <TabsTrigger value="tab1">
      <Text>Account</Text>
    </TabsTrigger>
    <TabsTrigger value="tab2">
      <Text>Password</Text>
    </TabsTrigger>
    <TabsTrigger value="tab3">
      <Text>Settings</Text>
    </TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    <Text>Account settings content</Text>
  </TabsContent>
  <TabsContent value="tab2">
    <Text>Password settings content</Text>
  </TabsContent>
  <TabsContent value="tab3">
    <Text>General settings content</Text>
  </TabsContent>
</Tabs>`,
    },
    {
      id: 'with-icons',
      label: 'With Icons',
      description: 'Tabs with icons and text',
      preview: (
        <Tabs value="home" onValueChange={() => {}} className="w-full">
          <TabsList>
            <TabsTrigger value="home">
              <Icon as={Home} size={16} />
              <Text>Home</Text>
            </TabsTrigger>
            <TabsTrigger value="profile">
              <Icon as={User} size={16} />
              <Text>Profile</Text>
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Icon as={Settings} size={16} />
              <Text>Settings</Text>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="home">
            <Text>Home content with dashboard overview</Text>
          </TabsContent>
          <TabsContent value="profile">
            <Text>Profile information and statistics</Text>
          </TabsContent>
          <TabsContent value="settings">
            <Text>Application settings and preferences</Text>
          </TabsContent>
        </Tabs>
      ),
      code: `const [value, setValue] = useState('home');

<Tabs value={value} onValueChange={setValue}>
  <TabsList>
    <TabsTrigger value="home">
      <Icon as={Home} size={16} />
      <Text>Home</Text>
    </TabsTrigger>
    <TabsTrigger value="profile">
      <Icon as={User} size={16} />
      <Text>Profile</Text>
    </TabsTrigger>
    <TabsTrigger value="settings">
      <Icon as={Settings} size={16} />
      <Text>Settings</Text>
    </TabsTrigger>
  </TabsList>
  <TabsContent value="home">
    <Text>Home content</Text>
  </TabsContent>
  {/* More content... */}
</Tabs>`,
    },
    {
      id: 'with-cards',
      label: 'With Cards',
      description: 'Tabs with card content',
      preview: (
        <Tabs value="overview" onValueChange={() => {}} className="w-full">
          <TabsList>
            <TabsTrigger value="overview">
              <Text>Overview</Text>
            </TabsTrigger>
            <TabsTrigger value="details">
              <Text>Details</Text>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
                <CardDescription>Quick summary of your account</CardDescription>
              </CardHeader>
              <CardContent>
                <Text>Account status, recent activity, and quick stats.</Text>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
                <CardDescription>Complete account information</CardDescription>
              </CardHeader>
              <CardContent>
                <Text>Full account details and settings.</Text>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ),
      code: `const [value, setValue] = useState('overview');

<Tabs value={value} onValueChange={setValue}>
  <TabsList>
    <TabsTrigger value="overview">
      <Text>Overview</Text>
    </TabsTrigger>
    <TabsTrigger value="details">
      <Text>Details</Text>
    </TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription>Quick summary</CardDescription>
      </CardHeader>
      <CardContent>
        <Text>Account status and stats.</Text>
      </CardContent>
    </Card>
  </TabsContent>
  {/* More content... */}
</Tabs>`,
    },
    {
      id: 'disabled',
      label: 'Disabled Tab',
      description: 'Tabs with disabled state',
      preview: (
        <Tabs value="active" onValueChange={() => {}} className="w-full">
          <TabsList>
            <TabsTrigger value="active">
              <Text>Active</Text>
            </TabsTrigger>
            <TabsTrigger value="disabled" disabled>
              <Text>Disabled</Text>
            </TabsTrigger>
            <TabsTrigger value="another">
              <Text>Another</Text>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            <Text>This tab is active and accessible</Text>
          </TabsContent>
          <TabsContent value="disabled">
            <Text>This content is not accessible</Text>
          </TabsContent>
          <TabsContent value="another">
            <Text>Another accessible tab</Text>
          </TabsContent>
        </Tabs>
      ),
      code: `const [value, setValue] = useState('active');

<Tabs value={value} onValueChange={setValue}>
  <TabsList>
    <TabsTrigger value="active">
      <Text>Active</Text>
    </TabsTrigger>
    <TabsTrigger value="disabled" disabled>
      <Text>Disabled</Text>
    </TabsTrigger>
    <TabsTrigger value="another">
      <Text>Another</Text>
    </TabsTrigger>
  </TabsList>
  <TabsContent value="active">
    <Text>This tab is active</Text>
  </TabsContent>
  {/* More content... */}
</Tabs>`,
    },
    {
      id: 'two-tabs',
      label: 'Two Tabs',
      description: 'Simple two-tab layout',
      preview: (
        <Tabs value="courses" onValueChange={() => {}} className="w-full">
          <TabsList>
            <TabsTrigger value="courses">
              <Text>My Courses</Text>
            </TabsTrigger>
            <TabsTrigger value="wishlist">
              <Text>Wishlist</Text>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="courses">
            <Text>Your enrolled courses appear here</Text>
          </TabsContent>
          <TabsContent value="wishlist">
            <Text>Your saved courses appear here</Text>
          </TabsContent>
        </Tabs>
      ),
      code: `const [value, setValue] = useState('courses');

<Tabs value={value} onValueChange={setValue}>
  <TabsList>
    <TabsTrigger value="courses">
      <Text>My Courses</Text>
    </TabsTrigger>
    <TabsTrigger value="wishlist">
      <Text>Wishlist</Text>
    </TabsTrigger>
  </TabsList>
  <TabsContent value="courses">
    <Text>Your enrolled courses</Text>
  </TabsContent>
  <TabsContent value="wishlist">
    <Text>Your saved courses</Text>
  </TabsContent>
</Tabs>`,
    },
  ],
};
