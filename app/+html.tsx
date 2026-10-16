import { THEME_STORAGE_KEY, themeColors } from "@/src/lib/theme";
import { ScrollViewStyleReset } from "expo-router/html";
import type { ReactNode } from "react";

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#10131b" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        <script dangerouslySetInnerHTML={{ __html: restoreAppearance }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
html { color-scheme: dark; background-color: #10131b; }
body { background-color: inherit; }`;

const restoreAppearance = `
try {
  var theme = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) === 'light' ? 'light' : 'dark';
  var background = theme === 'light' ? ${JSON.stringify(themeColors.light.background)} : ${JSON.stringify(themeColors.dark.background)};
  document.documentElement.style.colorScheme = theme;
  document.documentElement.style.backgroundColor = background;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', background);
} catch (_) {}
`;
