import { GoogleGenAI } from '@google/genai';
import { getSql } from '@/lib/sql';
import { jsonError, requireAdmin } from '@/lib/server';

type HealthState = 'ok' | 'degraded' | 'unconfigured';
type HealthCheck = {
  name: string;
  state: HealthState;
  latencyMs: number | null;
  detail: string;
};

const TIMEOUT_MS = 5000;

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

async function timed(name: string, run: () => Promise<string>): Promise<HealthCheck> {
  const startedAt = Date.now();
  try {
    const detail = await run();
    return { name, state: 'ok', latencyMs: Date.now() - startedAt, detail };
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 180) : 'Live check failed';
    return { name, state: 'degraded', latencyMs: Date.now() - startedAt, detail };
  }
}

function unconfigured(name: string, detail: string): HealthCheck {
  return { name, state: 'unconfigured', latencyMs: null, detail };
}

async function probe(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return `HTTP ${response.status}`;
}

async function databaseCheck() {
  if (!configured('DATABASE_URL')) return unconfigured('Database', 'DATABASE_URL is missing');
  return timed('Database', async () => {
    await getSql()`SELECT 1 AS ok`;
    return 'Neon PostgreSQL query succeeded';
  });
}

async function clerkCheck() {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  if (!secretKey || !publishableKey) {
    return unconfigured('Clerk', 'Clerk server or publishable credentials are missing');
  }

  // Reaching this point means requireAdmin(request) has already verified the
  // current Clerk session. Do not make a second /v1/users request just for the
  // health card: repeatedly pressing "Run checks again" can legitimately hit
  // Clerk's rate limit (HTTP 429) and create a false degraded warning.
  return {
    name: 'Clerk',
    state: 'ok',
    latencyMs: null,
    detail: 'Current administrator Clerk session verified successfully',
  };
}

async function geminiCheck() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return unconfigured('Gemini', 'GEMINI_API_KEY is missing');
  return timed('Gemini', async () => {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await Promise.race([
      ai.models.generateContent({
        model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash',
        contents: 'Reply with exactly BUILDPAIR_OK',
        config: { temperature: 0, maxOutputTokens: 20 },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Gemini health check timed out')), TIMEOUT_MS)),
    ]);
    if (!response.text?.includes('BUILDPAIR_OK')) throw new Error('Gemini returned an unexpected health response');
    return `Gemini ${process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash'} responded`;
  });
}

async function cloudinaryCheck() {
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() || 'qrrcn7ma';
  if (!apiKey || !apiSecret) return unconfigured('Cloudinary', 'Cloudinary API credentials are incomplete');
  return timed('Cloudinary', async () => {
    const basic = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    await probe(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/image?max_results=1`, {
      headers: { Authorization: `Basic ${basic}` },
    });
    return 'Cloudinary API reachable and credentials accepted';
  });
}

async function resendCheck() {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return unconfigured('Resend', 'RESEND_API_KEY is missing');
  return timed('Resend', async () => {
    await probe('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } });
    return 'Resend API reachable and credentials accepted';
  });
}

async function stripeCheck() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return unconfigured('Stripe', 'Stripe is optional during beta and is not configured');
  return timed('Stripe', async () => {
    await probe('https://api.stripe.com/v1/balance', { headers: { Authorization: `Bearer ${key}` } });
    return 'Stripe API reachable and credentials accepted';
  });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const checks = await Promise.all([
      databaseCheck(),
      clerkCheck(),
      geminiCheck(),
      cloudinaryCheck(),
      resendCheck(),
      stripeCheck(),
    ]);
    const degraded = checks.filter((check) => check.state === 'degraded').length;
    const unconfiguredCount = checks.filter((check) => check.state === 'unconfigured').length;
    return Response.json({
      status: degraded ? 'degraded' : 'ok',
      checks,
      summary: {
        ok: checks.filter((check) => check.state === 'ok').length,
        degraded,
        unconfigured: unconfiguredCount,
      },
      releaseSha: process.env.BUILDPAIR_BUILD_SHA?.trim() || null,
      generatedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error);
  }
}
