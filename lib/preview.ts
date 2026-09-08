function isTruthy(value: string | undefined) {
  const normalised = value?.trim().toLowerCase();
  return normalised === 'true' || normalised === '1' || normalised === 'yes';
}

const PUBLIC_PRODUCTION_HOSTS = new Set([
  'buildpair.co.uk',
  'www.buildpair.co.uk',
  'admin.buildpair.co.uk',
]);

function hostnamesFromRequest(request?: Request | string) {
  if (!request) return [] as string[];

  try {
    if (typeof request === 'string') return [new URL(request).hostname.toLowerCase()];

    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim().split(':')[0]?.toLowerCase();
    const host = request.headers.get('host')?.trim().split(':')[0]?.toLowerCase();
    const urlHost = new URL(request.url).hostname.toLowerCase();

    return [forwardedHost, host, urlHost].filter((value): value is string => Boolean(value));
  } catch {
    return [] as string[];
  }
}

function stagingHostFromRequest(request?: Request | string) {
  return hostnamesFromRequest(request).some((value) => value === 'staging.buildpair.co.uk');
}

function publicProductionHostFromRequest(request?: Request | string) {
  return hostnamesFromRequest(request).some((value) => PUBLIC_PRODUCTION_HOSTS.has(value));
}

export function previewDataEnabled(request?: Request | string) {
  // Public production must never serve bundled preview fixtures, even if a stale
  // environment flag is accidentally left enabled during deployment.
  if (publicProductionHostFromRequest(request)) return false;

  if (isTruthy(process.env.BUILDPAIR_PREVIEW_DATA_ENABLED)) return true;

  // Staging should always show realistic preview marketplace data. Detect it from
  // the actual request first so stale local environment values cannot disable it.
  if (stagingHostFromRequest(request)) return true;

  // Environment fallback for server-side contexts where no Request is available.
  if (!isTruthy(process.env.BUILDPAIR_NOINDEX)) return false;

  try {
    const appUrl = process.env.APP_URL;
    if (!appUrl) return false;
    return new URL(appUrl).hostname === 'staging.buildpair.co.uk';
  } catch {
    return false;
  }
}
