import { aiDailyLimit } from '@/lib/ai-audit';
import { jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';

type AiRequestRow = {
  id: number;
  userId: string | null;
  userEmail: string | null;
  endpoint: string;
  requestText: string;
  responseText: string | null;
  status: string;
  model: string | null;
  providerCalled: boolean;
  latencyMs: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const sql = getSql();
    const [rows, usage] = await Promise.all([
      sql`
        SELECT
          a.id,
          a.user_id AS "userId",
          u.email AS "userEmail",
          a.endpoint,
          a.request_text AS "requestText",
          a.response_text AS "responseText",
          a.status,
          a.model,
          a.provider_called AS "providerCalled",
          a.latency_ms AS "latencyMs",
          a.metadata,
          a.created_at AS "createdAt"
        FROM ai_request_logs a
        LEFT JOIN users u ON u.id = a.user_id
        ORDER BY a.created_at DESC
        LIMIT 250
      ` as Promise<AiRequestRow[]>,
      sql`
        SELECT
          count(*) FILTER (WHERE created_at >= now() - interval '24 hours')::int AS "requests24h",
          count(*) FILTER (WHERE created_at >= now() - interval '24 hours' AND provider_called)::int AS "providerCalls24h",
          count(*) FILTER (WHERE created_at >= now() - interval '24 hours' AND status = 'blocked')::int AS "blocked24h",
          count(*) FILTER (WHERE created_at >= now() - interval '24 hours' AND status = 'error')::int AS "errors24h"
        FROM ai_request_logs
      ` as Promise<{ requests24h: number; providerCalls24h: number; blocked24h: number; errors24h: number }[]>,
    ]);

    return Response.json({
      requests: rows,
      usage24h: usage[0] ?? { requests24h: 0, providerCalls24h: 0, blocked24h: 0, errors24h: 0 },
      globalDailyLimit: aiDailyLimit(),
      generatedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error);
  }
}
