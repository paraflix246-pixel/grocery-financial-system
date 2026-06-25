// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');
config.resolver.sourceExts.push('mjs');

// Prefer CJS entry for the main Supabase client on web (avoids Metro .mjs resolution issues).
const supabasePkgRoot = path.dirname(require.resolve('@supabase/supabase-js/package.json'));
const supabaseCjsEntry = path.join(supabasePkgRoot, 'dist/index.cjs');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === '@supabase/supabase-js') {
    return { type: 'sourceFile', filePath: supabaseCjsEntry };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
