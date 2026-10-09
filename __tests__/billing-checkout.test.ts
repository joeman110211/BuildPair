import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tradeCheckout } from '@/lib/billing-checkout';
const mocks = vi.hoisted(() => ({ limit: vi.fn(), customer: vi.fn(), price: vi.fn(), subscriptions: vi.fn(), sessions: vi.fn(), create: vi.fn(), portal: vi.fn() }));
vi.mock('@/db/client', () => ({ getDb: () => ({ select: () => ({ from: () => ({ where: () => ({ limit: mocks.limit }) }) }), update: () => ({ set: () => ({ where: async () => {} }) }) }) }));
vi.mock('@/lib/server', () => ({ HttpError: class extends Error { constructor(public status: number, message: string) { super(message); } } }));
vi.mock('@/lib/stripe', () => ({ appUrl: () => 'https://buildpair.test', providerReturnUrl: () => 'https://buildpair.test/trader/subscription', getStripe: () => ({ prices: { retrieve: mocks.price }, customers: { create: mocks.customer }, subscriptions: { list: mocks.subscriptions }, checkout: { sessions: { list: mocks.sessions, create: mocks.create, expire: vi.fn() } }, billingPortal: { sessions: { create: mocks.portal } } }) }));
const trader = { id: 'test-user', email: 'test@example.test' };
beforeEach(() => {
  vi.stubEnv('STRIPE_CORE_PRICE_ID', 'price_core'); vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'mock-secret');
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.limit.mockResolvedValue([{ stripeCustomerId: 'cus_test' }]);
  mocks.price.mockResolvedValue({ active: true, currency: 'gbp', unit_amount: 999, recurring: { interval: 'month', interval_count: 1 } });
  mocks.subscriptions.mockResolvedValue({ data: [] }); mocks.sessions.mockResolvedValue({ data: [] });
  mocks.create.mockResolvedValue({ url: 'https://checkout.stripe.test/session' }); mocks.portal.mockResolvedValue({ url: 'https://billing.stripe.test/session' });
});
afterEach(() => vi.unstubAllEnvs());
describe('duplicate subscription protection', () => {
  it('manages an existing paid subscription instead of charging for another', async () => {
    mocks.subscriptions.mockResolvedValue({ data: [{ status: 'active', metadata: { buildpairUserId: trader.id, tier: 'featured' } }] });
    expect(await tradeCheckout(trader, 'core')).toBe('https://billing.stripe.test/session');
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('reuses an open checkout after a click or network retry', async () => {
    mocks.sessions.mockResolvedValue({ data: [{ id: 'cs_test', status: 'open', client_reference_id: trader.id, metadata: { tier: 'core' }, url: 'https://checkout.stripe.test/existing' }] });
    expect(await tradeCheckout(trader, 'core')).toBe('https://checkout.stripe.test/existing');
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('refuses mismatched prices before creating a chargeable session', async () => {
    mocks.price.mockResolvedValue({ active: true, currency: 'usd', unit_amount: 999, recurring: { interval: 'month', interval_count: 1 } });
    await expect(tradeCheckout(trader, 'core')).rejects.toThrow('configuration');
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('uses only configured prices and tags retried checkout creation', async () => {
    await tradeCheckout(trader, 'core');
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ line_items: [{ price: 'price_core', quantity: 1 }] }), expect.objectContaining({ idempotencyKey: expect.stringContaining('buildpair-trade-checkout-test-user-core-') }));
  });
});
