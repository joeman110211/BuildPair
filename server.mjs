#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { parseEnv } from 'node:util';

// PM2 keeps a snapshot of old environment variables across restarts. Node's
// process.loadEnvFile() deliberately does not overwrite variables that already
// exist, which meant stale Clerk/DB credentials could survive even after
// .env.local was corrected. Treat BuildPair's local env file as authoritative
// for application configuration while preserving the few runtime values the
// deploy script intentionally injects for the production process.
const localEnvFile = path.resolve(process.cwd(), '.env.local');
const fallbackEnvFile = path.resolve(process.cwd(), '.env');
const runtimeOverrides = new Set([
  'PORT',
  'NODE_ENV',
  'APP_URL',
  'EXPO_PUBLIC_API_URL',
  'BUILDPAIR_NOINDEX',
  'BUILDPAIR_BUILD_SHA',
]);
const envFile = existsSync(localEnvFile) ? localEnvFile : (existsSync(fallbackEnvFile) ? fallbackEnvFile : null);
if (envFile) {
  const parsed = parseEnv(readFileSync(envFile, 'utf8'));
  for (const [name, value] of Object.entries(parsed)) {
    if (!runtimeOverrides.has(name)) process.env[name] = value;
  }
}

if (!process.env.BUILDPAIR_BUILD_SHA) {
  try {
    process.env.BUILDPAIR_BUILD_SHA = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    // Production images may not contain .git metadata. The deploy environment
    // can still provide BUILDPAIR_BUILD_SHA explicitly in that case.
  }
}

// expo-server 57 publishes both ESM and CommonJS adapters. Its ESM build currently
// contains extensionless internal imports that native Node 22 rejects, so load the
// CommonJS adapter deliberately when running BuildPair's standalone Node server.
const require = createRequire(import.meta.url);
const { createRequestHandler } = require('expo-server/adapter/http');

const PORT = Number(process.env.PORT || 3000);
const CLIENT_BUILD_DIR = path.resolve(process.cwd(), 'dist/client');
const SERVER_BUILD_DIR = path.resolve(process.cwd(), 'dist/server');
const NOINDEX = /^(1|true|yes)$/i.test(process.env.BUILDPAIR_NOINDEX || '');
const ADMIN_HOST = String(process.env.BUILDPAIR_ADMIN_HOST || 'admin.buildpair.co.uk').trim().toLowerCase();
const MARKETPLACE_OPEN = /^(1|true|yes)$/i.test(process.env.BUILDPAIR_MARKETPLACE_OPEN || 'false');
const BUILDPAY_OPEN = false;
// Three-month launch period: no new subscription checkout until billing is verified.
const NEW_SUBSCRIPTIONS_OPEN = false;
const CLOSED_BUILDPAY_PREFIXES = [
  '/api/payments', '/api/payment-disputes', '/api/stripe/payment-intent',
  '/api/stripe/connect',
];
const CLOSED_SUBSCRIPTION_CHECKOUTS = [
  '/api/stripe/subscription', '/api/stripe/project-plus/start',
];
function isUnavailableLaunchApi(pathName, method) {
  if (!BUILDPAY_OPEN) {
    if (CLOSED_BUILDPAY_PREFIXES.some(prefix => pathName === prefix || pathName.startsWith(prefix + '/'))) return 'buildpay_unavailable';
    if ((pathName === '/api/buildpay' || pathName.startsWith('/api/buildpay/'))
        && !['GET', 'HEAD'].includes(String(method).toUpperCase())) return 'buildpay_unavailable';
  }
  if (!NEW_SUBSCRIPTIONS_OPEN && String(method).toUpperCase() === 'POST'
      && CLOSED_SUBSCRIPTION_CHECKOUTS.some(prefix => pathName === prefix || pathName.startsWith(prefix + '/'))) return 'subscription_checkout_unavailable';
  return null;
}
function sendFeatureUnavailable(res, code) {
  res.statusCode = 423;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({
    code,
    error: code === 'buildpay_unavailable'
      ? 'BuildPay is coming soon. Arrange job payments directly with the tradesperson.'
      : 'New paid subscriptions are coming soon. Your eligible three-month Pro trial needs no payment card.',
  }));
}

