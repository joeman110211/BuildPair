import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const registerServiceWorker = `
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }
`;

const shellCss = `
  html, body {
    background: #ECEFF1;
    overscroll-behavior-y: none;
  }
  body { margin: 0; }
  * { box-sizing: border-box; }

  @media (max-width: 520px) {
    [data-testid="home-hero-actions"] {
      flex-wrap: nowrap !important;
      gap: 6px !important;
    }

    [data-testid="home-hero-actions"] > * {
      flex: 1 1 0 !important;
      min-width: 0 !important;
      max-width: none !important;
    }

    [data-testid="home-hero-actions"] [role="button"] {
      width: 100% !important;
      min-width: 0 !important;
      min-height: 40px !important;
    }

    [data-testid="home-hero-actions"] [role="button"] > * {
      min-height: 40px !important;
      padding-left: 3px !important;
      padding-right: 3px !important;
    }

    [data-testid="home-hero-actions"] [role="button"] [dir="auto"] {
      margin-left: 0 !important;
      margin-right: 0 !important;
      font-size: 11px !important;
      line-height: 14px !important;
      white-space: nowrap !important;
    }
  }
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en-GB">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="application-name" content="BuildPair" />
        <meta name="description" content="Find trusted local tradespeople, compare quotes and manage building work." />
        <meta name="theme-color" content="#D35400" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BuildPair" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <title>BuildPair</title>
        <style dangerouslySetInnerHTML={{ __html: shellCss }} />
        <ScrollViewStyleReset />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: registerServiceWorker }} />
      </body>
    </html>
  );
}
