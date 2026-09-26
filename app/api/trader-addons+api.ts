import { z } from 'zod';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';

const schema = z.object({
  addonKey: z.enum(['opportunity_pack', 'team_seat', 'ai_credits', 'sms_credits']),
  quantity: z.number().int().min(1).max(100).default(1),
  note: z.string().trim().max(500).default(''),
});

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const rows = await getSql()`
      SELECT id, addon_key AS "addonKey", quantity, status, note, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM trader_addon_requests
      WHERE trader_id = ${trader.id}
      ORDER BY created_at DESC
      LIMIT 100
    `;
    return Response.json(rows);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const input = schema.parse(await request.json());
    const existing = await getSql()`
      SELECT id FROM trader_addon_requests
      WHERE trader_id = ${trader.id} AND addon_key = ${input.addonKey} AND status = 'requested'
      LIMIT 1
    ` as unknown as { id: string }[];
    if (existing.length) throw new HttpError(409, 'You already have an open request for this add-on.');

    const rows = await getSql()`
      INSERT INTO trader_addon_requests(trader_id, addon_key, quantity, note)
      VALUES (${trader.id}, ${input.addonKey}, ${input.quantity}, ${input.note})
      RETURNING id, addon_key AS "addonKey", quantity, status, note, created_at AS "createdAt"
    `;
    return Response.json(rows[0], { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
