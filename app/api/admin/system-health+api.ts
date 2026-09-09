import { GoogleGenAI } from '@google/genai';
import { getSql } from '@/lib/sql';
import { jsonError, requireAdmin } from '@/lib/server';

type HealthState = 'ok' | 'degraded' | 'unconfigured';
type HealthCheck = {
  name: string;
  state: HealthState;
  latencyMs: number | null;
  detail: string;
  required: boolean;
  capability: string;
  envVars: string[];
};

const TIMEOUT_MS = 5000;

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

async function timed(
  name: string,
  capability: string,
  envVars: string[],
  run: () => Promise<string>,
): Promise<HealthCheck> {
  const startedAt = Date.now();
  try {
    const detail = await run();
    return { name, state: 'ok', latencyMs: Date.now() - startedAt, detail, required: true, capability, envVars };
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 180) : 'Live check failed';
    return { name, state: 'degraded', latencyMs: Date.now() - startedAt, detail, required: true, capability, envVars };
  }
}

function unconfigured(name: string, detail: string, capability: string, envVars: string[]): HealthCheck {
  return { name, state: 'unconfigured', latencyMs: null, detail, required: true, capability, envVars };
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
  const envVars = ['DATABASE_URL'];
  if (!configured('DATABASE_URL')) return unconfigured('Database', 'DATABASE_URL is missing', 'Core BuildPair data', envVars);
  return timed('Database', 'Core BuildPair data', envVars, async () => {
    await getSql()`SELECT 1 AS ok`;
    return 'Neon PostgreSQL query succeeded';
  });
}

async function clerkCheck() {
  const envVars = ['CLERK_SECRET_KEY', 'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY'];
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  if (!secretKey || !publishableKey) {
    return unconfigured('Clerk', 'Clerk server or publishable credentials are missing', 'Sign-up, sign-in and administrator access', envVars);
  }

  // requireAdmin(request) has already verified this Clerk session. A second users
  // API request here just creates avoidable rate-limit noise when checks are rerun.
  return {
    name: 'Clerk',
    state: 'ok' as const,
    latencyMs: null,
    detail: 'Current administrator Clerk session verified successfully',
    required: true,
    capability: 'Sign-up, sign-in and administrator access',
    envVars,
  };
}

async function geminiCheck() {
  const envVars = ['GEMINI_API_KEY'];
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return unconfigured('Gemini', 'GEMINI_API_KEY is missing', 'AI job planning, quote and message assistants', envVars);
  return timed('Gemini', 'AI job planning, quote and message assistants', envVars, async () => {
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
  const envVars = ['CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'CLOUDINARY_CLOUD_NAME'];
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() || 'qrrcn7ma';
  if (!apiKey || !apiSecret) return unconfigured('Cloudinary', 'Cloudinary API credentials are incomplete', 'Job, profile and project photo uploads', envVars);
  return timed('Cloudinary', 'Job, profile and project photo uploads', envVars, async () => {
    const basic = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    await probe(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/image?max_results=1`, {
      headers: { Authorization: `Basic ${basic}` },
    });
    return 'Cloudinary API reachable and credentials accepted';
  });
}

async function resendCheck() {
  const envVars = ['RESEND_API_KEY'];
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return unconfigured('Resend', 'RESEND_API_KEY is missing', 'Transactional emails and notifications', envVars);
  return timed('Resend', 'Transactional emails and notifications', envVars, async () => {
    // Sending-only keys are the right privilege level for the production app.
    // Probe the send endpoint with an intentionally incomplete payload: a valid
    // key returns a validation error before an email can be created, while an
    // invalid key is rejected as unauthorised. This verifies the credential
    // without requiring full account access or generating a test email.
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    if (response.status === 400 || response.status === 422) return 'Resend sending credentials accepted';
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    throw new Error('Resend returned an unexpected response to the credential probe');
  });
}

async function stripeCheck() {
  const envVars = [
    'STRIPE_SECRET_KEY',
    'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_BASIC_PRICE_ID',
    'STRIPE_FEATURED_PRICE_ID',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_CONNECT_WEBHOOK_SECRET',
  ];
  const missing = envVars.filter((name) => !configured(name));
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (missing.length || !key) {
    return unconfigured('Stripe', `Missing ${missing.join(', ') || 'Stripe configuration'}`, 'Memberships, payments and trader payouts', envVars);
  }
  return timed('Stripe', 'Memberships, payments and trader payouts', envVars, async () => {
    await probe('https://api.stripe.com/v1/balance', { headers: { Authorization: `Bearer ${key}` } });
    return 'Stripe API reachable and complete launch configuration is present';
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
    const requiredMissing = checks.filter((check) => check.required && check.state === 'unconfigured').length;
    return Response.json({
      status: degraded ? 'degraded' : requiredMissing ? 'attention' : 'ok',
      checks,
      summary: {
        ok: checks.filter((check) => check.state === 'ok').length,
        degraded,
        unconfigured: unconfiguredCount,
        requiredMissing,
      },
      releaseSha: process.env.BUILDPAIR_BUILD_SHA?.trim() || null,
      generatedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error);
  }
}