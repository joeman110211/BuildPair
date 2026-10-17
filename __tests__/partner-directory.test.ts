import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';
import { DIRECTORY_PRICE_PENCE,DIRECTORY_CATEGORIES,safeDirectoryLink } from '@/lib/partner-directory';

const src=(path:string)=>readFileSync(path,'utf8');
describe('self-service business directory',()=>{
 it('uses a fixed monthly amount, strictly complementary categories and HTTPS URLs',()=>{
   expect(DIRECTORY_PRICE_PENCE).toBe(2499);
   expect(DIRECTORY_CATEGORIES.length).toBeGreaterThan(5);
   expect(DIRECTORY_CATEGORIES.join(' ')).not.toMatch(/plumbers|builders|roofers|tilers/i);
   expect(safeDirectoryLink('https://shop.example.co.uk/')).toBe('https://shop.example.co.uk/');
   expect(safeDirectoryLink('javascript:alert(1)')).toBeNull();
   expect(safeDirectoryLink('http://example.co.uk')).toBeNull();
 });
 it('never publishes an unapproved or unpaid directory entry',()=>{
   const api=src('app/api/partner-directory+api.ts');
   expect(api).toContain("status IN ('active','cancel_pending')");
   expect(api).toContain('paid_until > now()');
   expect(src('app/api/partner-directory/checkout+api.ts')).toContain("item.status!=='approved'");
   expect(src('app/api/admin/partner-directory+api.ts')).toContain("'pending_review','approved'");
 });
 it('does not allow paid directory listings to become contextual sponsors',()=>{
   const directory=src('lib/partner-directory.ts');
   const suggestions=src('app/api/partners/suggestions+api.ts');
   expect(directory).toContain('buildpair_partner_directory');
   expect(suggestions).toContain('FROM buildpair_partners');
   expect(suggestions).not.toContain('FROM buildpair_partner_directory');
 });
 it('sends applicant access privately and locks text and photos after review',()=>{
   const apply=src('app/api/partner-directory+api.ts');
   const media=src('app/api/partner-directory/images+api.ts');
   expect(apply).toContain('directoryManageUrl(token)');
   expect(apply).toContain('assertRateLimit');
   expect(media).toContain("item.status!=='awaiting_verification'");
   expect(media).toContain("await moderateImage(");
   expect(media).toContain('assertGlobalRateLimit');
 });
 it('keeps renewal, cancellation and immediate removal under owner control',()=>{
   const event=src('app/api/stripe/webhook+api.ts');
   const cancel=src('app/api/partner-directory/manage+api.ts');
   const stripe=src('lib/partner-directory-stripe.ts');
   expect(event).toContain('syncDirectorySubscription(subscription)');
   expect(event).toContain("event.type === 'invoice.paid'");
   expect(cancel).toContain('cancel_at_period_end:true');
   expect(cancel).toContain("status='removed'");
   expect(stripe).toContain("status IN ('removed','rejected','suspended')");
 });
 it('adds public discovery but keeps private management out of indexing',()=>{
   const page=src('app/(public)/partners.tsx');
   expect(page).toContain('Search partners, products or services');
   expect(page).toContain('directoryCategory');
   expect(page).toContain('partners/advertise');
   expect(src('app/(public)/partners/manage.tsx')).toContain('noindex,nofollow');
   expect(src('public/sitemap-pages.xml')).toContain('/partners/advertise');
 });
});
