import { z } from 'zod';
import { HttpError } from '@/lib/server';
import { getSql } from '@/lib/sql';

export const adminAssistantActionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('user_suspend'), userId: z.string().min(1), reason: z.string().trim().max(1000).default('') }),
  z.object({ kind: z.literal('user_unsuspend'), userId: z.string().min(1), reason: z.string().trim().max(1000).default('') }),
  z.object({ kind: z.literal('grant_complimentary'), userId: z.string().min(1), tier: z.enum(['basic', 'featured']), reason: z.string().trim().max(1000).default('') }),
  z.object({ kind: z.literal('revoke_complimentary'), userId: z.string().min(1), reason: z.string().trim().max(1000).default('') }),
  z.object({
    kind: z.literal('moderation_decision'),
    reportId: z.string().uuid(),
    status: z.enum(['reviewed', 'actioned', 'dismissed']),
    adminNotes: z.string().trim().max(4000).default(''),
    accountAction: z.enum(['none', 'warn', 'suspend', 'unsuspend']).default('none'),
    conversationAction: z.enum(['none', 'warn', 'restrict', 'close', 'reopen']).default('none'),
  }),
]);

export type AdminAssistantAction = z.infer<typeof adminAssistantActionSchema>;

export type AdminActionProposal = {
  action: AdminAssistantAction;
  title: string;
  summary: string;
  impact: string[];
  risk: 'medium' | 'high';
  confirmLabel: string;
};

async function userTarget(userId: string) {
  const rows = await getSql()`
    SELECT u.email, coalesce(u.is_admin, false) AS "isAdmin", coalesce(u.is_deleted, false) AS "isDeleted", tp.business_name AS "businessName"
    FROM users u LEFT JOIN trader_profiles tp ON tp.user_id = u.id
    WHERE u.id = ${userId}
    LIMIT 1
  ` as { email: string | null; isAdmin: boolean; isDeleted: boolean; businessName: string | null }[];
  const target = rows[0];
  if (!target || target.isDeleted) throw new HttpError(404, 'The account selected by the Admin Assistant is not an active BuildPair account');
  return { ...target, label: target.email || target.businessName || userId };
}

export async function buildAdminActionProposal(adminId: string, rawAction: unknown): Promise<AdminActionProposal> {
  const action = adminAssistantActionSchema.parse(rawAction);

  if (action.kind === 'moderation_decision') {
    const rows = await getSql()`
      SELECT r.reason, r.status, subject.email AS "subjectEmail"
      FROM moderation_reports r LEFT JOIN users subject ON subject.id = r.subject_user_id
      WHERE r.id = ${action.reportId}
      LIMIT 1
    ` as { reason: string; status: string; subjectEmail: string | null }[];
    const report = rows[0];
    if (!report) throw new HttpError(404, 'The moderation report selected by the Admin Assistant no longer exists');
    const impact = [`Mark report as ${action.status}`];
    if (action.accountAction !== 'none') impact.push(`Account action: ${action.accountAction}${report.subjectEmail ? ` (${report.subjectEmail})` : ''}`);
    if (action.conversationAction !== 'none') impact.push(`Conversation action: ${action.conversationAction}`);
    if (action.adminNotes) impact.push('Save the supplied moderator notes');
    return {
      action,
      title: 'Confirm moderation action',
      summary: `Apply the proposed decision to report ${action.reportId}. Current status: ${report.status}. Reason: ${report.reason}.`,
      impact,
      risk: action.accountAction === 'suspend' || action.conversationAction === 'close' ? 'high' : 'medium',
      confirmLabel: 'Confirm moderation action',
    };
  }

  const target = await userTarget(action.userId);
  if (target.isAdmin && (action.kind === 'user_suspend' || action.kind === 'user_unsuspend')) {
    throw new HttpError(400, 'The Admin Assistant will not prepare suspension actions against an administrator account');
  }
  if (action.userId === adminId && (action.kind === 'user_suspend' || action.kind === 'user_unsuspend')) {
    throw new HttpError(400, 'The Admin Assistant will not prepare suspension actions against your own administrator account');
  }

  if (action.kind === 'user_suspend') return {
    action,
    title: 'Confirm account suspension',
    summary: `Suspend ${target.label}. ${action.reason ? `Reason: ${action.reason}` : 'No custom suspension reason was supplied.'}`,
    impact: ['The account will immediately lose normal BuildPair access.', 'The suspension will be recorded in the existing admin account history.'],
    risk: 'high',
    confirmLabel: 'Suspend account',
  };

  if (action.kind === 'user_unsuspend') return {
    action,
    title: 'Confirm account restoration',
    summary: `Restore BuildPair access for ${target.label}.`,
    impact: ['The suspension flag and suspension reason will be cleared.', 'The account will regain access subject to its normal account permissions.'],
    risk: 'medium',
    confirmLabel: 'Restore account',
  };

  if (action.kind === 'grant_complimentary') {
    const plan = action.tier === 'featured' ? 'BuildPair Pro' : 'BuildPair Plus';
    return {
      action,
      title: `Confirm complimentary ${plan}`,
      summary: `Grant ${target.label} complimentary ${plan} access without creating a subscription charge.`,
      impact: ['The trade profile membership tier will change.', 'The user will receive the existing complimentary-membership notification.', 'No Stripe subscription charge will be created by this action.'],
      risk: 'medium',
      confirmLabel: `Grant ${plan}`,
    };
  }

  return {
    action,
    title: 'Confirm complimentary access removal',
    summary: `Remove complimentary membership access from ${target.label}.`,
    impact: ['The effective membership will fall back to any paid tier on the account, otherwise Free.', 'No paid Stripe subscription will be cancelled by this action.'],
    risk: 'medium',
    confirmLabel: 'Remove complimentary access',
  };
}

