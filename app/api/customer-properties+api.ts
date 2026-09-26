import { z } from 'zod';
import { PROPERTY_TYPES } from '@/constants/options';
import { InvalidPostcodeError, lookupPostcode } from '@/lib/postcode';
import { assertRateLimit } from '@/lib/rate-limit';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';

const propertySchema = z.object({
  id: z.uuid().optional(),
  nickname: z.string().trim().min(2).max(80),
  propertyType: z.enum(PROPERTY_TYPES),
  postcode: z.string().trim().min(5).max(8),
  addressLine1: z.string().trim().min(3).max(200),
  addressLine2: z.string().trim().max(200).optional().default(''),
  townCity: z.string().trim().min(2).max(120),
  accessNotes: z.string().trim().max(1000).optional().default(''),
});

type PropertyRow = {
  id: string;
  nickname: string;
  propertyType: string;
  postcode: string;
  addressLine1: string;
  addressLine2: string | null;
  townCity: string;
  accessNotes: string;
  createdAt: string;
  updatedAt: string;
};

async function rows(customerId: string, id?: string | null) {
  return getSql()`
    SELECT id,
           nickname,
           property_type AS "propertyType",
           postcode,
           address_line1 AS "addressLine1",
           address_line2 AS "addressLine2",
           town_city AS "townCity",
           access_notes AS "accessNotes",
           created_at AS "createdAt",
           updated_at AS "updatedAt"
    FROM customer_properties
    WHERE customer_id = ${customerId}
      AND (${id ?? null}::uuid IS NULL OR id = ${id ?? null}::uuid)
    ORDER BY updated_at DESC
  ` as unknown as PropertyRow[];
}

export async function GET(request: Request) {
  try {
    const customer = await requireRole(request, 'customer');
    const id = new URL(request.url).searchParams.get('id');
    const result = await rows(customer.id, id);
    if (id && !result[0]) throw new HttpError(404, 'Saved property not found');
    return Response.json(id ? result[0] : result);
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const customer = await requireRole(request, 'customer');
    await assertRateLimit(request, 'customer-properties', 30, 3600, customer.id);
    const input = propertySchema.parse(await request.json());

    let canonicalPostcode = input.postcode.toUpperCase();
    try {
      canonicalPostcode = (await lookupPostcode(input.postcode)).postcode;
    } catch (error) {
      if (error instanceof InvalidPostcodeError) throw new HttpError(400, error.message);
      throw error;
    }

    if (input.id) {
      const updated = await getSql()`
        UPDATE customer_properties
        SET nickname = ${input.nickname},
            property_type = ${input.propertyType},
            postcode = ${canonicalPostcode},
            address_line1 = ${input.addressLine1},
            address_line2 = ${input.addressLine2 || null},
            town_city = ${input.townCity},
            access_notes = ${input.accessNotes},
            updated_at = now()
        WHERE id = ${input.id} AND customer_id = ${customer.id}
        RETURNING id
      ` as unknown as { id: string }[];
      if (!updated[0]) throw new HttpError(404, 'Saved property not found');
      return Response.json((await rows(customer.id, input.id))[0]);
    }

    const created = await getSql()`
      INSERT INTO customer_properties(customer_id, nickname, property_type, postcode, address_line1, address_line2, town_city, access_notes)
      VALUES (${customer.id}, ${input.nickname}, ${input.propertyType}, ${canonicalPostcode}, ${input.addressLine1}, ${input.addressLine2 || null}, ${input.townCity}, ${input.accessNotes})
      RETURNING id
    ` as unknown as { id: string }[];
    return Response.json((await rows(customer.id, created[0]!.id))[0], { status: 201 });
  } catch (error) { return jsonError(error); }
}

export async function DELETE(request: Request) {
  try {
    const customer = await requireRole(request, 'customer');
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new HttpError(400, 'Saved property id is required');
    const removed = await getSql()`
      DELETE FROM customer_properties
      WHERE id = ${id}::uuid AND customer_id = ${customer.id}
      RETURNING id
    ` as unknown as { id: string }[];
    if (!removed[0]) throw new HttpError(404, 'Saved property not found');
    return Response.json({ deleted: true });
  } catch (error) { return jsonError(error); }
}
