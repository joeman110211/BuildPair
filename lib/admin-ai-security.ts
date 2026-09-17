import { createHash, randomUUID } from 'node:crypto';
import type { AdminAssistantAction } from '@/lib/admin-assistant-actions';
import { HttpError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const PROPOSAL_TTL_MINUTES = 15;

function normalized(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function directRequestVerb(message: string) {
  const text = normalized(message);
  const verb = '(?:suspend|unsuspend|restore|reactivate|grant|give|revoke|remove|mark|dismiss|action|warn|restrict|close|reopen)';
  return new RegExp(`^(?:please\\s+)?${verb}\\b`).test(text)
    || new RegExp(`\\b(?:can|could|would|will)\\s+you\\s+(?:please\\s+)?${verb}\\b`).test(text)
    || new RegExp(`\\bi\\s+(?:want|need|would\\s+like)\\s+(?:you\\s+)?to\\s+${verb}\\b`).test(text);
}

export function adminMessageExplicitlyRequestsAction(message: string, action: AdminAssistantAction) {
  if (!directRequestVerb(message)) return false;
  const text = normalized(message);

  if (action.kind === 'user_suspend') return /\bsuspend\b/.test(text);
  if (action.kind === 'user_unsuspend') return /\b(?:unsuspend|restore|reactivate)\b/.test(text);
  if (action.kind === 'grant_complimentary') return /\b(?:grant|give)\b/.test(text) && /\b(?:complimentary|free|plus|pro|membership|access)\b/.test(text);
  if (action.kind === 'revoke_complimentary') return /\b(?:revoke|remove)\b/.test(text) && /\b(?:complimentary|free|plus|pro|membership|access)\b/.test(text);
  return /\b(?:mark|dismiss|action|warn|suspend|unsuspend|restore|restrict|close|reopen)\b/.test(text)
    && /\b(?:report|moderation|account|conversation)\b/.test(text);
}

export function adminActionDigest(action: AdminAssistantAction) {
  return createHash('sha256').update(JSON.stringify(action)).digest('hex');
}

export function newAdminActionProposalNonce() {
  return randomUUID();
}

export async function consumeAdminActionProposal(adminId: string, proposalNonce: string, action: AdminAssistantAction) {
  const digest = adminActionDigest(action);
  const rows = await getSql()`
    UPDATE ai_request_logs
    SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('actionConsumedAt', now()::text)
    WHERE id = (
      SELECT id
      FROM ai_request_logs
      WHERE user_id = ${adminId}
        AND endpoint = 'admin-assistant'
        AND status = 'success'
        AND metadata->>'proposalNonce' = ${proposalNonce}
        AND metadata->>'actionDigest' = ${digest}
        AND coalesce(metadata->>'actionConsumedAt', '') = ''
        AND created_at >= now() - interval '15 minutes'
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
    )
    RETURNING id
  ` as unknown as { id: number }[];

  if (!rows.length) {
    throw new HttpError(403, `This Admin Assistant action is not a current, unused proposal. Re-open the assistant and prepare the action again before confirming it.`);
  }

  return { auditLogId: rows[0]!.id, expiresAfterMinutes: PROPOSAL_TTL_MINUTES };
}
