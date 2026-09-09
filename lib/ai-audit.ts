import { assertGlobalRateLimit } from '@/lib/rate-limit';
import { getSql } from '@/lib/sql';

export type AiAuditStatus = 'success' | 'fallback' | 'error' | 'blocked';

const DEFAULT_DAILY_AI_LIMIT = 200;
const AI_AUDIT_RETENTION_DAYS = 90;

function configuredDailyLimit() {
  const raw = Number(process.env.AI_GLOBAL_DAILY_LIMIT ?? DEFAULT_DAILY_AI_LIMIT);
  if (!Number.isFinite(raw)) return DEFAULT_DAILY_AI_LIMIT;
  return Math.max(10, Math.min(10000, Math.floor(raw)));
}

export async function assertAiDailyBudget() {
  return assertGlobalRateLimit('paid-ai', configuredDailyLimit(), 24 * 60 * 60);
}

export function aiDailyLimit() {
  return configuredDailyLimit();
}

function redactSecrets(value: string) {
  return value
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[REDACTED_GOOGLE_API_KEY]')
    .replace(/\b(?:sk|rk)_(?:live|test)_[0-9A-Za-z]{16,}\b/g, '[REDACTED_STRIPE_KEY]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]{20,}={0,2}\b/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/((?:password|secret|token|api[_ -]?key)\s*[:=]\s*)([^\s,;]+)/gi, '$1[REDACTED]');
}

export function aiAuditText(value: unknown, max = 12000) {
  let text = '';
  if (typeof value === 'string') text = value;
  else {
    try { text = JSON.stringify(value, null, 2); }
    catch { text = String(value ?? ''); }
  }
  return redactSecrets(text.trim()).slice(0, max);
}

export async function recordAiRequest(input: {
  userId?: string | null;
  endpoint: string;
  request: unknown;
  response?: unknown;
  status: AiAuditStatus;
  model?: string | null;
  providerCalled?: boolean;
  latencyMs?: number | null;
  metadata?: Record<string, unknown>;
}) {
  const sql = getSql();
  try {
    await sql`
      INSERT INTO ai_request_logs(
        user_id, endpoint, request_text, response_text, status, model,
        provider_called, latency_ms, metadata
      )
      VALUES (
        ${input.userId ?? null},
        ${input.endpoint},
        ${aiAuditText(input.request)},
        ${input.response == null ? null : aiAuditText(input.response, 20000)},
        ${input.status},
        ${input.model ?? null},
        ${Boolean(input.providerCalled)},
        ${input.latencyMs ?? null},
        ${JSON.stringify(input.metadata ?? {})}::jsonb
      )
    `;
    await sql`DELETE FROM ai_request_logs WHERE created_at < now() - interval '90 days'`;
  } catch (error) {
    // Audit logging must never take the product down if its table/service has a
    // temporary problem. The request still succeeds and Render logs the failure.
    console.warn('BuildPair AI audit write failed', error instanceof Error ? error.message : 'unknown error');
  }
}

export const AI_AUDIT_RETENTION_DAYS_FOR_INFO = AI_AUDIT_RETENTION_DAYS;
