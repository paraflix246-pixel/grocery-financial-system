// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');
config.resolver.sourceExts.push('mjs');

// Prefer CJS entries on web (avoids Metro ESM .js subpath resolution issues).
const supabasePkgRoot = path.dirname(require.resolve('@supabase/supabase-js/package.json'));
const supabaseCjsEntry = path.join(supabasePkgRoot, 'dist/index.cjs');
const i18nextPkgRoot = path.dirname(require.resolve('i18next/package.json'));
const i18nextCjsEntry = path.join(i18nextPkgRoot, 'dist/cjs/i18next.js');
const reactI18nextPkgRoot = path.dirname(require.resolve('react-i18next/package.json'));
const reactI18nextCjsEntry = path.join(reactI18nextPkgRoot, 'dist/commonjs/index.js');

const webCjsAliases = {
  '@supabase/supabase-js': supabaseCjsEntry,
  i18next: i18nextCjsEntry,
  'react-i18next': reactI18nextCjsEntry,
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webCjsAliases[moduleName]) {
    return { type: 'sourceFile', filePath: webCjsAliases[moduleName] };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
