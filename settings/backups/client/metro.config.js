const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add resolver configuration for web platform and asset extensions
config.resolver = {
  ...config.resolver,
  assetExts: [
    ...(config.resolver?.assetExts || []),
    'lottie', // Support for Lottie animations
    'json', // Support for JSON files
  ],
  resolveRequest: (context, moduleName, platform) => {
    // Redirect react-native-maps to web fallback on web platform
    if (platform === 'web' && moduleName === 'react-native-maps') {
      return {
        filePath: path.resolve(__dirname, 'lib/components/maps/react-native-maps.web.tsx'),
        type: 'sourceFile',
      };
    }

    // Redirect lottie-react-native to web fallback on web platform
    if (platform === 'web' && moduleName === 'lottie-react-native') {
      return {
        filePath: path.resolve(__dirname, 'lib/components/lottie-react-native.web.tsx'),
        type: 'sourceFile',
      };
    }

    // Use default resolver for everything else
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
