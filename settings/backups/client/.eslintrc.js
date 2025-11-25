module.exports = {
  root: true,
  extends: [
    'expo',
    'prettier',
    'plugin:@react-native-community/eslint-config',
  ],
  plugins: [
    'prettier',
    '@react-native-community',
  ],
  rules: {
    'prettier/prettier': 'warn',
    // Accessibility rules (WCAG 2.1 Level AA compliance - FR-006 to FR-010)
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'react-native/no-inline-styles': 'warn', // FR-011: Prefer className over inline styles
    'react-native-a11y/has-accessibility-props': 'error', // FR-006: Require accessibility props
    'react-native-a11y/has-valid-accessibility-role': 'error', // FR-006: Valid roles
    'react-native-a11y/has-accessibility-hint': 'warn', // FR-009: Accessibility hints
    'react-native-a11y/has-valid-accessibility-state': 'error', // State announcements
    'react-native-a11y/has-valid-accessibility-live-region': 'warn', // Live region updates
    'react-native-a11y/has-valid-important-for-accessibility': 'warn', // Accessibility tree
    // React Native Reusables compliance rules (optimize-rn-reusables-compliance)
    'no-restricted-imports': ['error', {
      'paths': [
        {
          'name': 'react-native',
          'importNames': ['Text', 'TouchableOpacity', 'Animated'],
          'message': 'Use @/components/ui/text for Text, Pressable for TouchableOpacity, and react-native-reanimated for Animated'
        }
      ]
    }],
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        // TypeScript-specific rules
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
  ],
};
