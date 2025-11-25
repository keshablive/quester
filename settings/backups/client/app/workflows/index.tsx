import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { WorkflowEditor } from '@/components/WorkflowEditor';

export default function WorkflowPage() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Workflow Editor', headerShown: true }} />
      <WorkflowEditor />
    </View>
  );
}
