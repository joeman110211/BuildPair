import { authenticatedUserId, ensureDbUser, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { projectPlusEntitlement, projectPlusUsage } from '@/lib/project-plus';

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const entitlement = await projectPlusEntitlement(userId);
    const usage = await projectPlusUsage(userId);
    const designs = await getSql()`
      SELECT id, room_type AS "roomType", title, prompt, image_url AS "imageUrl", plan_json AS "plan", created_at AS "createdAt"
      FROM project_plus_designs WHERE user_id = ${userId}
      ORDER BY created_at DESC LIMIT 12
    `;
    return Response.json({ ...entitlement, ...usage, designs });
  } catch (error) { return jsonError(error); }
}
