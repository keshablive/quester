/**
 * Web fallback for Dialog component
 * React Native's dialog primitives are not available on web
 */
import * as React from 'react';
import { View, Text, Pressable } from 'react-native';

// Minimal implementations for web
export const Dialog = ({ children, ...props }: any) => <View {...props}>{children}</View>;
export const DialogTrigger = ({ children, ...props }: any) => (
  <Pressable {...props}>{children}</Pressable>
);
export const DialogPortal = ({ children, ...props }: any) => <View {...props}>{children}</View>;
export const DialogOverlay = ({ children, ...props }: any) => <View {...props}>{children}</View>;
export const DialogClose = ({ children, ...props }: any) => (
  <Pressable {...props}>{children}</Pressable>
);
export const DialogContent = ({ children, ...props }: any) => (
  <View
    {...props}
    style={[
      {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 24,
        maxWidth: 500,
        width: '100%',
      },
      props.style,
    ]}>
    {children}
  </View>
);
export const DialogHeader = ({ children, ...props }: any) => <View {...props}>{children}</View>;
export const DialogTitle = ({ children, ...props }: any) => (
  <Text {...props} style={[{ fontSize: 20, fontWeight: '600' }, props.style]}>
    {children}
  </Text>
);
export const DialogDescription = ({ children, ...props }: any) => (
  <Text {...props} style={[{ fontSize: 14, color: '#666' }, props.style]}>
    {children}
  </Text>
);
export const DialogFooter = ({ children, ...props }: any) => <View {...props}>{children}</View>;
