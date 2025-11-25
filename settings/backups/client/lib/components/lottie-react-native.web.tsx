import React, { forwardRef, useImperativeHandle } from 'react';
import { View, Text } from 'react-native';

const LottieView = forwardRef(({ source, style, autoPlay, loop, ..._props }: any, ref) => {
  useImperativeHandle(ref, () => ({
    play: () => {},
    reset: () => {},
    pause: () => {},
    resume: () => {},
  }));

  return (
    <View
      style={[
        style,
        { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
      ]}>
      <Text style={{ fontSize: 10, color: '#666' }}>Lottie Animation</Text>
    </View>
  );
});

export default LottieView;
