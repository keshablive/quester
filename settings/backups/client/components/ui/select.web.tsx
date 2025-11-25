/**
 * Web fallback for Select component using native HTML select
 */
import * as React from 'react';
import { View } from 'react-native';

export const Select = ({ children, onValueChange, defaultValue, value, ...props }: any) => {
  const handleChange = (e: any) => {
    if (onValueChange) {
      onValueChange(e.target.value);
    }
  };

  return (
    <View {...props}>
      <select
        onChange={handleChange}
        defaultValue={defaultValue}
        value={value}
        style={{
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid #e5e5e5',
          fontSize: '14px',
          backgroundColor: 'white',
          width: '100%',
        }}>
        {children}
      </select>
    </View>
  );
};

export const SelectGroup = ({ children }: any) => <optgroup>{children}</optgroup>;
export const SelectValue = ({ placeholder }: any) => <option value="">{placeholder}</option>;
export const SelectTrigger = ({ children, className, ...props }: any) => (
  <View {...props}>{children}</View>
);
export const SelectContent = ({ children }: any) => <>{children}</>;
export const SelectLabel = ({ children }: any) => <option disabled>{children}</option>;
export const SelectItem = ({ value, children }: any) => <option value={value}>{children}</option>;
export const SelectSeparator = () => <option disabled>---</option>;
export const SelectScrollUpButton = () => null;
export const SelectScrollDownButton = () => null;