const PRELAUNCH_BLOCKED_API_PREFIXES = [
  '/api/jobs',
  '/api/public/jobs',
  '/api/quotes',
  '/api/buildpay',
  '/api/payment-arrangement',
  '/api/payment-disputes',
  '/api/payment-settings',
  '/api/payments',
  '/api/external-payments',
  '/api/conversations',
  '/api/milestones',
  '/api/variations',
  '/api/site-visits',
  '/api/reviews',
  '/api/saved-searches',
  '/api/stripe/subscription',
  '/api/stripe/payment-intent',
  '/api/stripe/connect',
];

function isBlockedPrelaunchApi(pathName) {
  if (MARKETPLACE_OPEN) return false;
  return PRELAUNCH_BLOCKED_API_PREFIXES.some((prefix) => pathName === prefix || pathName.startsWith(`${prefix}/`));
}

function sendPrelaunchLocked(res) {
  res.statusCode = 423;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({
    error: 'BuildPair marketplace is in pre-launch. Trade profile setup is open; jobs, quotes, messaging, payments and paid plans unlock at launch.',
    code: 'marketplace_prelaunch',
  }));
}

const expoHandler = createRequestHandler({
  build: SERVER_BUILD_DIR,
  environment: process.env.NODE_ENV === 'production' ? null : process.env.NODE_ENV,
});

const MIME_TYPES = new Map([
  ['.avif', 'image/avif'],
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'microphone=(), geolocation=(self), payment=(self)');
  if (NOINDEX) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
}

function requestHostname(req) {
  const forwarded = Array.isArray(req.headers['x-forwarded-host'])
    ? req.headers['x-forwarded-host'][0]
    : req.headers['x-forwarded-host'];
  const raw = String(forwarded || req.headers.host || '').split(',')[0].trim().toLowerCase();
  return raw.replace(/:\d+$/, '');
}

function requestPathname(req) {
  return String(req.url || '/').split('?')[0] || '/';
}

function isAdminSurfacePath(pathName) {
  return pathName === '/admin'
    || pathName === '/admin.html'
    || pathName.startsWith('/admin/')
    || pathName === '/api/admin'
    || pathName.startsWith('/api/admin/');
}

function sendNotFound(res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Not Found');
}

function handleAdminHostRouting(req, res) {
  const host = requestHostname(req);
  const pathName = requestPathname(req);
  const onAdminHost = host === ADMIN_HOST;
  const onAdminSurface = isAdminSurfacePath(pathName);

  // Admin pages and APIs remain protected by AdminGate and requireAdmin. Do not
  // use hostname hiding as an authorization boundary: doing so made a valid
  // signed-in owner session on the primary BuildPair host render the console but
  // receive 404s for every /api/admin request. Keep admin surfaces out of search
  // indexes while allowing the server-side authorization checks to do their job.
  if (onAdminSurface) res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (!onAdminHost) return false;

  // The dedicated admin hostname, when configured, remains a restricted surface.
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (pathName === '/') {
    res.statusCode = 302;
    res.setHeader('Location', '/admin');
    res.end();
    return true;
  }

  const allowed = onAdminSurface
    || pathName.startsWith('/auth/')
    || pathName === '/api/me'
    || pathName === '/api/client-config'
    || pathName === '/api/presence'
    || pathName === '/api/health'
    || pathName === '/api/readiness'
    || pathName.startsWith('/_expo/')
    || pathName.startsWith('/assets/')
    || pathName.startsWith('/icons/')
    || pathName === '/favicon.png'
    || pathName === '/favicon.svg'
    || pathName === '/manifest.webmanifest'
    || pathName === '/sw.js';

  if (!allowed) {
    sendNotFound(res);
    return true;
  }

  return false;
}

function safeCandidates(requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath.split('?')[0] || '/');
  } catch {
    return [];
  }

  const relative = decoded.replace(/^\/+/, '');
  if (!relative) return ['index.html'];

  const normalized = path.normalize(relative);
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) return [];

  const candidates = [normalized];
  if (!path.extname(normalized)) {
    candidates.push(`${normalized}.html`);
    candidates.push(path.join(normalized, 'index.html'));
  }
  return candidates;
}

