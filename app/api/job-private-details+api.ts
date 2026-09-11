import { z } from 'zod';
import { authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const saveSchema = z.object({
  jobId: z.uuid(),
  addressLine1: z.string().trim().min(3, 'Enter the house number/name and street').max(200),
  addressLine2: z.string().trim().max(200).optional().default(''),
  townCity: z.string().trim().min(2, 'Enter the town or city').max(120),
  accessNotes: z.string().trim().max(1000).optional().default(''),
});

type AccessRow = {
  jobId: string;
  customerId: string;
  acceptedTraderId: string | null;
  confirmedVisitTrader: boolean;
  postcode: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  townCity: string | null;
  accessNotes: string | null;
};

async function accessRow(jobId: string, userId: string) {
  const rows = await getSql()`
    SELECT j.id AS "jobId",
           j.customer_id AS "customerId",
           aq.trader_id AS "acceptedTraderId",
           j.postcode,
           pd.address_line1 AS "addressLine1",
           pd.address_line2 AS "addressLine2",
           pd.town_city AS "townCity",
           pd.access_notes AS "accessNotes",
           EXISTS (
             SELECT 1 FROM job_site_visits sv
             WHERE sv.job_id = j.id
               AND sv.trader_id = ${userId}
               AND sv.status IN ('confirmed', 'completed')
           ) AS "confirmedVisitTrader"
    FROM jobs j
    LEFT JOIN quotes aq ON aq.id = j.accepted_quote_id
    LEFT JOIN job_private_details pd ON pd.job_id = j.id
    WHERE j.id = ${jobId}
    LIMIT 1
  ` as unknown as AccessRow[];
  return rows[0];
}

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const jobId = new URL(request.url).searchParams.get('jobId');
    if (!jobId) throw new HttpError(400, 'Job id is required');
    const row = await accessRow(jobId, userId);
    if (!row) throw new HttpError(404, 'Job not found');
    const allowed = row.customerId === userId || row.acceptedTraderId === userId || row.confirmedVisitTrader;
    if (!allowed) throw new HttpError(403, 'The private job address is not available to you');
    return Response.json({
      jobId: row.jobId,
      addressLine1: row.addressLine1 ?? '',
      addressLine2: row.addressLine2 ?? '',
      townCity: row.townCity ?? '',
      postcode: row.postcode ?? '',
      accessNotes: row.accessNotes ?? '',
      complete: Boolean(row.addressLine1 && row.townCity),
    });
  } catch (error) { return jsonError(error); }
}

export async function PUT(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const payload = saveSchema.parse(await request.json());
    const rows = await getSql()`SELECT customer_id AS "customerId" FROM jobs WHERE id = ${payload.jobId} LIMIT 1` as unknown as { customerId: string }[];
    if (!rows[0] || rows[0].customerId !== userId) throw new HttpError(404, 'Your job was not found');

    await getSql()`
      INSERT INTO job_private_details(job_id, customer_id, address_line1, address_line2, town_city, access_notes)
      VALUES (${payload.jobId}, ${userId}, ${payload.addressLine1}, ${payload.addressLine2 || null}, ${payload.townCity}, ${payload.accessNotes})
      ON CONFLICT (job_id) DO UPDATE SET
        address_line1 = EXCLUDED.address_line1,
        address_line2 = EXCLUDED.address_line2,
        town_city = EXCLUDED.town_city,
        access_notes = EXCLUDED.access_notes,
        updated_at = now()
    `;

    return Response.json({ saved: true });
  } catch (error) { return jsonError(error); }
}
