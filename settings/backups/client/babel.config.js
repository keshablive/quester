module.exports = function (api) {
  api.cache(true);
  
  const plugins = [];
  
  // Remove console statements in production
  if (process.env.NODE_ENV === 'production') {
    plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
  }
  
  // Disable NativeWind in test environment to avoid cssInterop issues with Jest
  const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
  
  return {
    presets: isTest 
      ? ['babel-preset-expo']
      : [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins,
  };
};
