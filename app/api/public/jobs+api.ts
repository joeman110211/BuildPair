import { and, desc, gte, inArray, isNull, notLike } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { jobs } from '@/db/schema';
import { outwardCode } from '@/lib/postcode';
import { LAUNCH_DATE_ISO } from '@/lib/launch-config';
import { jsonError } from '@/lib/server';

export async function GET() {
  try {
    const rows = await getDb().select().from(jobs)
      .where(and(
        isNull(jobs.targetTraderId),
        // Pre-launch test requests must not look like new public marketplace work.
        gte(jobs.createdAt, new Date(LAUNCH_DATE_ISO)),
        inArray(jobs.status, ['open', 'quoted']),
        notLike(jobs.customerId, 'seed_demo_customer_%'),
      ))
      .orderBy(desc(jobs.createdAt))
      .limit(50);

    return Response.json(rows.map((job) => ({
      ...job,
      isPreview: false,
      postcode: outwardCode(job.postcode),
      latitude: null,
      longitude: null,
    })));
  } catch (error) {
    return jsonError(error);
  }
}
