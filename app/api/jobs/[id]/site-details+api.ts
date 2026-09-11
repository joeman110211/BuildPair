import { z } from 'zod';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { lookupPostcode } from '@/lib/postcode';
import { authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const schema = z.object({
  addressLine1: z.string().trim().min(3).max(160),
  addressLine2: z.string().trim().max(160).optional().default(''),
  townCity: z.string().trim().min(2).max(100),
  county: z.string().trim().max(100).optional().default(''),
  postcode: z.string().trim().min(5).max(10),
  phone: z.string().trim().min(10).max(24),
});

type AccessRow = {
  jobId: string;
  jobTitle: string;
  customerId: string;
  traderId: string | null;
  status: string;
  postcode: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  townCity: string | null;
  county: string | null;
  sitePostcode: string | null;
  phone: string | null;
  confirmedAt: string | null;
};

async function loadJob(id: string) {
  const rows = await getSql()`
    SELECT j.id AS "jobId", j.title AS "jobTitle", j.customer_id AS "customerId", q.trader_id AS "traderId", j.status,
           j.postcode, j.site_address_line1 AS "addressLine1", j.site_address_line2 AS "addressLine2",
           j.site_town_city AS "townCity", j.site_county AS "county", j.site_postcode AS "sitePostcode",
           j.site_phone AS "phone", j.site_details_confirmed_at AS "confirmedAt"
    FROM jobs j LEFT JOIN quotes q ON q.id = j.accepted_quote_id
    WHERE j.id = ${id} LIMIT 1
  ` as unknown as AccessRow[];
  return rows[0];
}

function normalisePhone(input: string) {
  const compact = input.replace(/[\s()\-.]/g, '');
  if (!/^(?:\+44\d{9,10}|0\d{9,10})$/.test(compact)) {
    throw new HttpError(400, 'Enter a valid UK contact number, for example 020 7946 0123 or 07911 123456');
  }
  return compact;
}

function publicShape(row: AccessRow) {
  return {
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    townCity: row.townCity,
    county: row.county,
    postcode: row.sitePostcode ?? row.postcode,
    phone: row.phone,
    confirmedAt: row.confirmedAt,
    complete: Boolean(row.addressLine1 && row.townCity && row.sitePostcode && row.phone && row.confirmedAt),
  };
}

export async function GET(request: Request, { id }: { id: string }) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const row = await loadJob(id);
    if (!row || (row.customerId !== userId && row.traderId !== userId)) throw new HttpError(404, 'Job not found');
    if (!row.traderId) throw new HttpError(409, 'Site details are shared only after a quote has been accepted');
    return Response.json({ siteDetails: publicShape(row), canEdit: row.customerId === userId });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request, { id }: { id: string }) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const row = await loadJob(id);
    if (!row || row.customerId !== userId) throw new HttpError(404, 'Job not found');
    if (!row.traderId || row.status !== 'in_progress') throw new HttpError(409, 'Confirm the worksite after accepting a quote');

    const input = schema.parse(await request.json());
    const postcode = await lookupPostcode(input.postcode);
    const phone = normalisePhone(input.phone);
    const wasComplete = Boolean(row.confirmedAt);

    await getSql()`
      UPDATE jobs SET
        site_address_line1 = ${input.addressLine1},
        site_address_line2 = ${input.addressLine2 || null},
        site_town_city = ${input.townCity},
        site_county = ${input.county || null},
        site_postcode = ${postcode.postcode},
        site_phone = ${phone},
        site_details_confirmed_at = now(),
        updated_at = now()
      WHERE id = ${id} AND customer_id = ${userId}
    `;

    await addJobEvent(id, userId, wasComplete ? 'site_details_updated' : 'site_details_confirmed', wasComplete ? 'Worksite details updated' : 'Worksite details confirmed', 'The private address and contact details for the awarded job were confirmed. They are visible to the homeowner and awarded tradesperson only.', {});
    await createNotification(row.traderId, { type: 'site_details_confirmed', title: wasComplete ? 'Worksite details updated' : 'Worksite details available', body: `${row.jobTitle}: the homeowner has confirmed the private work address and contact number.`, href: `/trader/jobs/${id}`, email: true });

    const updated = await loadJob(id);
    return Response.json({ siteDetails: updated ? publicShape(updated) : null });
  } catch (error) { return jsonError(error); }
}
