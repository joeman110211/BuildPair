import { z } from 'zod';
import { PATCH as patchAdminReports } from './reports+api';
import { PATCH as patchAdminUsers } from './users+api';
import { adminAssistantActionSchema } from '@/lib/admin-assistant-actions';
import { recordAiRequest } from '@/lib/ai-audit';
import { assertRateLimit } from '@/lib/rate-limit';
import { jsonError, requireAdmin } from '@/lib/server';

const requestSchema = z.object({
  confirmed: z.literal(true),
  action: adminAssistantActionSchema,
});

function forwardedAdminRequest(request: Request, pathname: string, method: 'PATCH', body: unknown) {
  const headers = new Headers({ 'content-type': 'application/json' });
  const authorization = request.headers.get('authorization');
  const cookie = request.headers.get('cookie');
  if (authorization) headers.set('authorization', authorization);
  if (cookie) headers.set('cookie', cookie);
  return new Request(new URL(pathname, request.url), {
    method,
    headers,
    body: JSON.stringify(body),
  });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let adminId: string | null = null;
  let actionForAudit: unknown = null;

  try {
    const { user: admin } = await requireAdmin(request);
    adminId = admin.id;
    await assertRateLimit(request, 'admin-assistant-action', 30, 3600, admin.id);

    const payload = requestSchema.parse(await request.json());
    actionForAudit = payload.action;
    let response: Response;

    if (payload.action.kind === 'moderation_decision') {
      response = await patchAdminReports(forwardedAdminRequest(request, '/api/admin/reports', 'PATCH', {
        id: payload.action.reportId,
        status: payload.action.status,
        adminNotes: payload.action.adminNotes,
        accountAction: payload.action.accountAction,
        conversationAction: payload.action.conversationAction,
      }));
    } else {
      const userPayload = payload.action.kind === 'grant_complimentary'
        ? { action: 'grant_complimentary', userId: payload.action.userId, tier: payload.action.tier, reason: payload.action.reason }
        : payload.action.kind === 'revoke_complimentary'
          ? { action: 'revoke_complimentary', userId: payload.action.userId, reason: payload.action.reason }
          : payload.action.kind === 'user_suspend'
            ? { action: 'suspend', userId: payload.action.userId, reason: payload.action.reason }
            : { action: 'unsuspend', userId: payload.action.userId, reason: payload.action.reason };
      response = await patchAdminUsers(forwardedAdminRequest(request, '/api/admin/users', 'PATCH', userPayload));
    }

    const responseText = await response.clone().text();
    await recordAiRequest({
      userId: admin.id,
      endpoint: 'admin-assistant-action',
      request: { confirmed: true, action: payload.action },
      response: responseText,
      status: response.ok ? 'success' : 'error',
      providerCalled: false,
      latencyMs: Date.now() - startedAt,
      metadata: { actionKind: payload.action.kind, explicitConfirmation: true },
    });
    return response;
  } catch (error) {
    await recordAiRequest({
      userId: adminId,
      endpoint: 'admin-assistant-action',
      request: { confirmed: true, action: actionForAudit },
      response: error instanceof Error ? error.message : 'Confirmed admin action failed',
      status: 'error',
      providerCalled: false,
      latencyMs: Date.now() - startedAt,
      metadata: { explicitConfirmation: true },
    });
    return jsonError(error);
  }
}
