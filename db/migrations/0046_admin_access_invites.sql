-- Owner-controlled administrator invitations.
-- Invite links contain a random token; only its SHA-256 hash is stored.

CREATE TABLE IF NOT EXISTS admin_access_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  invited_by text REFERENCES users(id) ON DELETE SET NULL,
  accepted_user_id text REFERENCES users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_access_invites_email_idx
  ON admin_access_invites(lower(email), created_at DESC);

CREATE INDEX IF NOT EXISTS admin_access_invites_active_idx
  ON admin_access_invites(expires_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
