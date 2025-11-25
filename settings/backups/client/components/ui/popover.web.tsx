/**
 * Web fallback for Popover component
 */
import * as React from 'react';
import { View, Pressable } from 'react-native';

type PopoverContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const PopoverContext = React.createContext<PopoverContextType | null>(null);

export const Popover = ({ children, ...props }: any) => {
  const [open, setOpen] = React.useState(false);

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <View {...props}>{children}</View>
    </PopoverContext.Provider>
  );
};

export const PopoverTrigger = React.forwardRef(({ children, ...props }: any, ref) => {
  const context = React.useContext(PopoverContext);

  return (
    <Pressable ref={ref} {...props} onPress={() => context?.setOpen(!context.open)}>
      {children}
    </Pressable>
  );
});

PopoverTrigger.displayName = 'PopoverTrigger';

export const PopoverContent = ({ children, className, ...props }: any) => {
  const context = React.useContext(PopoverContext);
  if (!context?.open) return null;

  return (
    <View
      {...props}
      style={{
        position: 'absolute',
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        zIndex: 1000,
      }}>
      {children}
    </View>
  );
};

export const PopoverClose = ({ children, ...props }: any) => {
  const context = React.useContext(PopoverContext);

  return (
    <Pressable {...props} onPress={() => context?.setOpen(false)}>
      {children}
    </Pressable>
  );
};
