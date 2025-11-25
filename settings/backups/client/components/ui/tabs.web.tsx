/**
 * Web implementation of Tabs component
 */
import * as React from 'react';
import { View, Text, Pressable } from 'react-native';

type TabsContextType = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextType | null>(null);

export const Tabs = ({ value, onValueChange, defaultValue, children, ...props }: any) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '');
  const currentValue = value !== undefined ? value : internalValue;
  const handleValueChange = onValueChange || setInternalValue;

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <View {...props}>{children}</View>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ children, className, ...props }: any) => (
  <View
    {...props}
    style={{
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#e5e5e5',
    }}>
    {children}
  </View>
);

export const TabsTrigger = ({ value, children, className, ...props }: any) => {
  const context = React.useContext(TabsContext);
  const isActive = context?.value === value;

  return (
    <Pressable
      {...props}
      onPress={() => context?.onValueChange(value)}
      style={{
        padding: 12,
        borderBottomWidth: 2,
        borderBottomColor: isActive ? '#000' : 'transparent',
      }}>
      <Text style={{ fontWeight: isActive ? '600' : '400' }}>{children}</Text>
    </Pressable>
  );
};

export const TabsContent = ({ value, children, ...props }: any) => {
  const context = React.useContext(TabsContext);
  if (context?.value !== value) return null;

  return <View {...props}>{children}</View>;
};
