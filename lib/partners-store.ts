import { getSql } from '@/lib/sql';

let ready: Promise<void> | null = null;
export async function ensurePartnersTables() {
  if (!ready) {
    ready = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS buildpair_partners (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          category text NOT NULL,
          summary text NOT NULL DEFAULT '',
          website_url text NOT NULL,
          logo_url text,
          offer_text text NOT NULL DEFAULT '',
          package text NOT NULL DEFAULT 'local',
          term_months int NOT NULL DEFAULT 6,
          price_pence int NOT NULL DEFAULT 0,
          status text NOT NULL DEFAULT 'draft',
          starts_on date,
          ends_on date,
          click_count int NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT buildpair_partner_status_check CHECK (status IN ('draft','live','paused')),
          CONSTRAINT buildpair_partner_term_check CHECK (term_months IN (6,12))
        )
      `;
      // Backwards-compatible optional campaign settings. Existing sponsors default to
      // directory-only: no contextual placement is enabled automatically.
      await sql`ALTER TABLE buildpair_partners ADD COLUMN IF NOT EXISTS placements text[] NOT NULL DEFAULT '{}'`;
      await sql`ALTER TABLE buildpair_partners ADD COLUMN IF NOT EXISTS placement_level text NOT NULL DEFAULT 'standard'`;
      await sql`ALTER TABLE buildpair_partners ADD COLUMN IF NOT EXISTS member_offer_text text NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE buildpair_partners ADD COLUMN IF NOT EXISTS member_offer_terms text NOT NULL DEFAULT ''`;
      await sql`
        CREATE TABLE IF NOT EXISTS buildpair_partner_enquiries (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          business_name text NOT NULL,
          contact_name text NOT NULL,
          email text NOT NULL,
          category text NOT NULL,
          package text NOT NULL,
          message text NOT NULL DEFAULT '',
          status text NOT NULL DEFAULT 'new',
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT buildpair_partner_enquiry_status CHECK (status IN ('new','contacted','closed'))
        )
      `;
    })().catch((error) => { ready = null; throw error; });
  }
  await ready;
}

export const partnerCategories = ['Trade insurance', 'Trade supplies', 'Property services', 'Interiors & design', 'Tools & equipment', 'Business services', 'Other'] as const;
export const partnerPackages = ['local', 'featured', 'founding'] as const;
export function safePartnerUrl(input: string) {
  try {
    const parsed = new URL(input.trim());
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !parsed.hostname.includes('.') || parsed.hostname === 'localhost') return null;
    return parsed.href;
  } catch { return null; }
}

export const partnerPlacementIds = [
  'trader-after-onboarding',
  'quote-after-send',
  'project-plus-kitchen',
  'project-plus-bathroom',
  'pro-member-benefits',
] as const;
export type PartnerPlacementId = (typeof partnerPlacementIds)[number];
export const partnerPlacementLabels: Record<PartnerPlacementId,string> = {
  'trader-after-onboarding':'After trade onboarding (dashboard)',
  'quote-after-send':'After a quote is sent (quote list)',
  'project-plus-kitchen':'After a kitchen concept or plan',
  'project-plus-bathroom':'After a bathroom concept or plan',
  'pro-member-benefits':'Pro member offers area',
};
export const partnerPlacementLevels = ['standard','featured','exclusive'] as const;
