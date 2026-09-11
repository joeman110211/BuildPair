import { z } from 'zod';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const confirmSchema = z.object({
  milestoneId: z.uuid(),
  action: z.literal('confirm_direct_payment'),
  note: z.string().trim().max(500).optional().default(''),
});

type StageRow = {
  milestoneId: string;
  title: string;
  amount: number;
  status: 'pending' | 'funded' | 'completed' | 'paid' | 'disputed';
  kind: 'materials' | 'deposit' | 'stage' | 'final';
  sortOrder: number;
  jobId: string;
  jobTitle: string;
  customerId: string;
  traderId: string;
  paymentMode: 'undecided' | 'buildpair' | 'external';
};

type ExternalRecord = {
  id: string;
  jobId: string;
  milestoneId: string;
  amount: number;
  payerConfirmedAt: string | null;
  recipientConfirmedAt: string | null;
  payerNote: string;
  recipientNote: string;
  createdAt: string;
  updatedAt: string;
};

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const jobId = new URL(request.url).searchParams.get('jobId');
    if (!jobId) throw new HttpError(400, 'Job id is required');
    const access = await getSql()`
      SELECT j.customer_id AS "customerId", q.trader_id AS "traderId", j.payment_mode AS "paymentMode"
      FROM jobs j JOIN quotes q ON q.id = j.accepted_quote_id
      WHERE j.id = ${jobId} LIMIT 1
    ` as unknown as { customerId: string; traderId: string; paymentMode: string }[];
    const job = access[0];
    if (!job || (job.customerId !== userId && job.traderId !== userId)) throw new HttpError(404, 'Project not found');
    if (job.paymentMode !== 'external') return Response.json([]);
    const rows = await getSql()`
      SELECT id, job_id AS "jobId", milestone_id AS "milestoneId", amount,
             payer_confirmed_at AS "payerConfirmedAt", recipient_confirmed_at AS "recipientConfirmedAt",
             payer_note AS "payerNote", recipient_note AS "recipientNote",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM external_payment_records WHERE job_id = ${jobId} ORDER BY created_at ASC
    ` as unknown as ExternalRecord[];
    return Response.json(rows);
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const input = confirmSchema.parse(await request.json());
    const rows = await getSql()`
      SELECT m.id AS "milestoneId", m.title, m.amount, m.status, m.kind, m.sort_order AS "sortOrder",
             j.id AS "jobId", j.title AS "jobTitle", j.customer_id AS "customerId", j.payment_mode AS "paymentMode",
             q.trader_id AS "traderId"
      FROM job_milestones m
      JOIN jobs j ON j.id = m.job_id
      JOIN quotes q ON q.id = m.quote_id
      WHERE m.id = ${input.milestoneId}
      LIMIT 1
    ` as unknown as StageRow[];
    const stage = rows[0];
    if (!stage || (stage.customerId !== userId && stage.traderId !== userId)) throw new HttpError(404, 'Payment stage not found');
    if (stage.paymentMode !== 'external') throw new HttpError(409, 'Direct-payment confirmations are only used when the project is set to pay the tradesperson directly');
    if (stage.status === 'paid') throw new HttpError(409, 'This stage is already recorded as paid');
    if (stage.status === 'disputed') throw new HttpError(409, 'Resolve the current issue before recording a direct payment');

    const earlier = await getSql()`SELECT title, status FROM job_milestones WHERE job_id = ${stage.jobId} AND sort_order < ${stage.sortOrder} ORDER BY sort_order ASC` as unknown as { title: string; status: string }[];
    const unfinished = earlier.find((item) => item.status !== 'paid');
    if (unfinished) throw new HttpError(409, `${unfinished.title} must be completed before this direct-payment stage can be recorded`);

    const upfront = stage.kind === 'materials' || stage.kind === 'deposit';
    if (!upfront && stage.status !== 'completed') throw new HttpError(409, 'The tradesperson must mark the agreed work stage complete before either side confirms its direct payment');
    if (upfront && stage.status !== 'pending' && stage.status !== 'completed') throw new HttpError(409, 'This direct-payment stage cannot be confirmed at its current state');

    const isCustomer = stage.customerId === userId;
    await getSql()`
      INSERT INTO external_payment_records(job_id, milestone_id, customer_id, trader_id, amount, payer_confirmed_at, recipient_confirmed_at, payer_note, recipient_note)
      VALUES (
        ${stage.jobId}, ${stage.milestoneId}, ${stage.customerId}, ${stage.traderId}, ${stage.amount},
        ${isCustomer ? new Date().toISOString() : null}, ${isCustomer ? null : new Date().toISOString()},
        ${isCustomer ? input.note : ''}, ${isCustomer ? '' : input.note}
      )
      ON CONFLICT (milestone_id) DO UPDATE SET
        payer_confirmed_at = CASE WHEN ${isCustomer} THEN COALESCE(external_payment_records.payer_confirmed_at, now()) ELSE external_payment_records.payer_confirmed_at END,
        recipient_confirmed_at = CASE WHEN ${!isCustomer} THEN COALESCE(external_payment_records.recipient_confirmed_at, now()) ELSE external_payment_records.recipient_confirmed_at END,
        payer_note = CASE WHEN ${isCustomer} AND ${input.note} <> '' THEN ${input.note} ELSE external_payment_records.payer_note END,
        recipient_note = CASE WHEN ${!isCustomer} AND ${input.note} <> '' THEN ${input.note} ELSE external_payment_records.recipient_note END,
        updated_at = now()
    `;

    const records = await getSql()`
      SELECT id, job_id AS "jobId", milestone_id AS "milestoneId", amount,
             payer_confirmed_at AS "payerConfirmedAt", recipient_confirmed_at AS "recipientConfirmedAt",
             payer_note AS "payerNote", recipient_note AS "recipientNote",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM external_payment_records WHERE milestone_id = ${stage.milestoneId} LIMIT 1
    ` as unknown as ExternalRecord[];
    const record = records[0];
    if (!record) throw new Error('Direct-payment confirmation could not be saved');

    const actorLabel = isCustomer ? 'Homeowner' : 'Tradesperson';
    await addJobEvent(stage.jobId, userId, 'external_payment_confirmation', `${actorLabel} confirmed direct payment`, `${stage.title} · £${(stage.amount / 100).toFixed(2)}. This is a user-declared record of a payment arranged outside BuildPair.`, { milestoneId: stage.milestoneId, payerConfirmed: Boolean(record.payerConfirmedAt), recipientConfirmed: Boolean(record.recipientConfirmedAt) });

    const recipientId = isCustomer ? stage.traderId : stage.customerId;
    await createNotification(recipientId, {
      type: 'external_payment_confirmation',
      title: isCustomer ? 'Homeowner marked a direct payment sent' : 'Tradesperson marked a direct payment received',
      body: `${stage.jobTitle}: ${stage.title} (${formatPence(stage.amount)}). Confirm your side of the direct payment in BuildPair so the project record can move on.`,
      href: isCustomer ? `/trader/jobs/${stage.jobId}` : `/customer/jobs/${stage.jobId}`,
      email: true,
    });

    const fullyConfirmed = Boolean(record.payerConfirmedAt && record.recipientConfirmedAt);
    if (fullyConfirmed) {
      await getSql()`
        UPDATE job_milestones
        SET status = 'paid', paid_at = now(), payment_method = 'external', payment_confirmed_by = ${stage.traderId}
        WHERE id = ${stage.milestoneId} AND status <> 'paid'
      `;
      await addJobEvent(stage.jobId, userId, 'external_payment_record_completed', `${stage.title} direct payment recorded`, `Both parties confirmed the ${formatPence(stage.amount)} direct payment. BuildPair did not process, hold, protect, verify or guarantee the money.`, { milestoneId: stage.milestoneId, externalPaymentRecordId: record.id, verification: 'two_party_declaration_only' });
      await Promise.allSettled([
        createNotification(stage.customerId, { type: 'external_payment_record_completed', title: `${stage.title} recorded as paid directly`, body: `${stage.jobTitle}: both sides confirmed the direct payment. BuildPair did not process or protect the money.`, href: `/customer/jobs/${stage.jobId}` }),
        createNotification(stage.traderId, { type: 'external_payment_record_completed', title: `${stage.title} recorded as paid directly`, body: `${stage.jobTitle}: both sides confirmed the direct payment. The next project stage can now progress.`, href: `/trader/jobs/${stage.jobId}` }),
      ]);
    }

    return Response.json({ ...record, fullyConfirmed });
  } catch (error) { return jsonError(error); }
}

function formatPence(value: number) { return `£${(value / 100).toFixed(2)}`; }
