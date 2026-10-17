import type { AdviceGuide } from '@/lib/advice-library';

// Practical guidance for the new Partners programme. Kept out of sitemaps and
// marked noindex until the full partnership experience has been approved.
export const PARTNERSHIP_ADVICE_GUIDES: AdviceGuide[] = [
  {
    slug: 'choosing-buildpair-partner-services',
    audience: 'homeowner',
    category: 'Planning & choosing services',
    title: 'Using BuildPair partners when planning home improvements',
    summary: 'How to judge optional supplier, insurance and design offers without letting an advert make the decision for you.',
    description: 'A practical guide to BuildPair commercial partner advertisements, independent comparisons and choosing suitable products and design services for UK home projects.',
    appliesTo: 'UK homeowners considering outside suppliers or specialist services alongside a building project.',
    reviewedAt: '2026-10-17',
    keywords: ['BuildPair partners', 'sponsored partners', 'kitchen design', 'interior designer', 'renovation supplier', 'advertisements', 'partner offer'],
    keyPoints: [
      'Commercial partner placements are advertising, not independent BuildPair endorsements.',
      'Compare the total price, specifications, timescales, returns, warranties and other providers before committing.',
      'A paid sponsor does not automatically receive your project details or get appointed to your job.',
      'Any offers or discounts must be checked with the provider; none is guaranteed simply because it appears on BuildPair.'
    ],
    sections: [
      {
        heading: 'Why partner services might be useful',
        paragraphs: [
          'A renovation often needs more than the work carried out by a tradesperson. You might want kitchen planning, interior design, flooring, materials or a specialist supplier. BuildPair may display businesses offering these services so you can explore options alongside your project.',
          'These are optional third-party services. You do not need to use a partner to post a job, ask for quotes or use BuildPair project tools.'
        ]
      },
      {
        heading: 'Spot the difference between advertising and advice',
        paragraphs: [
          'A listing marked as a paid commercial partner, Ad or sponsored placement has been paid for or forms part of a commercial arrangement. It does not mean BuildPair has independently assessed that business as the best provider, or that its products or prices are better than competitors.',
          'BuildPair Advice Hub articles should remain impartial even where they discuss topics that sponsors sell. If a particular advert or affiliate link appears alongside a guide, it should be identified clearly as advertising.'
        ]
      },
      {
        heading: 'Check before choosing a supplier or designer',
        bullets: [
          'Compare at least two suitable options where practical, including firms that are not BuildPair partners.',
          'Ask what the price includes: measuring, design revisions, delivery, installation, VAT and aftercare.',
          'Check lead times and who is responsible if items arrive damaged, late or incorrectly specified.',
          'Ask who coordinates dimensions and installation with your tradesperson.',
          'Check returns, cancellation terms, warranties and any required deposit before paying.',
          'Keep the supplier or designer agreement separate and clear from your building contract.'
        ]
      },
      {
        heading: 'Your project information stays yours',
        paragraphs: [
          'Simply viewing partner advertisements does not send your job description or private address to an advertiser. If BuildPair later offers an optional referral to a provider, it should say what information would be shared and seek the required agreement before the referral happens.',
          'A partner link normally opens the provider’s own website. Check its terms and privacy policy before sharing personal information there.'
        ]
      }
    ],
    sources: [
      { title: 'Before you get work done on your home', publisher: 'Citizens Advice', url: 'https://www.citizensadvice.org.uk/consumer/getting-home-improvements-done/before-you-get-work-done-on-your-home/' },
      { title: 'Online Affiliate Marketing', publisher: 'ASA / CAP', url: 'https://www.asa.org.uk/advice-online/affiliate-marketing.html' }
    ],
    relatedSlugs: ['how-to-compare-building-quotes', 'builder-deposits-and-payment-stages']
  },
  {
    slug: 'comparing-trade-supplier-discounts',
    audience: 'tradesperson',
    category: 'Running a trade business',
    title: 'How tradespeople can compare supplier discounts and partner offers',
    summary: 'Check whether a trade deal genuinely saves money before you recommend products to a customer or build them into a quote.',
    description: 'A UK tradesperson guide to comparing trade materials prices, member deals, supplier discounts and sponsored partner offers fairly.',
    appliesTo: 'UK tradespeople comparing supplier prices, paid promotions and possible future BuildPair member benefits.',
    reviewedAt: '2026-10-17',
    keywords: ['trade discounts', 'BuildPair Pro offers', 'partner benefits', 'supplier pricing', 'materials quote', 'trade insurance', 'members discounts', 'trade savings'],
    keyPoints: [
      'A promoted supplier is not automatically the cheapest or best fit for the job.',
      'Compare real delivered prices including VAT treatment, availability, specification and returns.',
      'Customer quotes should reflect the actual agreed scope, supply responsibility and materials pricing.',
      'Potential Pro-member partner discounts should only be described as available after a verified agreement is published.'
    ],
    sections: [
      {
        heading: 'Check the price that matters',
        paragraphs: [
          'A large percentage discount can still produce a worse deal than another supplier’s ordinary trade price. Compare equivalent products, availability, collection or delivery charges, waste allowances, credit terms and the price you will actually pay.',
          'Keep VAT treatment clear: what you can reclaim depends on your business’s VAT status and the purchase. Avoid comparing an ex-VAT promotional price with an inc-VAT retail price.'
        ]
      },
      {
        heading: 'Think about the full job',
        bullets: [
          'Confirm the product meets the specification and any relevant manufacturer or installation requirements.',
          'Allow for delivery reliability, lead times, damaged materials and returns.',
          'Check guarantees and after-sales support, especially for bathrooms and kitchens.',
          'Do not substitute a cheaper product for an agreed specification without discussing it with the customer.',
          'Make clear in your quote whether materials are supplied by you, the homeowner or a third party.'
        ]
      },
      {
        heading: 'How BuildPair commercial partnerships work',
        paragraphs: [
          'BuildPair may host labelled paid partner listings or negotiated offers. The commercial relationship should be visible rather than disguised as independent guidance. Clicking a listing may take you to the advertiser’s website and its own terms.',
          'A dedicated member discount page or Pro-only offers should not be treated as an included benefit until partners have agreed actual discounts, eligibility rules and expiry dates. BuildPair may add this capability later, but there is no promise of particular savings now.'
        ]
      },
      {
        heading: 'Keep customer recommendations professional',
        paragraphs: [
          'It is reasonable to suggest a supplier you trust, but tell a homeowner when a suggestion involves a commercial incentive or referral arrangement. Keep alternatives open and do not make a homeowner feel a partner purchase is required to hire you.',
          'When insurance is involved, check that a policy genuinely fits the work and read the insurer’s documents. Do not treat a paid advert as independent financial or insurance advice.'
        ]
      }
    ],
    sources: [
      { title: 'Get yourself affiliated with the rules on affiliate marketing', publisher: 'ASA / CAP', url: 'https://www.asa.org.uk/news/get-yourself-affiliated-with-the-rules-on-affiliate-marketing.html' },
      { title: 'Claim back VAT on purchases', publisher: 'GOV.UK', url: 'https://www.gov.uk/reclaim-vat' }
    ],
    relatedSlugs: ['trade-materials-ordering-and-customer-supply', 'trade-quote-inclusions-exclusions-checklist']
  }
];