import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as image } from '@/app/api/project-plus/image+api';
import { POST as plan } from '@/app/api/project-plus/plan+api';
const mocks = vi.hoisted(() => ({ sql: vi.fn(), generate: vi.fn() }));
vi.mock('@/lib/sql', () => ({ getSql: () => mocks.sql }));
vi.mock('@/lib/server', () => ({
  authenticatedUserId: async () => 'test-user', ensureDbUser: async () => ({}),
  HttpError: class extends Error { constructor(public status: number, message: string) { super(message); } },
  jsonError: (error: { status?: number }) => Response.json({ error: 'Request failed' }, { status: error.status ?? 500 }),
}));
vi.mock('@/lib/ai-audit', () => ({ assertAiDailyBudget: async () => {}, recordAiRequest: async () => {} }));
vi.mock('@/lib/cloudinary-server', () => ({ uploadGeneratedImage: async () => 'https://example.test/concept.png' }));
vi.mock('@google/genai', () => ({ GoogleGenAI: class { models = { generateContent: mocks.generate }; } }));

let images = 0;
let plans = 0;
beforeEach(() => {
  images = 0; plans = 0; mocks.sql.mockReset(); mocks.generate.mockReset();
  vi.stubEnv('GEMINI_API_KEY', 'mock-key');
  mocks.generate.mockResolvedValue({ text: '{"conceptSummary":"Mock planning output"}', candidates: [{ content: { parts: [{ inlineData: { data: 'AA==', mimeType: 'image/png' } }] } }] });
  mocks.sql.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const query = strings.join('?');
    if (query.includes('LEFT JOIN trader_profiles')) return [{ customerEnabled: true, projectPlusActive: false }];
    if (query.includes('INSERT INTO project_plus_usage')) {
      const isImage = query.includes('RETURNING image_generations');
      const used = isImage ? images : plans;
      if (used >= Number(values[1])) return [];
      if (isImage) images++; else plans++;
      return [{ used: used + 1, month: '2026-10-01' }];
    }
    if (query.includes('UPDATE project_plus_usage')) { if (query.includes('image_generations')) images--; else plans--; return []; }
    if (query.includes('INSERT INTO project_plus_designs')) return [{ id: 'test-design' }];
    if (query.includes('FROM project_plus_usage')) return [{ imagesUsed: images, plannerUsed: plans }];
    throw new Error('Unexpected test SQL');
  });
});
afterEach(() => vi.unstubAllEnvs());
const request = () => new Request('https://buildpair.test/api/project-plus', { method: 'POST', body: JSON.stringify({ roomType: 'Bathroom', brief: 'A practical room concept' }) });
describe('Project+ paid-provider usage boundaries', () => {
  it('limits simultaneous complimentary image requests before calling the provider', async () => {
    const responses = await Promise.all(Array.from({ length: 5 }, () => image(request())));
    expect(responses.filter((response) => response.status === 200)).toHaveLength(2);
    expect(responses.filter((response) => response.status === 429)).toHaveLength(3);
    expect(mocks.generate).toHaveBeenCalledTimes(2);
    expect(images).toBe(2);
  });
  it('uses the complimentary planner cap for simultaneous requests', async () => {
    const responses = await Promise.all(Array.from({ length: 12 }, () => plan(request())));
    expect(responses.filter((response) => response.status === 200)).toHaveLength(10);
    expect(mocks.generate).toHaveBeenCalledTimes(10);
  });
  it('restores allowance after a provider failure', async () => {
    mocks.generate.mockRejectedValueOnce(new Error('Provider unavailable'));
    expect((await image(request())).status).toBe(500);
    expect(images).toBe(0);
    expect((await image(request())).status).toBe(200);
    expect(images).toBe(1);
  });
  it('does not consume allowance for invalid input', async () => {
    await image(new Request('https://buildpair.test/api/project-plus', { method: 'POST', body: '{}' }));
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(images).toBe(0);
  });
  it('rejects malformed AI output and restores the planning allowance', async () => {
    mocks.generate.mockResolvedValueOnce({ text: '{"conceptSummary":"Mock", "layoutIdeas":"wrong type"}' });
    expect((await plan(request())).status).toBe(500);
    expect(plans).toBe(0);
  });
});