export const ADMIN_ASSISTANT_ACTION_INSTRUCTIONS = `
The Admin Assistant can PREPARE the following administrator write actions. It never executes them during the chat response. BuildPair shows a separate confirmation card and executes only after the authenticated administrator explicitly confirms.

Put a machine-readable action marker on one line at the very end of the answer only when the administrator has requested that change:
[[ADMIN_ACTION]]{JSON}[[/ADMIN_ACTION]]

Allowed JSON shapes:
- {"kind":"user_suspend","userId":"...","reason":"..."}
- {"kind":"user_unsuspend","userId":"...","reason":"..."}
- {"kind":"grant_complimentary","userId":"...","tier":"basic|featured","reason":"..."}
- {"kind":"revoke_complimentary","userId":"...","reason":"..."}
- {"kind":"moderation_decision","reportId":"uuid","status":"reviewed|actioned|dismissed","adminNotes":"...","accountAction":"none|warn|suspend|unsuspend","conversationAction":"none|warn|restrict|close|reopen"}

Rules:
- Never claim a proposed action has already happened.
- Use only exact IDs present in live or target context. Never invent an account or report ID.
- If the target is ambiguous, ask the administrator to identify it instead of preparing an action.
- Prepare one state-changing action at a time so the impact can be reviewed clearly.
- Raw passwords, tokens, API keys and secret values are never returned or exposed.
- Account deletion, payment movement/refunds, configuration changes and code/deployment changes require their own dedicated server-side tool before the assistant may execute them. Explain that they are not wired into the confirmation executor yet rather than pretending they are impossible in principle.
`;

export function extractAdminAssistantAction(answer: string) {
  const match = answer.match(/\[\[ADMIN_ACTION\]\]([\s\S]*?)\[\[\/ADMIN_ACTION\]\]\s*$/);
  if (!match) return { cleanAnswer: answer.trim(), action: null as AdminAssistantAction | null };
  const rawAction = match[1];
  if (!rawAction) return { cleanAnswer: answer.trim(), action: null as AdminAssistantAction | null };
  const cleanAnswer = answer.slice(0, match.index ?? answer.length).trim();
  try {
    return { cleanAnswer, action: adminAssistantActionSchema.parse(JSON.parse(rawAction.trim())) };
  } catch {
    return { cleanAnswer: `${cleanAnswer}\n\nI could not safely prepare that action because the proposed action data was invalid. No change was made.`.trim(), action: null as AdminAssistantAction | null };
  }
}
