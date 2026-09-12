import { createHash, randomBytes } from 'node:crypto';
import { getSql } from '@/lib/sql';
import { ensureLaunchWaitlistTable } from '@/lib/waitlist-store';

let readyPromise: Promise<void> | null = null;

export function hashEarlyAccessToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function createEarlyAccessToken() {
  return randomBytes(32).toString('base64url');
}

export function ensureEarlyAccessInviteTable() {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    await ensureLaunchWaitlistTable();
    const sql = getSql();
    await sql`
      CREATE TABLE IF NOT EXISTS early_access_invites (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        waitlist_id uuid REFERENCES launch_waitlist(id) ON DELETE SET NULL,
        email text NOT NULL UNIQUE,
        audience text NOT NULL DEFAULT 'trader' CHECK (audience IN ('homeowner', 'trader')),
        token_hash text NOT NULL UNIQUE,
        granted_by text,
        granted_at timestamptz NOT NULL DEFAULT now(),
        email_sent_at timestamptz,
        used_at timestamptz,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS early_access_invites_waitlist_idx ON early_access_invites(waitlist_id)`;
    await sql`CREATE INDEX IF NOT EXISTS early_access_invites_active_idx ON early_access_invites(email, revoked_at, used_at)`;
  })().catch((error) => {
    readyPromise = null;
    throw error;
  });
  return readyPromise;
}
