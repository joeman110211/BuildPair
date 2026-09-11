import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { traderProfiles } from '@/db/schema';
import { classifyPayoutStatus } from '@/lib/payout-status';
import { jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { getStripe } from '@/lib/stripe';

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const db = getDb();
    const profile = await db.query.traderProfiles.findFirst({
      where: eq(traderProfiles.userId, trader.id),
    });

    if (!profile?.stripeAccountId) {
      return Response.json({
        ...classifyPayoutStatus({ hasAccount: false, payoutsEnabled: false }),
        lastCheckedAt: new Date().toISOString(),
      });
    }

    const account = await getStripe().accounts.retrieve(profile.stripeAccountId);
    const payoutsEnabled = Boolean(account.payouts_enabled);
    const chargesEnabled = Boolean(account.charges_enabled);

    await getSql()`
      UPDATE trader_profiles
      SET stripe_charges_enabled = ${chargesEnabled},
          stripe_payouts_enabled = ${payoutsEnabled},
          updated_at = now()
      WHERE user_id = ${trader.id}
    `;

    return Response.json({
      ...classifyPayoutStatus({
        hasAccount: true,
        payoutsEnabled,
        detailsSubmitted: Boolean(account.details_submitted),
        currentlyDue: account.requirements?.currently_due ?? [],
        pastDue: account.requirements?.past_due ?? [],
        disabledReason: account.requirements?.disabled_reason ?? null,
      }),
      lastCheckedAt: new Date().toISOString(),
    });
  } catch (error) {
    return jsonError(error);
  }
}
