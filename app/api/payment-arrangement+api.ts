import { z } from 'zod';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const querySchema = z.object({ jobId: z.uuid() });
const actionSchema = z.object({
  jobId: z.uuid(),
  action: z.enum(['propose_external', 'confirm_external', 'cancel_external']),
});

type ArrangementRow = {
  jobId: string;
  title: string;
  status: string;
  paymentMode: 'undecided' | 'buildpair' | 'external';
  customerId: string;
  traderId: string;
  proposedBy: string | null;
  proposedAt: string | null;
  customerAgreedAt: string | null;
  traderAgreedAt: string | null;
};

async function readArrangement(jobId: string) {
  const rows = await getSql()`
    SELECT j.id AS "jobId", j.title, j.status, j.payment_mode AS "paymentMode",
           j.customer_id AS "customerId", q.trader_id AS "traderId",
           j.external_payment_proposed_by AS "proposedBy",
           j.external_payment_proposed_at AS "proposedAt",
           j.external_payment_customer_agreed_at AS "customerAgreedAt",
           j.external_payment_trader_agreed_at AS "traderAgreedAt"
    FROM jobs j
    JOIN quotes q ON q.id = j.accepted_quote_id
    WHERE j.id = ${jobId}
    LIMIT 1
  ` as unknown as ArrangementRow[];
  return rows[0];
}

function publicState(row: ArrangementRow, userId: string) {
  const isCustomer = row.customerId === userId;
  const myAgreedAt = isCustomer ? row.customerAgreedAt : row.traderAgreedAt;
  const otherAgreedAt = isCustomer ? row.traderAgreedAt : row.customerAgreedAt;
  return {
    paymentMode: row.paymentMode,
    proposedAt: row.proposedAt,
    proposedByMe: row.proposedBy === userId,
    proposedByOther: Boolean(row.proposedBy && row.proposedBy !== userId),
    myAgreed: Boolean(myAgreedAt),
    otherAgreed: Boolean(otherAgreedAt),
    fullyAgreed: row.paymentMode === 'external' && Boolean(row.customerAgreedAt && row.traderAgreedAt),
  };
}

async function assertCanSwitchFromBuildPay(jobId: string, paymentMode: ArrangementRow['paymentMode']) {
  if (paymentMode !== 'buildpair') return;
  const collected = await getSql()`
    SELECT 1 FROM payments
    WHERE job_id = ${jobId} AND status IN ('processing','paid')
    LIMIT 1
  `;
  const funded = await getSql()`
    SELECT 1 FROM buildpay_funding_batches
    WHERE job_id = ${jobId} AND status <> 'requires_payment'
    LIMIT 1
  `;
  if (collected.length || funded.length) throw new HttpError(409, 'BuildPay money has already been collected for this job, so the payment arrangement can no longer be switched outside BuildPair.');
}

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const { jobId } = querySchema.parse({ jobId: new URL(request.url).searchParams.get('jobId') });
    const row = await readArrangement(jobId);
    if (!row || (row.customerId !== userId && row.traderId !== userId)) throw new HttpError(404, 'Project not found');
    return Response.json(publicState(row, userId));
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const input = actionSchema.parse(await request.json());
    const row = await readArrangement(input.jobId);
    if (!row || (row.customerId !== userId && row.traderId !== userId)) throw new HttpError(404, 'Project not found');
    if (row.status !== 'in_progress') throw new HttpError(409, 'Payment arrangements can only be agreed for an active accepted job');
    if (row.paymentMode === 'external' && input.action !== 'cancel_external') return Response.json(publicState(row, userId));
    await assertCanSwitchFromBuildPay(input.jobId, row.paymentMode);

    const isCustomer = row.customerId === userId;
    const otherId = isCustomer ? row.traderId : row.customerId;
    const actor = isCustomer ? 'Homeowner' : 'Tradesperson';

    if (input.action === 'propose_external') {
      await getSql()`
        UPDATE jobs SET
          external_payment_proposed_by = ${userId},
          external_payment_proposed_at = now(),
          external_payment_customer_agreed_at = ${isCustomer ? new Date().toISOString() : null},
          external_payment_trader_agreed_at = ${isCustomer ? null : new Date().toISOString()},
          updated_at = now()
        WHERE id = ${input.jobId}
      `;
      await addJobEvent(input.jobId, userId, 'external_payment_proposed', `${actor} proposed direct payment`, 'One party proposed arranging payments outside BuildPair. The other party must explicitly agree before the job switches to direct payment. BuildPair will not process, hold, protect, refund or recover money paid outside BuildPair.');
      await createNotification(otherId, {
        type: 'external_payment_proposed',
        title: 'Direct payment arrangement proposed',
        body: `${row.title}: ${actor.toLowerCase()} proposed arranging payments outside BuildPair. Review and agree only if that is what you both want.`,
        href: isCustomer ? `/trader/jobs/${input.jobId}/payment-arrangement` : `/customer/jobs/${input.jobId}/start`,
        email: true,
      });
    } else if (input.action === 'confirm_external') {
      if (!row.proposedBy || row.proposedBy === userId || !row.proposedAt) throw new HttpError(409, 'The other party must propose direct payment before you can confirm it');
      await getSql()`
        UPDATE jobs SET
          external_payment_customer_agreed_at = CASE WHEN ${isCustomer} THEN now() ELSE external_payment_customer_agreed_at END,
          external_payment_trader_agreed_at = CASE WHEN ${!isCustomer} THEN now() ELSE external_payment_trader_agreed_at END,
          payment_mode = 'external',
          updated_at = now()
        WHERE id = ${input.jobId}
      `;
      await addJobEvent(input.jobId, userId, 'external_payment_agreed', 'Direct payment agreed by both sides', 'Both parties explicitly agreed to arrange payment outside BuildPair. The structured quote, messages, variations and optional two-party payment records remain in BuildPair, but BuildPay protection does not apply.');
      await createNotification(otherId, {
        type: 'external_payment_agreed',
        title: 'Direct payment agreed',
        body: `${row.title}: both sides agreed to arrange payments directly. BuildPay will not handle or protect those payments.`,
        href: isCustomer ? `/trader/jobs/${input.jobId}` : `/customer/jobs/${input.jobId}`,
        email: true,
      });
    } else {
      if (row.proposedBy !== userId || row.paymentMode === 'external') throw new HttpError(409, 'Only the person who made a pending direct-payment proposal can cancel it');
      await getSql()`
        UPDATE jobs SET external_payment_proposed_by = NULL, external_payment_proposed_at = NULL,
          external_payment_customer_agreed_at = NULL, external_payment_trader_agreed_at = NULL, updated_at = now()
        WHERE id = ${input.jobId}
      `;
      await addJobEvent(input.jobId, userId, 'external_payment_proposal_cancelled', 'Direct payment proposal cancelled', 'The pending proposal to pay outside BuildPair was cancelled.');
      await createNotification(otherId, { type: 'external_payment_proposal_cancelled', title: 'Direct payment proposal cancelled', body: `${row.title}: the pending direct-payment proposal was cancelled.`, href: isCustomer ? `/trader/jobs/${input.jobId}/payment-arrangement` : `/customer/jobs/${input.jobId}/start` });
    }

    const updated = await readArrangement(input.jobId);
    if (!updated) throw new Error('Payment arrangement could not be refreshed');
    return Response.json(publicState(updated, userId));
  } catch (error) { return jsonError(error); }
}