async function resolveStaticFile(requestPath) {
  const publicAsset = String(requestPath).split('?')[0];
  if (['/sitemap.xml', '/sitemap.txt', '/robots.txt'].includes(publicAsset)) {
    const absolute = path.resolve(process.cwd(), 'public', publicAsset.slice(1));
    try {
      const fileStat = await stat(absolute);
      if (fileStat.isFile()) return { absolute, size: fileStat.size, candidate: publicAsset.slice(1) };
    } catch {
      // Continue to exported static assets if a public source is unavailable.
    }
  }
  for (const candidate of safeCandidates(requestPath)) {
    const absolute = path.resolve(CLIENT_BUILD_DIR, candidate);
    if (absolute !== CLIENT_BUILD_DIR && !absolute.startsWith(`${CLIENT_BUILD_DIR}${path.sep}`)) {
      continue;
    }

    try {
      const fileStat = await stat(absolute);
      if (fileStat.isFile()) return { absolute, size: fileStat.size, candidate };
    } catch {
      // Try the next candidate, then fall through to Expo's server handler.
    }
  }
  return null;
}

async function serveStatic(req, res) {
  if (!req.url || (req.method !== 'GET' && req.method !== 'HEAD')) return false;

  const file = await resolveStaticFile(req.url);
  if (!file) return false;

  const extension = path.extname(file.absolute).toLowerCase();
  res.statusCode = 200;
  res.setHeader('Content-Type', MIME_TYPES.get(extension) || 'application/octet-stream');
  res.setHeader('Content-Length', String(file.size));

  if (extension === '.html') {
    res.setHeader('Cache-Control', 'no-cache');
  } else if (file.candidate.includes('_expo/static/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }

  if (req.method === 'HEAD') {
    res.end();
    return true;
  }

  await new Promise((resolve, reject) => {
    const stream = createReadStream(file.absolute);
    stream.on('error', reject);
    stream.on('end', resolve);
    stream.pipe(res);
  });
  return true;
}

function requestWantsHtml(req) {
  const pathName = String(req.url || '/').split('?')[0];
  if (pathName.startsWith('/api/')) return false;
  const accept = String(req.headers.accept || '');
  return accept.includes('text/html');
}

function sendServerError(req, res) {
  if (res.writableEnded) return;
  if (res.headersSent) {
    res.end();
    return;
  }
  res.statusCode = 500;
  if (requestWantsHtml(req)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>BuildPair</title></head><body style="font-family:system-ui,sans-serif;background:#ECEFF1;color:#20252B;margin:0;padding:48px 24px;text-align:center"><h1>BuildPair is restarting this page</h1><p>Please refresh. If this keeps happening, try again in a moment.</p><p><a href="/">Go to homepage</a></p></body></html>`);
    return;
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: 'Internal server error' }));
}

const server = http.createServer(async (req, res) => {
  try {
    applySecurityHeaders(res);
    if (handleAdminHostRouting(req, res)) return;

    const pathName = requestPathname(req);
    const unavailableFeature = isUnavailableLaunchApi(pathName, req.method);
    if (unavailableFeature) { sendFeatureUnavailable(res, unavailableFeature); return; }
    if (isBlockedPrelaunchApi(pathName)) {
      sendPrelaunchLocked(res);
      return;
    }

    if (await serveStatic(req, res)) return;
    if (['/sitemap.xml', '/sitemap.txt', '/robots.txt'].includes(pathName)) {
      sendNotFound(res);
      return;
    }

    // TLS may terminate at Caddy or Cloudflare. The Expo Node adapter checks
    // socket.encrypted when constructing request URLs, so trust the proxy flag.
    if (req.headers['x-forwarded-proto'] === 'https') {
      req.socket.encrypted = true;
    }

    await expoHandler(req, res, (error) => {
      if (res.writableEnded) return;
      if (error) {
        console.error('[BuildPair] Request failed:', error);
        sendServerError(req, res);
        return;
      }
      res.statusCode = 404;
      res.end('Not Found');
    });
  } catch (error) {
    console.error('[BuildPair] Server error:', error);
    sendServerError(req, res);
  }
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 70_000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[BuildPair] Server listening on port ${PORT}`);
});

function shutdown(signal) {
  console.log(`[BuildPair] ${signal} received, shutting down.`);
  server.close((error) => {
    if (error) {
      console.error('[BuildPair] Shutdown failed:', error);
      process.exit(1);
    }
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
