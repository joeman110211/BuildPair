import { afterEach, describe, expect, it, vi } from 'vitest';
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@/lib/sql', () => ({ getSql: () => query }));
vi.mock('@/lib/server', () => ({ jsonError: () => Response.json({ error: 'Unavailable' }, { status: 500 }) }));
import { GET } from '@/app/api/featured-trader+api';

function profile(index: number) {
  return { id: `profile-${index}`, userId: `user-${index}`, businessName: `Trade ${index}`, tradeCategory: 'Tiling', locationLabel: 'London', photos: index ? [`https://example.com/work-${index}.jpg`] : null, createdAt: '2026-09-01T00:00:00Z', averageRating: 0, reviewCount: 0, completedJobs: 0 };
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe('featured profiles API', () => {
  it('returns up to six distinct current profiles while preserving the existing weekly spotlight', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-12T12:00:00Z'));
    vi.stubEnv('FEATURED_TRADER_OVERRIDE_WEEK', '2026-09-07');
    vi.stubEnv('FEATURED_TRADER_OVERRIDE_USER_ID', 'user-4');
    query.mockResolvedValue(Array.from({ length: 8 }, (_, index) => profile(index)));
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.traders).toHaveLength(6);
    expect(new Set(body.traders.map((item: { id: string }) => item.id)).size).toBe(6);
    expect(body.traders[0].id).toBe(body.trader.id);
    expect(body.trader.id).toBe('profile-4');
    expect(body.trader.isOverride).toBe(true);
    expect(body.traders.find((item: { id: string }) => item.id === 'profile-0')).toMatchObject({ photos: [], galleryCount: 0, reviewCount: 0 });
    expect(body.traders[0]).not.toHaveProperty('userId');
  });
  it('includes newly registered eligible profiles without inventing extra cards', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-12T12:00:00Z'));
    query.mockResolvedValue([profile(0), { ...profile(1), createdAt: '2026-09-12T09:00:00Z' }]);
    const body = await (await GET()).json();
    expect(body.traders).toHaveLength(2);
    expect(body.traders.map((item: { id: string }) => item.id)).toContain('profile-1');
    expect(body.trader.galleryCount).toBe(0);
  });
  it('returns an honest empty state when no eligible trades are available', async () => {
    query.mockResolvedValue([]);
    const body = await (await GET()).json();
    expect(body.trader).toBeNull();
    expect(body.traders).toEqual([]);
  });
});
