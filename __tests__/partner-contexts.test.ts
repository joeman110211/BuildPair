import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { partnerPlacementIds } from '@/lib/partners-store';

function source(path: string) { return readFileSync(path,'utf8'); }
describe('partner suggestions are optional, contextual and privacy-preserving',()=>{
 it('requires a real active partner and only a fixed context identifier',()=>{
   const endpoint=source('app/api/partners/suggestions+api.ts');
   expect(endpoint).toContain("status = 'live'");
   expect(endpoint).toContain("ANY(placements)");
   expect(endpoint).toContain("AND (ends_on IS NULL");
   expect(endpoint).not.toContain('customerEmail');
   expect(endpoint).not.toContain('jobDescription');
   expect(endpoint).not.toContain('designPrompt');
 });
 it('gates member offers behind server-side plan access',()=>{
   expect(source('app/api/partners/suggestions+api.ts')).toContain("await requireTraderPlanSetupAccess(userId, 'featured'");
   expect(source('app/trader/member-benefits.tsx')).toContain('/api/partners/suggestions?placement=pro-member-benefits');
 });
 it('does not show a suggestion unless a partner actually exists',()=>{
   const comp=source('components/PartnerSuggestion.tsx');
   expect(comp).toContain('if(!enabled||dismissed||!suggestion)return null');
   expect(comp).toContain('Dismiss suggestion');
   expect(comp).toContain('PAID BUILDPAIR PARTNER');
   expect(comp).toContain('sessionStorage');
 });
 it('keeps every placement outside the essential workflow',()=>{
   expect(partnerPlacementIds).toEqual(['trader-after-onboarding','quote-after-send','project-plus-kitchen','project-plus-bathroom','pro-member-benefits']);
   const quote=source('app/trader/quotes/index.tsx');
   expect(quote).toContain('PartnerSuggestion placement="quote-after-send"');
   expect(source('app/trader/quotes/new.tsx')).not.toContain('PartnerSuggestion');
   const studio=source('components/ProjectPlusStudio.tsx');
   expect(studio).toContain("enabled={Boolean(plan || imageUrl)}");
   expect(source('app/trader/dashboard.tsx')).toContain('PartnerSuggestion placement="trader-after-onboarding"');
 });
 it('discloses ads and prevents partner data sharing',()=>{
   const content=source('app/(public)/partners.tsx');
   expect(content).not.toContain('noindex, nofollow');
   expect(content).toContain('clearly marked Ad');
   expect(source('app/api/partners/go+api.ts')).toContain("'Referrer-Policy': 'no-referrer'");
   expect(source('app/(public)/privacy.tsx')).toContain('does not give partner advertisers');
 });
});
