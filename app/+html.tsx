import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

import { APP_THEMES, DEFAULT_THEME_ID } from '@/src/theme/appThemes';
import { buildWebThemeBootstrapScript, getDefaultWebHtmlStyles } from '@/src/theme/themeStorage';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: ReactNode }) {
  const defaultTheme = APP_THEMES[DEFAULT_THEME_ID];

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content={defaultTheme.background} />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Default theme colors match penny_green; blocking script overrides from localStorage before paint. */}
        <style dangerouslySetInnerHTML={{ __html: getDefaultWebHtmlStyles() }} />
        <script dangerouslySetInnerHTML={{ __html: buildWebThemeBootstrapScript() }} />
      </head>
      <body
        style={{
          backgroundColor: defaultTheme.background,
          color: defaultTheme.text,
        }}>
        {children}
      </body>
    </html>
  );
}
