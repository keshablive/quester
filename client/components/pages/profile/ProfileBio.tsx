import * as React from 'react';
import { Text, Card } from '@/components/ui';

export function ProfileBio() {
  return (
    <Card className="p-4 gap-3">
      <Text className="font-semibold text-lg">About</Text>
      <Text className="text-muted-foreground">
        Passionate about creating beautiful and functional user experiences.
        Love working with modern tech stacks and building products that people enjoy using.
      </Text>
    </Card>
  );
}
