import { jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';

type ProjectRow = {
  jobId: string;
  title: string;
  category: string;
  propertyType: string;
  postcode: string | null;
  status: 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  addressLine1: string | null;
  addressLine2: string | null;
  townCity: string | null;
  accessNotes: string | null;
  traderId: string | null;
  traderProfileId: string | null;
  businessName: string | null;
  tradeCategory: string | null;
};

type RecordRow = {
  id: string;
  jobId: string;
  entryType: 'handover' | 'warranty' | 'aftercare' | 'document' | 'snag';
  title: string;
  body: string;
  status: string;
  mediaUrl: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export async function GET(request: Request) {
  try {
    const customer = await requireRole(request, 'customer');

    const projects = await getSql()`
      SELECT j.id AS "jobId",
             j.title,
             j.category,
             j.property_type AS "propertyType",
             j.postcode,
             j.status,
             j.created_at AS "createdAt",
             j.updated_at AS "updatedAt",
             pd.address_line1 AS "addressLine1",
             pd.address_line2 AS "addressLine2",
             pd.town_city AS "townCity",
             pd.access_notes AS "accessNotes",
             aq.trader_id AS "traderId",
             tp.id AS "traderProfileId",
             tp.business_name AS "businessName",
             tp.trade_category AS "tradeCategory"
      FROM jobs j
      JOIN quotes aq ON aq.id = j.accepted_quote_id
      LEFT JOIN trader_profiles tp ON tp.user_id = aq.trader_id
      LEFT JOIN job_private_details pd ON pd.job_id = j.id
      WHERE j.customer_id = ${customer.id}
        AND j.status IN ('in_progress', 'completed')
      ORDER BY j.updated_at DESC
    ` as unknown as ProjectRow[];

    const records = await getSql()`
      SELECT e.id,
             e.job_id AS "jobId",
             e.entry_type AS "entryType",
             e.title,
             e.body,
             e.status,
             e.media_url AS "mediaUrl",
             e.due_at AS "dueAt",
             e.completed_at AS "completedAt",
             e.created_at AS "createdAt"
      FROM job_workspace_entries e
      JOIN jobs j ON j.id = e.job_id
      WHERE j.customer_id = ${customer.id}
        AND j.accepted_quote_id IS NOT NULL
        AND j.status IN ('in_progress', 'completed')
        AND e.visibility = 'shared'
        AND e.entry_type IN ('handover', 'warranty', 'aftercare', 'document', 'snag')
        AND e.status <> 'archived'
      ORDER BY e.due_at NULLS LAST, e.created_at DESC
    ` as unknown as RecordRow[];

    const byJob = new Map<string, RecordRow[]>();
    for (const record of records) {
      const current = byJob.get(record.jobId) ?? [];
      current.push(record);
      byJob.set(record.jobId, current);
    }

    return Response.json({
      projects: projects.map((project) => ({
        ...project,
        records: byJob.get(project.jobId) ?? [],
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
