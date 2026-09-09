import { z } from 'zod';
import { authenticatedUserId, ensureDbUser, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const schema = z.object({
  flow: z.enum(['job_post', 'trader_profile']),
  currentStep: z.string().trim().max(100).nullable().optional(),
  status: z.enum(['in_progress', 'completed', 'abandoned']).default('in_progress'),
  fields: z.record(z.string(), z.unknown()).optional().default({}),
});

const allowedFields: Record<'job_post' | 'trader_profile', Set<string>> = {
  job_post: new Set(['title', 'description', 'category', 'propertyType', 'urgency', 'budgetRange', 'mode', 'isEmergency']),
  trader_profile: new Set(['businessName', 'tradeCategories', 'serviceSelections', 'yearsExperience', 'yearEstablished', 'bio', 'qualificationsText']),
};

function sanitiseValue(value: unknown): unknown {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return value.slice(0, 5_000);
  if (Array.isArray(value)) return value.slice(0, 50).map(sanitiseValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 50).map(([key, item]) => [key.slice(0, 100), sanitiseValue(item)]));
  }
  return null;
}

function safeFields(flow: 'job_post' | 'trader_profile', input: Record<string, unknown>) {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!allowedFields[flow].has(key)) continue;
    output[key] = sanitiseValue(value);
  }
  const encoded = JSON.stringify(output);
  return encoded.length <= 20_000 ? output : {};
}

export async function POST(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const payload = schema.parse(await request.json());
    const sql = getSql();
    const tables = await sql`
      SELECT
        to_regclass('public.user_flow_drafts') IS NOT NULL AS "draftsAvailable",
        to_regclass('public.user_activity_events') IS NOT NULL AS "eventsAvailable"
    ` as { draftsAvailable: boolean; eventsAvailable: boolean }[];
    if (!tables[0]?.draftsAvailable) return Response.json({ ok: true, tracking: false });

    const fields = safeFields(payload.flow, payload.fields);
    const existing = await sql`
      SELECT status FROM user_flow_drafts WHERE user_id = ${userId} AND flow = ${payload.flow} LIMIT 1
    ` as { status: string }[];

    await sql`
      INSERT INTO user_flow_drafts (user_id, flow, current_step, status, fields, started_at, updated_at, completed_at)
      VALUES (
        ${userId}, ${payload.flow}, ${payload.currentStep ?? null}, ${payload.status}, CAST(${JSON.stringify(fields)} AS jsonb), now(), now(),
        CASE WHEN ${payload.status} = 'completed' THEN now() ELSE NULL END
      )
      ON CONFLICT (user_id, flow) DO UPDATE SET
        current_step = EXCLUDED.current_step,
        status = EXCLUDED.status,
        fields = EXCLUDED.fields,
        updated_at = now(),
        completed_at = CASE WHEN EXCLUDED.status = 'completed' THEN now() ELSE user_flow_drafts.completed_at END
    `;

    if (tables[0]?.eventsAvailable) {
      const previousStatus = existing[0]?.status;
      const eventType = !previousStatus
        ? 'flow_started'
        : payload.status === 'completed' && previousStatus !== 'completed'
          ? 'flow_completed'
          : payload.status === 'abandoned' && previousStatus !== 'abandoned'
            ? 'flow_abandoned'
            : null;
      if (eventType) {
        await sql`
          INSERT INTO user_activity_events (user_id, event_type, flow, step, details)
          VALUES (${userId}, ${eventType}, ${payload.flow}, ${payload.currentStep ?? null}, '{}'::jsonb)
        `;
      }
    }

    return Response.json({ ok: true, tracking: true });
  } catch (error) {
    return jsonError(error);
  }
}
