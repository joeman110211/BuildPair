import { z } from 'zod';
import { authenticatedUserId, ensureDbUser, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const eventSchema = z.object({
  eventType: z.enum(['page_view', 'flow_started', 'flow_progress', 'flow_completed', 'flow_abandoned']),
  path: z.string().trim().max(500).nullable().optional(),
  flow: z.string().trim().max(100).nullable().optional(),
  step: z.string().trim().max(100).nullable().optional(),
  details: z.record(z.string(), z.unknown()).optional().default({}),
});

const forbiddenDetailKey = /(password|passcode|secret|token|card|cvc|cvv|payment|bank)/i;

function safeDetails(input: Record<string, unknown>) {
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(input)) {
    if (forbiddenDetailKey.test(key)) continue;
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      output[key.slice(0, 80)] = typeof value === 'string' ? value.slice(0, 500) : value;
    }
  }
  const encoded = JSON.stringify(output);
  return encoded.length <= 8_000 ? output : {};
}

export async function POST(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const payload = eventSchema.parse(await request.json());
    const sql = getSql();

    const table = await sql`SELECT to_regclass('public.user_activity_events')::text AS name` as { name: string | null }[];
    if (!table[0]?.name) return Response.json({ ok: true, tracking: false });

    const details = safeDetails(payload.details);
    await sql`
      INSERT INTO user_activity_events (user_id, event_type, path, flow, step, details)
      VALUES (
        ${userId},
        ${payload.eventType},
        ${payload.path ?? null},
        ${payload.flow ?? null},
        ${payload.step ?? null},
        CAST(${JSON.stringify(details)} AS jsonb)
      )
    `;

    return Response.json({ ok: true, tracking: true });
  } catch (error) {
    return jsonError(error);
  }
}
