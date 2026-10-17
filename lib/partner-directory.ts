import { createHash, randomBytes } from 'node:crypto';
import { getSql } from '@/lib/sql';
import { HttpError } from '@/lib/server';

let tablePromise: Promise<void> | null = null;
export const DIRECTORY_PRICE_PENCE = 2499;
export const DIRECTORY_CATEGORIES = [
  'Building materials & supplies', 'Tools, equipment & workwear', 'Interior design & showrooms',
  'Vans, vehicle hire & fleet', 'Plant, site equipment & skips', 'Home products & appliances',
  'Property & surveying services', 'Trade training & qualifications', 'Business & professional services',
] as const;
export type DirectoryCategory = typeof DIRECTORY_CATEGORIES[number];
export function newDirectoryToken() { return randomBytes(32).toString('hex'); }
export function directoryTokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
export function verifyDirectoryToken(token: string) {
  if (!/^[0-9a-f]{64}$/i.test(token)) throw new HttpError(403,'This secure access link is invalid.');
  return directoryTokenHash(token);
}
export function safeDirectoryLink(raw: string) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && !url.username && !url.password && url.hostname.includes('.') && url.hostname !== 'localhost' ? url.toString() : null;
  } catch { return null; }
}
export async function ensureDirectoryTable() {
  if (!tablePromise) tablePromise = (async () => {
    const sql = getSql();
    await sql`
      CREATE TABLE IF NOT EXISTS buildpair_partner_directory (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_name text NOT NULL,
        contact_name text NOT NULL,
        contact_email text NOT NULL,
        category text NOT NULL,
        description text NOT NULL,
        website_url text NOT NULL,
        logo_url text,
        image_urls text[] NOT NULL DEFAULT '{}',
        status text NOT NULL DEFAULT 'awaiting_verification'
          CHECK (status IN ('awaiting_verification','pending_review','approved','active','cancel_pending','payment_issue','suspended','rejected','removed')),
        management_hash text NOT NULL UNIQUE,
        stripe_customer_id text,
        stripe_subscription_id text UNIQUE,
        checkout_session_id text,
        paid_until timestamptz,
        cancelled_at timestamptz,
        reviewed_at timestamptz,
        admin_notes text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS partner_directory_public_idx ON buildpair_partner_directory(category,status,paid_until)`;
    await sql`CREATE INDEX IF NOT EXISTS partner_directory_stripe_idx ON buildpair_partner_directory(stripe_subscription_id)`;
  })().catch(err => {tablePromise=null;throw err;});
  await tablePromise;
}
export async function getDirectoryByToken(token: string) {
  const hash = verifyDirectoryToken(token);
  await ensureDirectoryTable();
  const rows = await getSql()`
    SELECT id, business_name AS "businessName", category, description,
    website_url AS "websiteUrl", logo_url AS "logoUrl", image_urls AS "imageUrls",
    status, contact_email AS "contactEmail", stripe_subscription_id AS "subscriptionId",
    stripe_customer_id AS "customerId", paid_until AS "paidUntil", checkout_session_id AS "checkoutSessionId"
    FROM buildpair_partner_directory WHERE management_hash=${hash} LIMIT 1
  ` as {id:string;businessName:string;category:string;description:string;websiteUrl:string;logoUrl:string|null;imageUrls:string[];status:string;contactEmail:string;subscriptionId:string|null;customerId:string|null;paidUntil:string|null;checkoutSessionId:string|null}[];
  if (!rows[0]) throw new HttpError(403,'This secure listing link is invalid or no longer available.');
  return rows[0];
}
export async function sendDirectoryEmail(to: string, subject: string, body: string) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new HttpError(503,'Email delivery is temporarily unavailable.');
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({
    from:process.env.INVOICE_FROM_EMAIL?.trim() || 'BuildPair <info@buildpair.co.uk>',
    to:[to],reply_to:'info@buildpair.co.uk',subject,text:body
  })});
  if(!r.ok)throw new HttpError(503,'Email could not be sent. Please try again or contact BuildPair.');
}
export function directoryManageUrl(token:string) {
  return `https://www.buildpair.co.uk/partners/manage?token=${encodeURIComponent(token)}`;
}
