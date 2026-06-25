import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * EAS / native builds embed EXPO_PUBLIC_* from the build environment
 * (EAS secrets, eas.json profile env, or local .env). Server-only keys
 * (DEEPREAD_API_KEY, OPENAI_API_KEY, etc.) belong on the API host, not in the app.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;

  return {
    ...base,
    name: base.name ?? 'Penny Pantry',
    slug: base.slug ?? 'grocery-financial-system',
    ios: {
      ...base.ios,
      associatedDomains: [
        'applinks:pennypantry.xyz',
        'applinks:www.pennypantry.xyz',
      ],
    },
    android: {
      ...base.android,
      package: base.android?.package ?? 'com.groceryfinancialsystem.app',
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            { scheme: 'https', host: 'pennypantry.xyz', pathPrefix: '/' },
            { scheme: 'https', host: 'www.pennypantry.xyz', pathPrefix: '/' },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
  };
};
