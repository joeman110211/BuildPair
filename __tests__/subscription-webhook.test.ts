import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/stripe/webhook+api';
const mocks = vi.hoisted(() => ({ sql: vi.fn(), retrieve: vi.fn(), construct: vi.fn() }));
vi.mock('@/lib/sql', () => ({ getSql: () => mocks.sql }));
vi.mock('@/lib/stripe', () => ({ getStripe: () => ({ subscriptions: { retrieve: mocks.retrieve }, webhooks: { constructEventAsync: mocks.construct } }) }));
vi.mock('@/lib/notifications', () => ({ addJobEvent: vi.fn(), createNotification: vi.fn() }));

const current = (status = 'active') => ({ id: 'sub_test', status, metadata: { buildpairUserId: 'test-user', tier: 'core' }, items: { data: [{ quantity: 1, price: { id: 'price_pro', currency: 'gbp', unit_amount: 2999, recurring: { interval: 'month', interval_count: 1 } } }] } });
beforeEach(() => {
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'mock-secret');
  vi.stubEnv('STRIPE_FEATURED_PRICE_ID', 'price_pro');
  mocks.sql.mockReset().mockResolvedValue([]);
  mocks.retrieve.mockReset().mockResolvedValue(current());
  mocks.construct.mockReset().mockResolvedValue({ type: 'customer.subscription.updated', data: { object: { id: 'sub_test', status: 'active' } } });
});
afterEach(() => vi.unstubAllEnvs());
const request = (signature = true) => new Request('https://buildpair.test/api/stripe/webhook', { method: 'POST', body: '{}', headers: signature ? { 'stripe-signature': 'mock-signature' } : {} });
describe('Stripe webhook subscription lifecycle', () => {
  it('does not process unsigned deliveries', async () => {
    expect((await POST(request(false))).status).toBe(400);
    expect(mocks.sql).not.toHaveBeenCalled();
  });
  it('resolves a portal upgrade from its billed price', async () => {
    expect((await POST(request())).status).toBe(200);
    const values = mocks.sql.mock.calls.find(([strings]) => strings.join('').includes('UPDATE trader_profiles'))?.slice(1);
    expect(values).toEqual(['sub_test', 'featured', 'featured', true, 'test-user']);
  });
  it('uses latest cancellation state when a delayed active event arrives', async () => {
    mocks.retrieve.mockResolvedValue(current('canceled'));
    expect((await POST(request())).status).toBe(200);
    const values = mocks.sql.mock.calls.find(([strings]) => strings.join('').includes('UPDATE trader_profiles'))?.slice(1);
    expect(values).toEqual(['sub_test', null, 'free', false, 'test-user']);
  });
  it('preserves unexpired introductory Pro without making it permanent', async () => {
    mocks.retrieve.mockResolvedValue(current('canceled'));
    mocks.sql.mockResolvedValueOnce([{ complimentaryTier: null, introductoryAccess: true }]);
    expect((await POST(request())).status).toBe(200);
    const values = mocks.sql.mock.calls.find(([strings]) => strings.join('').includes('UPDATE trader_profiles'))?.slice(1);
    expect(values).toEqual(['sub_test', null, 'featured', false, 'test-user']);
  });
  it('ignores a delayed cancellation for an older trade contract', async () => {
    mocks.retrieve.mockResolvedValue(current('canceled'));
    mocks.sql.mockResolvedValueOnce([{ complimentaryTier: null, introductoryAccess: false, subscriptionId: 'sub_replacement' }]);
    expect((await POST(request())).status).toBe(200);
    expect(mocks.sql.mock.calls.some(([strings]) => strings.join('').includes('UPDATE trader_profiles'))).toBe(false);
  });
  it('revokes paid access on unexpected trade price while keeping a complimentary Pro grant', async () => {
    mocks.retrieve.mockResolvedValue({ ...current(), items: { data: [{ quantity: 1, price: { id: 'unrecognised_price', currency: 'gbp', unit_amount: 1, recurring: { interval: 'month', interval_count: 1 } } }] } });
    mocks.sql.mockResolvedValueOnce([{ userId: 'test-user', complimentaryTier: 'featured', introductoryAccess: false }]);
    expect((await POST(request())).status).toBe(200);
    const values = mocks.sql.mock.calls.find(([parts]) => parts.join('').includes('UPDATE trader_profiles'))?.slice(1);
    expect(values).toEqual(['featured', true, 'test-user']);
  });

  it('drops Project+ entitlement when the subscription has the wrong product price', async () => {
    mocks.retrieve.mockResolvedValue({ ...current(), metadata: { buildpairUserId: 'test-user', buildpairProduct: 'project_plus' } });
    expect((await POST(request())).status).toBe(200);
    const revoked = mocks.sql.mock.calls.some(([parts]) => parts.join('').includes('UPDATE users') && parts.join('').includes('project_plus_active = false'));
    expect(revoked).toBe(true);
  });

  it('requests Stripe retry after a database failure', async () => {
    mocks.sql.mockRejectedValueOnce(new Error('Database unavailable'));
    expect((await POST(request())).status).toBe(500);
  });
});
