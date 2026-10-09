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
    background: #F7F4F0;
    overscroll-behavior-y: none;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
  body {
    margin: 0;
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
  }
  * { box-sizing: border-box; }
  [dir="auto"] {
    overflow-wrap: break-word;
    overflow-wrap: anywhere;
  }
  input, textarea { font-size: 16px; }
  :focus-visible { outline: 2px solid #963B00; outline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { scroll-behavior: auto !important; }
  }

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
  /* Mobile homepage: CSS only, with an unchanged hydration/component tree. */
  @media (max-width: 719px) {
    [data-testid="bp-compact-quick-nav"] { display: none !important; }
    [data-testid="bp-home-hero"] {
      padding-top: 26px !important;
      padding-bottom: 28px !important;
      gap: 14px !important;
    }
    [data-testid="bp-home-hero"] h1 {
      font-size: clamp(26px, 7.4vw, 30px) !important;
      line-height: 1.18 !important;
      letter-spacing: -0.65px !important;
    }
    [data-testid="bp-home-hero-body"] {
      font-size: 15px !important;
      line-height: 22px !important;
      max-width: 440px !important;
    }
    [data-testid="bp-home-hero-actions"] {
      display: flex !important;
      flex-direction: column !important;
      flex-wrap: nowrap !important;
      align-items: stretch !important;
      width: 100% !important;
      max-width: 440px !important;
      gap: 8px !important;
    }
    [data-testid="bp-home-hero-actions"] > * {
      flex: 0 0 auto !important;
      min-width: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
    }
    [data-testid="bp-home-join-homeowner"],
    [data-testid="bp-home-join-trader"] {
      width: 100% !important;
      max-width: 100% !important;
      min-height: 50px !important;
      align-self: stretch !important;
    }
    [data-testid="bp-home-hero-actions"] > :nth-child(4),
    [data-testid="bp-home-how"] {
      display: none !important;
    }
    [data-testid="bp-home-browse"] {
      align-self: center !important;
      min-height: 44px !important;
    }
    [data-testid="bp-home-benefits"] { display: none !important; }
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
