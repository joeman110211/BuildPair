import { z } from 'zod';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { hasPlanSetupAccess } from '@/lib/subscription';

const createSchema = z.object({
  kind: z.enum(['quote', 'message']),
  title: z.string().trim().min(2).max(100),
  content: z.string().trim().min(5).max(5000),
});
const updateSchema = createSchema.extend({ id: z.string().uuid() });
const deleteSchema = z.object({ id: z.string().uuid() });

async function requireProTemplates(traderId: string) {
  const rows = await getSql()`
    SELECT subscription_tier AS "subscriptionTier",
           is_subscription_active AS "isSubscriptionActive",
           trial_ends_at AS "trialEndsAt"
    FROM trader_profiles
    WHERE user_id = ${traderId}
    LIMIT 1
  ` as unknown as { subscriptionTier: 'free' | 'core' | 'basic' | 'featured'; isSubscriptionActive: boolean; trialEndsAt: string | null }[];
  const profile = rows[0];
  if (!profile || profile.subscriptionTier !== 'featured' || !hasPlanSetupAccess(profile, 'featured')) {
    throw new HttpError(402, 'Reusable quote and message templates are included with BuildPair Pro.');
  }
}

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    await requireProTemplates(trader.id);
    const rows = await getSql()`
      SELECT id, kind, title, content, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM trader_templates
      WHERE trader_id = ${trader.id}
      ORDER BY kind ASC, updated_at DESC
      LIMIT 100
    `;
    return Response.json(rows);
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    await requireProTemplates(trader.id);
    const input = createSchema.parse(await request.json());
    const count = await getSql()`SELECT count(*)::int AS count FROM trader_templates WHERE trader_id = ${trader.id}` as unknown as { count: number }[];
    if ((count[0]?.count ?? 0) >= 50) throw new HttpError(409, 'You can keep up to 50 reusable templates.');
    const rows = await getSql()`
      INSERT INTO trader_templates(trader_id, kind, title, content)
      VALUES (${trader.id}, ${input.kind}, ${input.title}, ${input.content})
      RETURNING id, kind, title, content, created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    return Response.json(rows[0], { status: 201 });
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    await requireProTemplates(trader.id);
    const input = updateSchema.parse(await request.json());
    const rows = await getSql()`
      UPDATE trader_templates
      SET kind = ${input.kind}, title = ${input.title}, content = ${input.content}, updated_at = now()
      WHERE id = ${input.id} AND trader_id = ${trader.id}
      RETURNING id, kind, title, content, created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    if (!rows.length) throw new HttpError(404, 'Template not found');
    return Response.json(rows[0]);
  } catch (error) { return jsonError(error); }
}

export async function DELETE(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const input = deleteSchema.parse(await request.json());
    const rows = await getSql()`DELETE FROM trader_templates WHERE id = ${input.id} AND trader_id = ${trader.id} RETURNING id`;
    if (!rows.length) throw new HttpError(404, 'Template not found');
    return Response.json({ deleted: true });
  } catch (error) { return jsonError(error); }
}
