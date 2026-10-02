import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const clearLegacyWebAppCache = `
  window.addEventListener('load', function () {
    var hadController = Boolean(navigator.serviceWorker && navigator.serviceWorker.controller);
    var cleanup = [];

    if ('serviceWorker' in navigator) {
      cleanup.push(
        navigator.serviceWorker.getRegistrations()
          .then(function (registrations) {
            return Promise.all(registrations.map(function (registration) { return registration.unregister(); }));
          })
          .catch(function () {})
      );
    }

    if ('caches' in window) {
      cleanup.push(
        caches.keys()
          .then(function (keys) {
            return Promise.all(keys.filter(function (key) { return key.indexOf('buildpair-static-') === 0; }).map(function (key) { return caches.delete(key); }));
          })
          .catch(function () {})
      );
    }

    Promise.all(cleanup).then(function () {
      if (!hadController) return;
      try {
        if (window.sessionStorage.getItem('buildpair-browser-cache-cleaned-v1')) return;
        window.sessionStorage.setItem('buildpair-browser-cache-cleaned-v1', '1');
      } catch (_) {}
      window.location.reload();
    }).catch(function () {});
  });
`;

const shellCss = `
  html, body {
    background: #ECEFF1;
    overscroll-behavior-y: none;
  }
  body { margin: 0; }
  * { box-sizing: border-box; }

  [data-testid="analytics-choice-panel"],
  [data-testid="analytics-choice-open"] {
    display: none !important;
  }

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

const favicon = 'https://res.cloudinary.com/qrrcn7ma/image/upload/c_crop,h_221,w_221,x_858,y_712/c_scale,w_64/f_png/v1789145219/file_000000003d24820b9445ddc0225f908a.png';
const appleTouchIcon = 'https://res.cloudinary.com/qrrcn7ma/image/upload/c_crop,h_221,w_221,x_858,y_712/c_scale,w_180/f_png/v1789145219/file_000000003d24820b9445ddc0225f908a.png';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en-GB">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="application-name" content="BuildPair" />
        <meta name="theme-color" content="#D35400" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BuildPair" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href={favicon} type="image/png" />
        <link rel="apple-touch-icon" href={appleTouchIcon} />
        <style dangerouslySetInnerHTML={{ __html: shellCss }} />
        <ScrollViewStyleReset />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: clearLegacyWebAppCache }} />
      </body>
    </html>
  );
}
