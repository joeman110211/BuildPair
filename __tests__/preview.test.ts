import { afterEach, describe, expect, it } from 'vitest';
import { previewDataEnabled } from '@/lib/preview';

const originalPreviewFlag = process.env.BUILDPAIR_PREVIEW_DATA_ENABLED;
const originalNoIndex = process.env.BUILDPAIR_NOINDEX;
const originalAppUrl = process.env.APP_URL;

afterEach(() => {
  if (originalPreviewFlag === undefined) delete process.env.BUILDPAIR_PREVIEW_DATA_ENABLED;
  else process.env.BUILDPAIR_PREVIEW_DATA_ENABLED = originalPreviewFlag;

  if (originalNoIndex === undefined) delete process.env.BUILDPAIR_NOINDEX;
  else process.env.BUILDPAIR_NOINDEX = originalNoIndex;

  if (originalAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = originalAppUrl;
});

describe('previewDataEnabled', () => {
  it('never enables preview fixtures on the canonical public production host', () => {
    process.env.BUILDPAIR_PREVIEW_DATA_ENABLED = 'true';
    expect(previewDataEnabled('https://www.buildpair.co.uk/api/public/jobs')).toBe(false);
    expect(previewDataEnabled('https://buildpair.co.uk/api/public/jobs')).toBe(false);
  });

  it('never enables preview fixtures on the dedicated admin production host', () => {
    process.env.BUILDPAIR_PREVIEW_DATA_ENABLED = 'true';
    expect(previewDataEnabled('https://admin.buildpair.co.uk/api/public/jobs')).toBe(false);
  });

  it('always enables preview fixtures on staging', () => {
    delete process.env.BUILDPAIR_PREVIEW_DATA_ENABLED;
    expect(previewDataEnabled('https://staging.buildpair.co.uk/api/public/jobs')).toBe(true);
  });

  it('allows the explicit preview flag away from production hosts', () => {
    process.env.BUILDPAIR_PREVIEW_DATA_ENABLED = 'true';
    expect(previewDataEnabled('http://localhost:3000/api/public/jobs')).toBe(true);
  });

  it('honours the staging APP_URL fallback for server-only contexts', () => {
    delete process.env.BUILDPAIR_PREVIEW_DATA_ENABLED;
    process.env.BUILDPAIR_NOINDEX = 'true';
    process.env.APP_URL = 'https://staging.buildpair.co.uk';
    expect(previewDataEnabled()).toBe(true);
  });
});
