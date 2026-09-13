import type Stripe from 'stripe';
import { jsonError, requireRole } from '@/lib/server';
import { getStripe, providerReturnUrl } from '@/lib/stripe';
import { sendSubscriptionReceiptOnce } from '@/lib/transactional-email';

type PaidTier = 'basic' | 'featured';

function subscriptionObject(value: string | Stripe.Subscription | null) {
  return value && typeof value !== 'string' ? value : null;
}

function invoiceObject(value: string | Stripe.Invoice | null | undefined) {
  return value && typeof value !== 'string' ? value : null;
}

function activeCustomer(value: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  if (!value || typeof value === 'string' || value.deleted) return null;
  return value;
}

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const sessionId = new URL(request.url).searchParams.get('session_id')?.trim();
    if (!sessionId) return Response.redirect(providerReturnUrl('subscription', 'complete'), 303);

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription.latest_invoice', 'customer'],
    });

    if (session.client_reference_id !== trader.id) {
      return Response.redirect(providerReturnUrl('subscription', 'complete'), 303);
    }

    let subscription = subscriptionObject(session.subscription);
    if (!subscription && typeof session.subscription === 'string') {
      subscription = await stripe.subscriptions.retrieve(session.subscription, { expand: ['latest_invoice'] });
    }
    if (!subscription) return Response.redirect(providerReturnUrl('subscription', 'complete'), 303);

    const tier = subscription.metadata.tier as PaidTier | undefined;
    if (tier !== 'basic' && tier !== 'featured') {
      return Response.redirect(providerReturnUrl('subscription', 'complete'), 303);
    }

    let invoice = invoiceObject(subscription.latest_invoice);
    if (!invoice && typeof subscription.latest_invoice === 'string') {
      invoice = await stripe.invoices.retrieve(subscription.latest_invoice);
    }

    const customer = activeCustomer(session.customer);
    const email = session.customer_details?.email || invoice?.customer_email || customer?.email || trader.email;
    const name = session.customer_details?.name || customer?.name || null;

    if (email && invoice && ['active', 'trialing'].includes(subscription.status)) {
      const nextBillingAt = invoice.lines.data
        .map((line) => line.period?.end ?? 0)
        .filter(Boolean)
        .sort((a, b) => b - a)[0] || null;
      try {
        await sendSubscriptionReceiptOnce({
          subscriptionId: subscription.id,
          invoiceId: invoice.id,
          email,
          name,
          tier,
          amountPaid: invoice.amount_paid,
          currency: invoice.currency,
          invoiceNumber: invoice.number,
          hostedInvoiceUrl: invoice.hosted_invoice_url,
          invoicePdf: invoice.invoice_pdf,
          nextBillingAt,
        });
      } catch (error) {
        console.error('[subscription-receipt-email]', error instanceof Error ? error.message : typeof error);
      }
    }

    return Response.redirect(providerReturnUrl('subscription', 'complete'), 303);
  } catch (error) {
    return jsonError(error);
  }
}
