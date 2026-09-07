import { z } from 'zod';
import { authenticatedUserId, ensureDbUser, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const presenceSchema = z.object({
  path: z.string().trim().max(300).optional().default(''),
  platform: z.string().trim().max(50).optional().default('unknown'),
});

export async function POST(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const payload = presenceSchema.parse(await request.json().catch(() => ({})));

    await getSql()`
      INSERT INTO user_presence(user_id, last_seen_at, last_path, client_platform, updated_at)
      VALUES (${userId}, now(), ${payload.path || null}, ${payload.platform || 'unknown'}, now())
      ON CONFLICT (user_id) DO UPDATE SET
        last_seen_at = EXCLUDED.last_seen_at,
        last_path = EXCLUDED.last_path,
        client_platform = EXCLUDED.client_platform,
        updated_at = now()
    `;

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
