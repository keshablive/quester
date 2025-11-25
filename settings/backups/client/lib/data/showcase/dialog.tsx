import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { AlertTriangle, Trash2 } from 'lucide-react-native';
import type { ShowcaseComponentData } from '@/components/showcase/showcase-card';

export const dialogShowcaseData: ShowcaseComponentData = {
  id: 'dialog',
  name: 'Dialog',
  description:
    'Modal dialog component with focus trap and keyboard navigation. Implements FR-006 with accessibilityRole="dialog" and WCAG 2.4.3 focus management.',
  category: 'feedback',
  imports: ['@/components/ui/dialog', '@/components/ui/button', '@/components/ui/text'],
  wcagLevel: 'AA',
  accessibilityNotes: [
    'Implements accessibilityRole="dialog" for screen readers (FR-006)',
    'Focus trap keeps keyboard navigation within dialog (WCAG 2.4.3)',
    'Escape key closes dialog',
    'Focus returns to trigger element when closed',
    'DialogTitle provides accessible name for dialog',
    'DialogDescription provides additional context',
    'Overlay prevents interaction with background content',
    'Keyboard navigation between focusable elements',
  ],
  variants: [
    {
      id: 'default',
      label: 'Default',
      description: 'Basic dialog with title and description',
      preview: (
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Text>Open Dialog</Text>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-sm">
            <DialogHeader>
              <DialogTitle>Welcome</DialogTitle>
              <DialogDescription>
                This is a basic dialog example with a title and description.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button>
                  <Text>Close</Text>
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ),
      code: `<Dialog>
  <DialogTrigger asChild>
    <Button>
      <Text>Open Dialog</Text>
    </Button>
  </DialogTrigger>
  <DialogContent className="w-full max-w-sm">
    <DialogHeader>
      <DialogTitle>Welcome</DialogTitle>
      <DialogDescription>
        This is a basic dialog example.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild>
        <Button>
          <Text>Close</Text>
        </Button>
      </DialogClose>
    </DialogFooter>
  </DialogContent>
</Dialog>`,
    },
    {
      id: 'with-form',
      label: 'With Form',
      description: 'Dialog containing a form',
      preview: (
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Text>Edit Profile</Text>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>Update your profile information below.</DialogDescription>
            </DialogHeader>
            <View className="gap-4 py-4">
              <View className="gap-2">
                <Label nativeID="name-label">Name</Label>
                <Input placeholder="John Doe" aria-labelledby="name-label" />
              </View>
              <View className="gap-2">
                <Label nativeID="email-label">Email</Label>
                <Input
                  placeholder="john@example.com"
                  keyboardType="email-address"
                  aria-labelledby="email-label"
                />
              </View>
            </View>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">
                  <Text>Cancel</Text>
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button>
                  <Text>Save Changes</Text>
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ),
      code: `<Dialog>
  <DialogTrigger asChild>
    <Button>
      <Text>Edit Profile</Text>
    </Button>
  </DialogTrigger>
  <DialogContent className="w-full max-w-sm">
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogDescription>
        Update your profile information below.
      </DialogDescription>
    </DialogHeader>
    <View className="gap-4 py-4">
      <View className="gap-2">
        <Label nativeID="name-label">Name</Label>
        <Input placeholder="John Doe" aria-labelledby="name-label" />
      </View>
      <View className="gap-2">
        <Label nativeID="email-label">Email</Label>
        <Input placeholder="john@example.com" aria-labelledby="email-label" />
      </View>
    </View>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">
          <Text>Cancel</Text>
        </Button>
      </DialogClose>
      <DialogClose asChild>
        <Button>
          <Text>Save Changes</Text>
        </Button>
      </DialogClose>
    </DialogFooter>
  </DialogContent>
</Dialog>`,
    },
    {
      id: 'confirmation',
      label: 'Confirmation',
      description: 'Dialog for confirming destructive actions',
      preview: (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Icon as={Trash2} size={18} />
              <Text>Delete Account</Text>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-sm">
            <DialogHeader>
              <DialogTitle>Are you sure?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete your account and remove
                your data from our servers.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">
                  <Text>Cancel</Text>
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="destructive">
                  <Text>Delete Account</Text>
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ),
      code: `<Dialog>
  <DialogTrigger asChild>
    <Button variant="destructive">
      <Icon as={Trash2} size={18} />
      <Text>Delete Account</Text>
    </Button>
  </DialogTrigger>
  <DialogContent className="w-full max-w-sm">
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone. This will permanently delete your
        account and remove your data from our servers.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">
          <Text>Cancel</Text>
        </Button>
      </DialogClose>
      <DialogClose asChild>
        <Button variant="destructive">
          <Text>Delete Account</Text>
        </Button>
      </DialogClose>
    </DialogFooter>
  </DialogContent>
</Dialog>`,
    },
    {
      id: 'alert',
      label: 'Alert Dialog',
      description: 'Dialog for important notifications',
      preview: (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Text>Show Alert</Text>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-sm">
            <DialogHeader className="items-center">
              <Icon as={AlertTriangle} size={48} className="mb-2 text-destructive" />
              <DialogTitle>Connection Lost</DialogTitle>
              <DialogDescription className="text-center">
                Your internet connection has been lost. Please check your network settings and try
                again.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button className="w-full">
                  <Text>OK</Text>
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ),
      code: `<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">
      <Text>Show Alert</Text>
    </Button>
  </DialogTrigger>
  <DialogContent className="w-full max-w-sm">
    <DialogHeader className="items-center">
      <Icon as={AlertTriangle} size={48} className="text-destructive mb-2" />
      <DialogTitle>Connection Lost</DialogTitle>
      <DialogDescription className="text-center">
        Your internet connection has been lost. Please check your
        network settings and try again.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild>
        <Button className="w-full">
          <Text>OK</Text>
        </Button>
      </DialogClose>
    </DialogFooter>
  </DialogContent>
</Dialog>`,
    },
    {
      id: 'no-description',
      label: 'Without Description',
      description: 'Dialog with title only',
      preview: (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary">
              <Text>Quick Action</Text>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-sm">
            <DialogHeader>
              <DialogTitle>Quick Action</DialogTitle>
            </DialogHeader>
            <View className="py-4">
              <Text>Choose an option below:</Text>
            </View>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">
                  <Text>Option 1</Text>
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button>
                  <Text>Option 2</Text>
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ),
      code: `<Dialog>
  <DialogTrigger asChild>
    <Button variant="secondary">
      <Text>Quick Action</Text>
    </Button>
  </DialogTrigger>
  <DialogContent className="w-full max-w-sm">
    <DialogHeader>
      <DialogTitle>Quick Action</DialogTitle>
    </DialogHeader>
    <View className="py-4">
      <Text>Choose an option below:</Text>
    </View>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">
          <Text>Option 1</Text>
        </Button>
      </DialogClose>
      <DialogClose asChild>
        <Button>
          <Text>Option 2</Text>
        </Button>
      </DialogClose>
    </DialogFooter>
  </DialogContent>
</Dialog>`,
    },
  ],
};
