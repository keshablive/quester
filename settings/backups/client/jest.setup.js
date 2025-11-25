// Jest setup file
import '@testing-library/jest-native/extend-expect';

// Mock react-native modules
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: {
      isConnectionExpensive: false,
      ssid: 'test-network',
      strength: 100,
    },
  })),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock global fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    headers: new Headers(),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024 * 1024)), // 1MB
  })
);

// Mock global Headers
global.Headers = class Headers {
  constructor() {
    this.headers = new Map();
  }
  
  append(name, value) {
    this.headers.set(name.toLowerCase(), value);
  }
  
  get(name) {
    return this.headers.get(name.toLowerCase()) || null;
  }
};

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  Link: 'Link',
  Stack: 'Stack',
  Tabs: 'Tabs',
  Slot: 'Slot',
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (Component) => Component,
      View,
    },
    Extrapolation: {
      CLAMP: 'clamp',
      EXTEND: 'extend',
      IDENTITY: 'identity',
    },
    interpolate: jest.fn((value, inputRange, outputRange) => 0),
    useAnimatedStyle: jest.fn((callback) => callback()),
    useSharedValue: jest.fn((value) => ({ value })),
    useDerivedValue: jest.fn((callback) => ({ value: callback() })),
    withTiming: jest.fn((value, config, callback) => {
      if (callback) callback(true);
      return value;
    }),
    withSpring: jest.fn((value, config, callback) => {
      if (callback) callback(true);
      return value;
    }),
    withDelay: jest.fn((delay, value) => value),
    withSequence: jest.fn((...values) => values[values.length - 1]),
    withRepeat: jest.fn((value) => value),
    runOnJS: jest.fn((fn) => fn),
    cancelAnimation: jest.fn(),
  };
});

// Mock nativewind
jest.mock('nativewind', () => ({
  useColorScheme: jest.fn(() => ({
    colorScheme: 'light',
    toggleColorScheme: jest.fn(),
    setColorScheme: jest.fn(),
  })),
  cssInterop: jest.fn((component) => component),
  styled: jest.fn((component) => component),
}));
