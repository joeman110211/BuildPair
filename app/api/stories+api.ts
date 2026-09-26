import { z } from 'zod';
import { getSql } from '@/lib/sql';
import { assertApprovedMediaUrls } from '@/lib/media-safety';
import { HttpError, jsonError, requireRole } from '@/lib/server';

const schema = z.object({
  title: z.string().trim().min(3).max(180),
  locationLabel: z.string().trim().max(160).optional(),
  summary: z.string().trim().min(20).max(4000),
  beforePhotos: z.array(z.string().url().max(1200)).max(8).default([]),
  afterPhotos: z.array(z.string().url().max(1200)).max(8).default([]),
  durationDays: z.number().int().min(1).max(3650).optional(),
  completedAt: z.string().datetime().optional(),
});
const deleteSchema = z.object({ id: z.string().uuid() });

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const traderId = url.searchParams.get('traderId');
    if (traderId) {
      const rows = await getSql()`
        SELECT id, title, location_label AS "locationLabel", summary,
               before_photos AS "beforePhotos", after_photos AS "afterPhotos",
               duration_days AS "durationDays", completed_at AS "completedAt", created_at AS "createdAt"
        FROM trader_stories WHERE trader_id = ${traderId} ORDER BY coalesce(completed_at, created_at) DESC LIMIT 30
      `;
      return Response.json(rows);
    }
    const trader = await requireRole(request, 'trader');
    const rows = await getSql()`
      SELECT id, title, location_label AS "locationLabel", summary,
             before_photos AS "beforePhotos", after_photos AS "afterPhotos",
             duration_days AS "durationDays", completed_at AS "completedAt", created_at AS "createdAt"
      FROM trader_stories WHERE trader_id = ${trader.id} ORDER BY created_at DESC LIMIT 50
    `;
    return Response.json(rows);
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const input = schema.parse(await request.json());
    await assertApprovedMediaUrls(trader.id, 'trader', [...input.beforePhotos, ...input.afterPhotos]);
    if (!input.beforePhotos.length && !input.afterPhotos.length) throw new HttpError(400, 'Add at least one project photo');
    const rows = await getSql()`
      INSERT INTO trader_stories(trader_id, title, location_label, summary, before_photos, after_photos, duration_days, completed_at)
      VALUES (${trader.id}, ${input.title}, ${input.locationLabel ?? null}, ${input.summary}, ${input.beforePhotos}, ${input.afterPhotos}, ${input.durationDays ?? null}, ${input.completedAt ?? null}::timestamptz)
      RETURNING id, title, location_label AS "locationLabel", summary, before_photos AS "beforePhotos", after_photos AS "afterPhotos", duration_days AS "durationDays", completed_at AS "completedAt"
    `;
    return Response.json(rows[0], { status: 201 });
  } catch (error) { return jsonError(error); }
}

export async function DELETE(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const { id } = deleteSchema.parse(await request.json());
    const rows = await getSql()`DELETE FROM trader_stories WHERE id = ${id} AND trader_id = ${trader.id} RETURNING id`;
    if (!rows.length) throw new HttpError(404, 'Project story not found');
    return Response.json({ deleted: true });
  } catch (error) { return jsonError(error); }
}
