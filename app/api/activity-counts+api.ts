import { accountModes, authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    const user = await ensureDbUser(userId);
    const modes = await accountModes(userId);
    const activeMode = modes.activeMode ?? user.role;
    if (!activeMode) throw new HttpError(403, 'Choose an account mode first');

    const sql = getSql();
    const notifications = await sql`
      SELECT count(*)::int AS count
      FROM notifications
      WHERE user_id = ${userId} AND read_at IS NULL
    ` as unknown as { count: number }[];

    const messages = activeMode === 'customer'
      ? await sql`
          SELECT count(*)::int AS count
          FROM messages m
          JOIN conversations c ON c.id = m.conversation_id
          WHERE c.customer_id = ${userId}
            AND m.sender_id <> ${userId}
            AND m.read_at IS NULL
        ` as unknown as { count: number }[]
      : await sql`
          SELECT count(*)::int AS count
          FROM messages m
          JOIN conversations c ON c.id = m.conversation_id
          WHERE c.trader_id = ${userId}
            AND m.sender_id <> ${userId}
            AND m.read_at IS NULL
        ` as unknown as { count: number }[];

    return Response.json({
      unreadMessages: Number(messages[0]?.count ?? 0),
      unreadNotifications: Number(notifications[0]?.count ?? 0),
    });
  } catch (error) { return jsonError(error); }
}
