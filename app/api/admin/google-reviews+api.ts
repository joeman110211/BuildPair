import { getGooglePlaceIdentity, googlePlacesConfigured } from '@/lib/google-reviews';
import { HttpError, jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';

type ReviewConnectionRow = {
  traderId: string;
  businessName: string;
  email: string | null;
  phone: string | null;
  postcode: string | null;
  locationLabel: string | null;
  placeId: string;
  verificationStatus: 'verified' | 'pending_review' | 'rejected';
  matchScore: number;
  matchReasons: string[];
  connectedAt: string;
  updatedAt: string;
  reviewedAt: string | null;
};

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const filter = status === 'verified' || status === 'rejected' || status === 'pending_review' ? status : null;

    const rows = await getSql()`
      SELECT grc.trader_id AS "traderId",
             tp.business_name AS "businessName",
             u.email,
             u.phone,
             tp.postcode,
             tp.location_label AS "locationLabel",
             grc.place_id AS "placeId",
             grc.verification_status AS "verificationStatus",
             grc.match_score AS "matchScore",
             grc.match_reasons AS "matchReasons",
             grc.connected_at AS "connectedAt",
             grc.updated_at AS "updatedAt",
             grc.reviewed_at AS "reviewedAt"
      FROM google_review_connections grc
      JOIN trader_profiles tp ON tp.user_id = grc.trader_id
      JOIN users u ON u.id = grc.trader_id
      WHERE (${filter}::text IS NULL OR grc.verification_status = ${filter})
      ORDER BY CASE WHEN grc.verification_status = 'pending_review' THEN 0 ELSE 1 END,
               grc.updated_at DESC
      LIMIT 100
    ` as unknown as ReviewConnectionRow[];

    if (!googlePlacesConfigured()) return Response.json({ configured: false, rows: rows.map((row) => ({ ...row, google: null })) });

    const enriched = await Promise.all(rows.map(async (row) => {
      try {
        return { ...row, google: await getGooglePlaceIdentity(row.placeId) };
      } catch {
        return { ...row, google: null };
      }
    }));
    return Response.json({ configured: true, rows: enriched });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json() as { traderId?: unknown; action?: unknown };
    const traderId = typeof body.traderId === 'string' ? body.traderId.trim() : '';
    const action = body.action === 'approve' || body.action === 'reject' ? body.action : null;
    if (!traderId || !action) throw new HttpError(400, 'Choose a review request and an approval action');

    const status = action === 'approve' ? 'verified' : 'rejected';
    const rows = await getSql()`
      UPDATE google_review_connections
      SET verification_status = ${status},
          reviewed_by = ${admin.user.id},
          reviewed_at = now(),
          updated_at = now()
      WHERE trader_id = ${traderId}
      RETURNING trader_id AS "traderId", verification_status AS "verificationStatus", reviewed_at AS "reviewedAt"
    ` as unknown as { traderId: string; verificationStatus: string; reviewedAt: string }[];
    if (!rows.length) throw new HttpError(404, 'Google review connection not found');
    return Response.json(rows[0]);
  } catch (error) {
    return jsonError(error);
  }
}
