export type AdviceAudience = 'homeowner' | 'tradesperson';

export type AdviceSource = {
  title: string;
  publisher: string;
  url: string;
};

export type AdviceSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type AdviceGuide = {
  slug: string;
  audience: AdviceAudience;
  category: string;
  title: string;
  summary: string;
  description: string;
  appliesTo: string;
  reviewedAt: string;
  keywords: string[];
  keyPoints: string[];
  sections: AdviceSection[];
  sources: AdviceSource[];
  relatedSlugs?: string[];
};

export const ADVICE_GUIDES: AdviceGuide[] = [
  {
    slug: 'how-to-compare-building-quotes',
    audience: 'homeowner',
    category: 'Quotes & hiring',
    title: 'How to compare building quotes properly',
    summary: 'Compare scope, materials, timings and exclusions rather than choosing on price alone.',
    description: 'A practical UK guide to comparing building and home-improvement quotes, including what a written quote should contain.',
    appliesTo: 'UK homeowners; consumer-law details can vary by nation and circumstances.',
    reviewedAt: '2026-10-03',
    keywords: ['compare quotes', 'building quote', 'builder quote', 'estimate', 'fixed price', 'home improvement quote'],
    keyPoints: [
      'Compare like-for-like scope, not just the total price.',
      'A quote is normally a fixed price; an estimate is a rougher indication.',
      'Keep agreed changes in writing before extra work starts where practical.',
      'Check materials, VAT, timings, exclusions and payment stages.',
    ],
    sections: [
      {
        heading: 'Start with the same scope',
        paragraphs: ['Give each tradesperson the same description, drawings, measurements and known constraints. If one quote includes preparation, waste removal or premium materials and another does not, the totals are not directly comparable.'],
      },
      {
        heading: 'What to compare',
        bullets: [
          'The exact work included and excluded.',
          'Materials, brands or allowances and who supplies them.',
          'Start date, expected duration and any dependencies.',
          'Whether VAT is included where applicable.',
          'Payment stages, deposit terms and final payment.',
          'How variations or unforeseen work will be agreed.',
          'Relevant insurance, registrations or certificates for regulated work.',
        ],
      },
      {
        heading: 'Quote or estimate?',
        paragraphs: ['Citizens Advice describes a quote as a promise to do the work at an agreed price, while an estimate is a best guess. If the scope changes, record the change and any price change clearly before the extra work proceeds where practical.'],
      },
    ],
    sources: [
      { title: 'Before you get work done on your home', publisher: 'Citizens Advice', url: 'https://www.citizensadvice.org.uk/consumer/getting-home-improvements-done/before-you-get-work-done-on-your-home/' },
      { title: 'Supplying services', publisher: 'Business Companion', url: 'https://www.businesscompanion.info/en/quick-guides/services/supplying-services-s' },
    ],
    relatedSlugs: ['builder-deposits-and-payment-stages', 'what-to-do-if-building-work-goes-wrong'],
  },
  {
    slug: 'builder-deposits-and-payment-stages',
    audience: 'homeowner',
    category: 'Payments & contracts',
    title: 'Builder deposits and payment stages: what to check',
    summary: 'Understand deposits, staged payments and what should be agreed before money changes hands.',
    description: 'Practical guidance for UK homeowners on builder deposits, upfront payments and staged payment schedules.',
    appliesTo: 'UK homeowners; this is general information, not a fixed legal deposit limit.',
    reviewedAt: '2026-10-03',
    keywords: ['builder deposit', 'pay builder upfront', 'payment stages', 'deposit percentage', 'building work payment'],
    keyPoints: [
      'There is no single universal deposit percentage set for every home-improvement job.',
      'Citizens Advice recommends paying in stages and avoiding large upfront payments where possible.',
      'Its current homeowner guidance suggests trying not to agree to more than 25% as a deposit.',
      'Tie later payments to clear, observable stages and keep receipts.',
    ],
    sections: [
      {
        heading: 'What should be written down',
        bullets: [
          'The deposit amount and what it is for.',
          'Who owns materials bought with the deposit.',
          'The work stage that triggers each later payment.',
          'What evidence shows that a stage is complete.',
          'What happens if the scope changes or the job is delayed.',
          'When the final payment becomes due.',
        ],
      },
      {
        heading: 'About the 25% figure',
        paragraphs: ['Citizens Advice currently advises homeowners to push a deposit down as much as possible and not to agree to more than 25%. Treat that as consumer guidance, not a universal statutory cap: the right arrangement depends on the job, materials, contract and circumstances.'],
      },
      {
        heading: 'Use stages for larger jobs',
        paragraphs: ['Staged payments can reduce risk for both sides when the stages are specific and measurable. Avoid vague triggers such as “halfway through”. A stage such as a defined installation milestone is easier to understand and record.'],
      },
    ],
    sources: [
      { title: 'Before you get work done on your home', publisher: 'Citizens Advice', url: 'https://www.citizensadvice.org.uk/consumer/getting-home-improvements-done/before-you-get-work-done-on-your-home/' },
      { title: 'Problem with building work, decorating or home improvements', publisher: 'Citizens Advice', url: 'https://www.citizensadvice.org.uk/consumer/getting-home-improvements-done/problem-with-home-improvements/' },
    ],
    relatedSlugs: ['how-to-compare-building-quotes', 'what-to-do-if-building-work-goes-wrong'],
  },
  {
    slug: 'what-to-do-if-building-work-goes-wrong',
    audience: 'homeowner',
    category: 'Problems & disputes',
    title: 'What to do if building work goes wrong',
    summary: 'Preserve evidence, raise the problem clearly and understand the basic consumer-rights route.',
    description: 'Steps UK homeowners can take when building, decorating or home-improvement work is defective, incomplete or disputed.',
    appliesTo: 'Consumer rights vary by facts and UK nation. Get individual advice for a real dispute.',
    reviewedAt: '2026-10-03',
    keywords: ['bad builder', 'poor workmanship', 'building dispute', 'unfinished work', 'consumer rights builder', 'defective work'],
    keyPoints: [
      'Keep the quote, contract, invoices, messages, receipts, photos and dates.',
      'Raise the problem with the trader who arranged the work.',
      'Consumer services must generally be performed with reasonable care and skill.',
      'Unsafe work needs urgent specialist or official attention, not just a contractual complaint.',
    ],
    sections: [
      {
        heading: 'Build an evidence record',
        paragraphs: ['Before the facts become harder to reconstruct, gather the written agreement, photographs, payment records, messages and a dated note of what happened. Keep communication factual and specific.'],
      },
      {
        heading: 'Raise the problem clearly',
        paragraphs: ['Explain what you believe is wrong, refer back to the agreed scope and say what outcome you are asking for. Citizens Advice says the trader who arranged the work is the one to raise the problem with even where subcontractors were involved.'],
      },
      {
        heading: 'Reasonable care and skill',
        paragraphs: ['The Consumer Rights Act 2015 includes a term that a trader supplying a service to a consumer must perform it with reasonable care and skill. The remedies and next steps depend on the circumstances, so use current consumer guidance or obtain advice before escalating a significant dispute.'],
      },
    ],
    sources: [
      { title: 'Problem with building work, decorating or home improvements', publisher: 'Citizens Advice', url: 'https://www.citizensadvice.org.uk/consumer/getting-home-improvements-done/problem-with-home-improvements/' },
      { title: 'Consumer Rights Act 2015', publisher: 'GOV.UK', url: 'https://www.gov.uk/government/publications/consumer-rights-act-2015/consumer-rights-act-2015' },
      { title: 'Consumer Rights Act 2015, Part 1 Chapter 4', publisher: 'legislation.gov.uk', url: 'https://www.legislation.gov.uk/ukpga/2015/15/part/1/chapter/4' },
    ],
    relatedSlugs: ['how-to-compare-building-quotes', 'builder-deposits-and-payment-stages'],
  },
  {
    slug: 'do-i-need-building-regulations-approval',
    audience: 'homeowner',
    category: 'Rules & regulations',
    title: 'Do I need Building Regulations approval?',
    summary: 'Planning permission and Building Regulations are different. Some alterations need approval even when planning permission is not required.',
    description: 'A starting guide for UK homeowners checking whether home-improvement work may need Building Regulations approval.',
    appliesTo: 'The approval system differs across England, Wales, Scotland and Northern Ireland.',
    reviewedAt: '2026-10-03',
    keywords: ['building regulations approval', 'building regs', 'planning permission', 'bathroom regulations', 'extension approval'],
    keyPoints: [
      'Building Regulations approval is different from planning permission.',
      'Some alterations, electrical work, windows, roofs and bathroom-related work can trigger requirements.',
      'A registered competent person can self-certify some types of work.',
      'Always check the rules for the UK nation and project in question.',
    ],
    sections: [
      {
        heading: 'Approval can apply to alterations',
        paragraphs: ['GOV.UK lists examples including replacing fuse boxes and connected electrics, installing a bathroom involving plumbing, electrical work near a bath or shower, certain replacement windows and doors, and replacing roof coverings. The exact requirement depends on the work.'],
      },
      {
        heading: 'Competent person schemes',
        paragraphs: ['For certain types of work in England and Wales, an installer registered with an authorised competent person scheme can self-certify compliant work rather than the homeowner making a separate Building Regulations application.'],
      },
      {
        heading: 'Check the right nation',
        paragraphs: ['England, Wales, Scotland and Northern Ireland do not all use the same documents or approval system. Use BuildPair’s UK building-rules page as a starting point, then confirm the current official guidance for the project location.'],
      },
    ],
    sources: [
      { title: 'Building regulations approval: when you need approval', publisher: 'GOV.UK', url: 'https://www.gov.uk/building-regulations-approval' },
      { title: 'Use a competent person scheme', publisher: 'GOV.UK', url: 'https://www.gov.uk/building-regulations-approval/use-a-competent-person-scheme' },
    ],
  },
  {
    slug: 'electrical-work-building-regulations-england',
    audience: 'homeowner',
    category: 'Rules & regulations',
    title: 'Electrical work and Building Regulations in England',
    summary: 'Understand why some domestic electrical work is notifiable and why competence still matters for work that is not.',
    description: 'General guidance on Approved Document P and domestic electrical work in England.',
    appliesTo: 'England only. Wales, Scotland and Northern Ireland use different arrangements.',
    reviewedAt: '2026-10-03',
    keywords: ['part p', 'electrical building regulations', 'notifiable electrical work', 'bathroom electrics', 'new circuit'],
    keyPoints: [
      'Approved Document P covers electrical safety in dwellings in England.',
      'The current official document explains when notification is required.',
      'New circuits, consumer-unit replacement and some work around baths or showers can require notification.',
      'Use a competent electrician and verify registration where a scheme is relied on.',
    ],
    sections: [
      {
        heading: 'What Part P is',
        paragraphs: ['Approved Document P gives statutory guidance supporting the electrical-safety requirements of the Building Regulations in England. It covers design, installation, inspection, testing and information.'],
      },
      {
        heading: 'Notifiable work',
        paragraphs: ['Whether work is notifiable depends on exactly what is being done. Do not assume a small-looking job is automatically outside the rules, particularly around new circuits, consumer units and locations containing a bath or shower.'],
      },
      {
        heading: 'Certificates and notification are different things',
        paragraphs: ['Electrical testing and certification do not automatically replace Building Regulations notification where notification is required. Ask the electrician which certificate and, where relevant, which compliance notification you should receive.'],
      },
    ],
    sources: [
      { title: 'Electrical safety: Approved Document P', publisher: 'GOV.UK', url: 'https://www.gov.uk/government/publications/electrical-safety-approved-document-p' },
      { title: 'Use a competent person scheme', publisher: 'GOV.UK', url: 'https://www.gov.uk/building-regulations-approval/use-a-competent-person-scheme' },
    ],
  },
  {
    slug: 'how-to-check-a-gas-engineer',
    audience: 'homeowner',
    category: 'Safety & credentials',
    title: 'How to check a gas engineer before work starts',
    summary: 'Gas work must be carried out by an appropriately registered Gas Safe engineer. Check the engineer, not just the company name.',
    description: 'How UK homeowners can verify a Gas Safe engineer and why the engineer’s permitted work categories matter.',
    appliesTo: 'UK gas work.',
    reviewedAt: '2026-10-03',
    keywords: ['gas safe', 'check gas engineer', 'gas engineer registration', 'boiler engineer', 'gas work legal'],
    keyPoints: [
      'Gas work carried out as a business must be done by an appropriately Gas Safe registered engineer.',
      'Check the engineer’s ID and registration, not only a logo on a van or website.',
      'The reverse of the Gas Safe ID card shows the categories of gas work the engineer is qualified to do.',
      'Suspected unsafe gas work needs immediate safety action.',
    ],
    sections: [
      {
        heading: 'Verify before work starts',
        paragraphs: ['HSE states that anyone carrying out gas work as part of a business must be competent and registered with the Gas Safe Register. You can check the register and the engineer’s ID card.'],
      },
      {
        heading: 'Check the work category',
        paragraphs: ['Registration alone is not the whole check. An engineer’s Gas Safe ID card records the types of gas work they are qualified to carry out, so make sure the proposed work is covered.'],
      },
      {
        heading: 'If you smell gas',
        paragraphs: ['Treat a suspected gas escape as a safety issue rather than a workmanship dispute. Follow current emergency guidance and do not attempt gas repairs yourself.'],
      },
    ],
    sources: [
      { title: 'Gas appliances: get them checked, keep them safe', publisher: 'Health and Safety Executive', url: 'https://www.hse.gov.uk/pubns/indg238.pdf' },
      { title: 'Gas Safe Register', publisher: 'Gas Safe Register', url: 'https://www.gassaferegister.co.uk/' },
    ],
  },
  {
    slug: 'consumer-law-for-tradespeople',
    audience: 'tradesperson',
    category: 'Running your business',
    title: 'Consumer-law basics for tradespeople',
    summary: 'Clear scope, price, timing and written variations reduce disputes and support your consumer-law obligations.',
    description: 'A practical introduction to UK consumer-law principles relevant to tradespeople supplying home-improvement services.',
    appliesTo: 'UK consumer work; some rules and enforcement routes differ by nation and contract type.',
    reviewedAt: '2026-10-03',
    keywords: ['consumer law tradesperson', 'builder consumer rights', 'reasonable care and skill', 'quote contract', 'trade business law'],
    keyPoints: [
      'Consumer services must be carried out with reasonable care and skill.',
      'If time or price is not fixed, consumer law can imply a reasonable time or reasonable charge.',
      'Do only the work agreed or authorised and record variations clearly.',
      'Do not try to contract out of statutory consumer rights.',
    ],
    sections: [
      {
        heading: 'The basic service obligations',
        paragraphs: ['Business Companion summarises the main Consumer Rights Act service obligations: reasonable care and skill, compliance with information given to the consumer, reasonable time where none is fixed and reasonable charge where none is fixed.'],
      },
      {
        heading: 'Changes during the job',
        paragraphs: ['If the customer changes the work, agree the revised scope and price before proceeding where practical. Written variation records reduce arguments about what was authorised.'],
      },
      {
        heading: 'Keep your paperwork usable',
        bullets: [
          'Describe the work and exclusions clearly.',
          'State whether the figure is a quote or estimate.',
          'Record payment terms and timing.',
          'Confirm customer-requested changes.',
          'Keep evidence of important approvals and handover documents.',
        ],
      },
    ],
    sources: [
      { title: 'Services', publisher: 'Business Companion', url: 'https://www.businesscompanion.info/en/quick-guides/services' },
      { title: 'Supplying services', publisher: 'Business Companion', url: 'https://www.businesscompanion.info/en/quick-guides/services/supplying-services-s' },
      { title: 'Consumer Rights Act 2015', publisher: 'legislation.gov.uk', url: 'https://www.legislation.gov.uk/ukpga/2015/15/part/1/chapter/4' },
    ],
    relatedSlugs: ['off-premises-contracts-and-cancellation-rights', 'cdm-2015-small-builder-duties'],
  },
  {
    slug: 'off-premises-contracts-and-cancellation-rights',
    audience: 'tradesperson',
    category: 'Contracts & customers',
    title: 'Home visits, off-premises contracts and cancellation rights',
    summary: 'Contracts agreed in a customer’s home can trigger specific information and cancellation requirements.',
    description: 'General guidance for UK tradespeople on off-premises consumer contracts, cancellation periods and starting work early.',
    appliesTo: 'Primarily England, Scotland and Wales under the Consumer Contracts Regulations; check current rules and exemptions.',
    reviewedAt: '2026-10-03',
    keywords: ['14 day cooling off', 'off premises contract', 'customer cancellation', 'builder cancellation rights', 'home visit contract'],
    keyPoints: [
      'Distance and off-premises consumer contracts can carry a 14-day cancellation period.',
      'Required pre-contract information must be given correctly.',
      'Starting a service inside the cancellation period needs careful handling and an express consumer request where the rules apply.',
      'Exceptions exist, so do not treat every job identically.',
    ],
    sections: [
      {
        heading: 'Why this matters to trades',
        paragraphs: ['A contract agreed at a customer’s home, online or by phone can fall within the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013. That can create information duties and cancellation rights.'],
      },
      {
        heading: 'Starting work quickly',
        paragraphs: ['Business Companion explains that where cancellation rights apply, a consumer generally has 14 days to cancel and a trader should not begin supplying the service during that period unless the consumer requests this. The precise consequences depend on the contract and work completed.'],
      },
      {
        heading: 'Use the right paperwork',
        paragraphs: ['Do not rely on a generic “no refunds” clause. Use current Business Companion guidance and appropriate contract wording for the way you sell and agree work.'],
      },
    ],
    sources: [
      { title: 'Consumer contracts: distance sales', publisher: 'Business Companion', url: 'https://www.businesscompanion.info/en/quick-guides/distance-sales/consumer-contracts-distance-sales' },
      { title: 'Consumer contracts: general', publisher: 'Business Companion', url: 'https://www.businesscompanion.info/en/quick-guides/consumer-contracts/consumer-contracts-general' },
    ],
    relatedSlugs: ['consumer-law-for-tradespeople', 'cdm-2015-small-builder-duties'],
  },
  {
    slug: 'cdm-2015-small-builder-duties',
    audience: 'tradesperson',
    category: 'Safety & compliance',
    title: 'CDM 2015: what small builders and trades need to know',
    summary: 'CDM duties apply to construction work, including smaller domestic projects, and responsibilities depend on your role.',
    description: 'A starting guide to Construction (Design and Management) Regulations 2015 duties for small builders and tradespeople.',
    appliesTo: 'Great Britain. Northern Ireland has separate construction-design-and-management regulations.',
    reviewedAt: '2026-10-03',
    keywords: ['CDM 2015', 'small builder duties', 'construction health safety', 'principal contractor', 'domestic project'],
    keyPoints: [
      'CDM 2015 sets legal duties for people involved in construction projects.',
      'Duties depend on whether you are a contractor, principal contractor, designer or another dutyholder.',
      'Domestic projects are not automatically outside CDM.',
      'Planning, competence, cooperation and suitable health-and-safety arrangements matter even on small jobs.',
    ],
    sections: [
      {
        heading: 'Small jobs still count',
        paragraphs: ['HSE guidance is specifically aimed at small builders, contractors, subcontractors and self-employed people carrying out construction work. The size of the business does not remove the need to manage health and safety.'],
      },
      {
        heading: 'Know your role',
        paragraphs: ['A project may involve clients, designers, contractors, a principal designer and a principal contractor. Your duties change with the role you hold, so identify that early rather than assuming someone else is responsible.'],
      },
      {
        heading: 'Use HSE guidance as the starting point',
        paragraphs: ['For a real project, use current HSE CDM guidance and project-specific risk information. BuildPair guidance is a signpost, not a replacement for competent health-and-safety advice where the work requires it.'],
      },
    ],
    sources: [
      { title: 'Small builders', publisher: 'Health and Safety Executive', url: 'https://www.hse.gov.uk/construction/areyou/builder.htm' },
      { title: 'Need building work done? A short guide for clients on CDM 2015', publisher: 'Health and Safety Executive', url: 'https://www.hse.gov.uk/pubns/indg411.pdf' },
    ],
    relatedSlugs: ['consumer-law-for-tradespeople', 'off-premises-contracts-and-cancellation-rights'],
  },
  {
    slug: 'bathroom-renovation-cost-uk',
    audience: 'homeowner',
    category: 'Costs & pricing',
    title: 'Bathroom renovation cost in the UK: 2026 price guide',
    summary: 'A realistic planning range for a bathroom renovation, what changes the price and what to compare in quotes.',
    description: 'UK bathroom renovation costs for 2026, including typical project ranges, labour, materials and the factors that push a bathroom budget up or down.',
    appliesTo: 'UK homeowners. Published market estimates vary by specification, region and scope; local quotes are the only reliable project price.',
    reviewedAt: '2026-10-03',
    keywords: ['bathroom renovation cost', 'new bathroom cost uk', 'bathroom remodel cost', 'bathroom fitting cost', 'bathroom price 2026'],
    keyPoints: [
      'Current UK marketplace guides put a standard bathroom project broadly around the mid-thousands, with premium work reaching five figures.',
      'Keeping the existing layout usually costs less than moving plumbing, drainage or electrical points.',
      'Tiling, preparation, sanitaryware, electrics, ventilation and waste removal can all materially change the total.',
      'Use published averages for budgeting only; compare itemised local quotes before committing.',
    ],
    sections: [
      {
        heading: 'What do current UK guides suggest?',
        paragraphs: ['Published 2026 UK marketplace guides vary because they define a “bathroom renovation” differently. MyJobQuote places a standard bathroom installation around £6,000–£8,000 and premium work around £11,000–£15,000. Checkatrade publishes a typical new-bathroom range around £5,500–£8,000, with complex high-end projects reaching £14,000+. Treat these as planning ranges, not a quote.'],
      },
      {
        heading: 'What pushes the price up?',
        bullets: [
          'Moving the WC, basin, bath or shower and rerouting services.',
          'Large-format, patterned, natural-stone or premium tiles.',
          'Extensive wall and floor preparation after strip-out.',
          'New lighting, ventilation, electric shower work or other electrical changes.',
          'Bespoke furniture, screens, niches, underfloor heating or high-end sanitaryware.',
          'Difficult access, hidden damage, waste disposal and regional labour costs.',
        ],
      },
      {
        heading: 'How to compare bathroom quotes',
        paragraphs: ['Ask each contractor to price the same scope and make clear what is included: strip-out, disposal, preparation, waterproofing where required, plumbing, electrical work, tiling, decorating, sanitaryware fitting, silicone and final making-good. A lower total can simply mean more items are excluded.'],
      },
      {
        heading: 'How BuildPair will improve this over time',
        paragraphs: ['BuildPair does not yet have enough completed quote data to publish a proprietary bathroom-cost average. As the marketplace grows, we intend to add anonymised BuildPair quote ranges by region and project type instead of pretending a national average fits every job.'],
      },
    ],
    sources: [
      { title: 'New bathroom costs in the UK: 2026', publisher: 'MyJobQuote', url: 'https://www.myjobquote.co.uk/costs/full-bathroom-cost' },
      { title: 'Bathroom renovation cost in 2026', publisher: 'Checkatrade', url: 'https://www.checkatrade.com/blog/cost-guides/bathroom-remodel-cost/' },
      { title: 'Bathroom fitter costs in the UK in 2026', publisher: 'Checkatrade', url: 'https://www.checkatrade.com/blog/cost-guides/bathroom-fitter-costs/' },
    ],
    relatedSlugs: ['bathroom-fitter-cost-uk', 'bathroom-tiling-cost-uk', 'shower-installation-cost-uk', 'how-to-compare-building-quotes'],
  },
  {
    slug: 'bathroom-fitter-cost-uk',
    audience: 'homeowner',
    category: 'Costs & pricing',
    title: 'Bathroom fitter cost in the UK: day rates and labour in 2026',
    summary: 'Understand bathroom fitter day rates, project labour and why one quote can look very different from another.',
    description: 'Typical UK bathroom fitter costs in 2026, including labour ranges, day rates and the work that may or may not be included.',
    appliesTo: 'UK homeowners. Rates vary significantly by region, experience, scope and whether specialist trades are included.',
    reviewedAt: '2026-10-03',
    keywords: ['bathroom fitter cost', 'bathroom fitter day rate', 'bathroom labour cost', 'bathroom installer cost', 'bathroom fitter price'],
    keyPoints: [
      'Published UK guidance currently places bathroom-fitter day rates roughly in the £320–£480 range in one major 2026 guide.',
      'Full labour for a bathroom installation is often quoted as a project rather than simply days multiplied by a rate.',
      'Check whether plumbing, tiling, electrical work, preparation and waste removal are included.',
      'A single “day rate” is a poor comparison if the scope differs.',
    ],
    sections: [
      {
        heading: 'Typical published rates',
        paragraphs: ['Checkatrade’s 2026 bathroom-fitter guide publishes an average day-rate range of roughly £320–£480 and project labour around £1,500–£3,000. Those figures are useful for orientation, but a real bathroom quote can sit outside them depending on location, specification and how many separate trades are needed.'],
      },
      {
        heading: 'What a bathroom fitter may include',
        bullets: [
          'Removal of the existing suite and basic strip-out.',
          'Plumbing and sanitaryware installation.',
          'Coordination of electrical work where a separate electrician is required.',
          'Wall and floor preparation.',
          'Tiling or coordination with a tiler.',
          'Sealing, finishing and handover.',
        ],
      },
      {
        heading: 'Questions to ask before comparing labour',
        paragraphs: ['Ask whether the quote is fixed for the described scope, what happens if hidden defects appear, whether VAT is included where applicable, who supplies materials and which specialist trades are included. Two quotes that use the same headline “labour” figure can still cover very different work.'],
      },
    ],
    sources: [
      { title: 'Bathroom fitter costs in the UK in 2026', publisher: 'Checkatrade', url: 'https://www.checkatrade.com/blog/cost-guides/bathroom-fitter-costs/' },
      { title: 'New bathroom costs in the UK: 2026', publisher: 'MyJobQuote', url: 'https://www.myjobquote.co.uk/costs/full-bathroom-cost' },
    ],
    relatedSlugs: ['bathroom-renovation-cost-uk', 'bathroom-tiling-cost-uk', 'how-to-compare-building-quotes'],
  },
  {
    slug: 'tiler-cost-per-square-metre-uk',
    audience: 'homeowner',
    category: 'Costs & pricing',
    title: 'Tiler cost per square metre in the UK: 2026 guide',
    summary: 'See why tiling labour can vary widely per m² and when a day rate or fixed price makes more sense.',
    description: 'UK tiler labour costs per square metre in 2026, including day-rate ranges, complexity factors and how to compare tiling quotes.',
    appliesTo: 'UK homeowners. Rates are indicative only and can vary materially by tile, substrate, layout, location and job size.',
    reviewedAt: '2026-10-03',
    keywords: ['tiler cost per m2', 'tiler price per square metre', 'tiling labour cost uk', 'tiler day rate', 'tile fitting cost'],
    keyPoints: [
      'Current published guides show a wide labour range rather than one reliable national per-m² price.',
      'Simple open floors are usually quicker than bathrooms, patterns, mosaics, niches or awkward cutting.',
      'Preparation and waterproofing are often separate from the laying rate.',
      'Small jobs are commonly priced as a minimum charge or day rate rather than pure square metres.',
    ],
    sections: [
      {
        heading: 'What do current 2026 guides publish?',
        paragraphs: ['Checkatrade currently uses about £50 per m² as an average labour-only figure and a tiler day-rate range around £200–£350. MyJobQuote publishes bathroom-tiling labour around £20–£40 per m² and lower floor-tiling day rates in some examples. The gap is exactly why a single national “price per metre” should never be treated as a quote.'],
      },
      {
        heading: 'Why tiling prices vary',
        bullets: [
          'Tile size, material and fragility.',
          'Straight lay versus herringbone, diagonal or patterned layouts.',
          'Number of corners, reveals, niches, trims and penetrations.',
          'Condition and flatness of the walls or floor.',
          'Waterproofing, decoupling or levelling work before tiling.',
          'Small-area minimum charges and travel.',
          'London and South East labour costs versus lower-cost regions.',
        ],
      },
      {
        heading: 'What should a tiling quote state?',
        paragraphs: ['A useful quote separates preparation, waterproofing where applicable, tile laying, trims, adhesive and grout, silicone, waste removal and any materials supplied by the tiler. That makes it far easier to compare than a bare “£X per m²” number.'],
      },
    ],
    sources: [
      { title: 'Tiling cost in 2026', publisher: 'Checkatrade', url: 'https://www.checkatrade.com/blog/cost-guides/tiling-cost/' },
      { title: 'Bathroom tiling cost guide 2026', publisher: 'MyJobQuote', url: 'https://www.myjobquote.co.uk/costs/tiling-a-bathroom' },
      { title: 'Floor tiling cost guide 2026', publisher: 'MyJobQuote', url: 'https://www.myjobquote.co.uk/costs/tiling-a-floor' },
    ],
    relatedSlugs: ['bathroom-tiling-cost-uk', 'floor-tiling-cost-uk', 'bathroom-renovation-cost-uk'],
  },
  {
    slug: 'bathroom-tiling-cost-uk',
    audience: 'homeowner',
    category: 'Costs & pricing',
    title: 'Bathroom tiling cost in the UK: 2026 guide',
    summary: 'Budget for bathroom wall and floor tiling, including labour, preparation and the tile choices that change the price.',
    description: 'Typical UK bathroom tiling costs in 2026, including labour per m², full-room estimates, preparation and tile-price factors.',
    appliesTo: 'UK homeowners. Published ranges are indicative and vary by bathroom size, preparation, tile type and region.',
    reviewedAt: '2026-10-03',
    keywords: ['bathroom tiling cost', 'cost to tile bathroom', 'bathroom tiler cost', 'tile bathroom price', 'bathroom tiling per m2'],
    keyPoints: [
      'Published 2026 guides currently place many bathroom-tiling jobs in the high hundreds to low thousands.',
      'Preparation can cost as much time as laying tiles when walls or floors are poor.',
      'Mosaics, patterns and large-format tiles can all increase labour for different reasons.',
      'Ask whether waterproofing, trims, adhesive, grout and silicone are included.',
    ],
    sections: [
      {
        heading: 'Typical published ranges',
        paragraphs: ['MyJobQuote currently says many UK homeowners pay around £500–£800 for bathroom tiling, while Checkatrade gives around £800–£1,200 for fully tiling bathroom walls and floors. Different room sizes and assumptions explain much of that gap. For a real budget, measure the actual tiled area and get itemised quotes.'],
      },
      {
        heading: 'Walls, floors and shower areas are not equal',
        paragraphs: ['A small floor may be quick, while walls around baths, windows, niches and pipework create far more cutting. Shower areas also need careful substrate preparation and, where required, an appropriate waterproofing system before tiles are installed.'],
      },
      {
        heading: 'Main cost drivers',
        bullets: [
          'Total tiled area and ceiling height.',
          'Removal of old tiles and making good.',
          'Wall or floor levelling and repairs.',
          'Tile material, format and pattern.',
          'Waterproofing and movement-management systems where required.',
          'Trims, mitres, niches, shelves and feature layouts.',
        ],
      },
    ],
    sources: [
      { title: 'Bathroom tiling cost guide 2026', publisher: 'MyJobQuote', url: 'https://www.myjobquote.co.uk/costs/tiling-a-bathroom' },
      { title: 'Tiling cost in 2026', publisher: 'Checkatrade', url: 'https://www.checkatrade.com/blog/cost-guides/tiling-cost/' },
    ],
    relatedSlugs: ['tiler-cost-per-square-metre-uk', 'floor-tiling-cost-uk', 'bathroom-renovation-cost-uk'],
  },
  {
    slug: 'floor-tiling-cost-uk',
    audience: 'homeowner',
    category: 'Costs & pricing',
    title: 'Floor tiling cost in the UK: 2026 price guide',
    summary: 'Estimate floor-tiling costs by room size, tile choice and preparation rather than relying on one headline rate.',
    description: 'UK floor tiling costs in 2026, including typical project ranges, labour, tile materials and preparation costs.',
    appliesTo: 'UK homeowners. Prices vary by substrate, tile, pattern, access, room size and region.',
    reviewedAt: '2026-10-03',
    keywords: ['floor tiling cost', 'cost to tile floor', 'floor tiler cost', 'tile floor price per m2', 'kitchen floor tiling cost'],
    keyPoints: [
      'MyJobQuote currently publishes an average floor-tiling project around £700, with many jobs roughly £400–£1,000.',
      'Material costs can vary far more than the labour rate.',
      'Levelling, decoupling and removal of old flooring can materially increase the price.',
      'Large simple areas can be cheaper per m² than tiny awkward rooms.',
    ],
    sections: [
      {
        heading: 'Published 2026 planning figures',
        paragraphs: ['MyJobQuote currently gives an average floor-tiling project around £700 and a rough £400–£1,000 range depending on room size and tile. Checkatrade uses about £50 per m² as an average labour-only tiling figure. Use these only to sense-check a budget; actual preparation and tile choice can move the result substantially.'],
      },
      {
        heading: 'Preparation matters',
        paragraphs: ['A quoted laying rate often assumes a suitable flat, sound surface. Removal, repairs, levelling compounds, timber-floor preparation or decoupling systems can add both labour and materials before the first tile is laid.'],
      },
      {
        heading: 'What to ask a tiler',
        bullets: [
          'Is removal of the existing floor included?',
          'Is levelling or substrate preparation included?',
          'Who supplies adhesive, grout, trims and movement profiles?',
          'Is the layout straight, diagonal or patterned?',
          'Are doorways, appliances, skirting or thresholds included?',
        ],
      },
    ],
    sources: [
      { title: 'Floor tiling cost guide 2026', publisher: 'MyJobQuote', url: 'https://www.myjobquote.co.uk/costs/tiling-a-floor' },
      { title: 'Tiling cost in 2026', publisher: 'Checkatrade', url: 'https://www.checkatrade.com/blog/cost-guides/tiling-cost/' },
    ],
    relatedSlugs: ['tiler-cost-per-square-metre-uk', 'bathroom-tiling-cost-uk'],
  },
  {
    slug: 'shower-installation-cost-uk',
    audience: 'homeowner',
    category: 'Costs & pricing',
    title: 'Shower installation cost in the UK: 2026 guide',
    summary: 'Compare the cost of replacing a shower with a larger shower-area renovation involving plumbing, electrics and tiling.',
    description: 'Typical UK shower installation costs in 2026, including replacement showers, walk-in showers, plumbing, electrical work and tiling.',
    appliesTo: 'UK homeowners. Electrical and Building Regulations requirements depend on the work and UK nation.',
    reviewedAt: '2026-10-03',
    keywords: ['shower installation cost', 'cost to fit shower', 'new shower cost uk', 'walk in shower cost', 'replace shower cost'],
    keyPoints: [
      'Published 2026 guidance puts many standard shower supply-and-install jobs broadly between a few hundred pounds and around £1,500.',
      'A full shower-area remodel can cost much more once the tray, enclosure, tiling and preparation are included.',
      'Walk-in showers and wet rooms are different projects with different drainage and waterproofing requirements.',
      'Electrical shower work needs appropriate electrical competence and may involve Building Regulations notification.',
    ],
    sections: [
      {
        heading: 'Replacement shower versus full shower remodel',
        paragraphs: ['Checkatrade’s current 2026 guide gives a broad £300–£1,500 range for supplying and installing a new shower, depending on shower type and complexity. That does not mean a complete shower-area renovation with tray, enclosure, wall preparation and tiling will fit inside the same range.'],
      },
      {
        heading: 'What changes the cost?',
        bullets: [
          'Electric, mixer, power, thermostatic or digital shower type.',
          'Whether hot/cold supplies or drainage need changing.',
          'New tray, enclosure, screens or wall panels.',
          'Removing a bath or changing the room layout.',
          'Electrical circuit or protection changes.',
          'Tiling, waterproofing and making good.',
        ],
      },
      {
        heading: 'Check the regulated work separately',
        paragraphs: ['If electrical work is required, use a competent electrician and confirm whether the work is notifiable under the rules that apply where the property is located. Do not assume a plumbing quote automatically covers electrical compliance.'],
      },
    ],
    sources: [
      { title: 'Shower installation cost breakdown 2026', publisher: 'Checkatrade', url: 'https://www.checkatrade.com/blog/cost-guides/shower-installation-cost/' },
      { title: 'Electrical safety: Approved Document P', publisher: 'GOV.UK', url: 'https://www.gov.uk/government/publications/electrical-safety-approved-document-p' },
    ],
    relatedSlugs: ['bathroom-renovation-cost-uk', 'bathroom-tiling-cost-uk', 'electrical-work-building-regulations-england', 'wet-room-cost-uk'],
  },
  {
    slug: 'wet-room-cost-uk',
    audience: 'homeowner',
    category: 'Costs & pricing',
    title: 'Wet room cost in the UK: 2026 guide',
    summary: 'Wet rooms cost more than a simple shower swap because drainage, waterproofing and floor construction all matter.',
    description: 'Typical UK wet-room installation costs in 2026, including waterproofing, drainage, floor preparation and the factors that affect price.',
    appliesTo: 'UK homeowners. Structural, drainage, electrical and Building Regulations requirements depend on the property and location.',
    reviewedAt: '2026-10-03',
    keywords: ['wet room cost', 'wet room installation cost uk', 'cost to install wet room', 'wetroom price', 'disabled wet room cost'],
    keyPoints: [
      'A wet room is a construction and waterproofing project, not just a shower without a tray.',
      'Current published guidance gives a very broad range because floor structure, drainage and specification vary heavily.',
      'Upstairs timber floors and major drainage changes can add complexity.',
      'The quote should state exactly what waterproofing, floor preparation, drainage and tiling are included.',
    ],
    sections: [
      {
        heading: 'Typical published range',
        paragraphs: ['Checkatrade’s current 2026 guide places wet-room installation broadly around £5,000–£13,000, with an average figure around £9,000. That is a planning estimate only: smaller straightforward rooms and major structural alterations can sit outside it.'],
      },
      {
        heading: 'Why wet rooms can cost more',
        bullets: [
          'Falls to drainage need to be created accurately.',
          'The floor may need strengthening or specialist former systems.',
          'Waterproofing must be designed as a complete system.',
          'More of the room may be tiled than in a standard shower enclosure.',
          'Ventilation, electrics and accessibility details may add specialist work.',
        ],
      },
      {
        heading: 'What to see in the quote',
        paragraphs: ['Look for separate detail on strip-out, floor construction, drainage changes, waterproofing system, tiling, sanitaryware, screens, ventilation and electrical work. “Wet room installation” is too vague on its own for a meaningful comparison.'],
      },
    ],
    sources: [
      { title: 'Wet room installation costs in the UK in 2026', publisher: 'Checkatrade', url: 'https://www.checkatrade.com/blog/cost-guides/wet-room-installation-cost/' },
      { title: 'Building regulations approval', publisher: 'GOV.UK', url: 'https://www.gov.uk/building-regulations-approval' },
    ],
    relatedSlugs: ['shower-installation-cost-uk', 'bathroom-renovation-cost-uk', 'bathroom-tiling-cost-uk', 'do-i-need-building-regulations-approval'],
  },

];

export function adviceGuideBySlug(slug: string) {
  return ADVICE_GUIDES.find((guide) => guide.slug === slug);
}

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9£%]+/g, ' ').trim();
}

export function searchAdviceGuides(query: string, audience?: AdviceAudience | 'all') {
  const trimmed = normalise(query);
  const candidates = audience && audience !== 'all'
    ? ADVICE_GUIDES.filter((guide) => guide.audience === audience)
    : ADVICE_GUIDES;

  if (!trimmed) return candidates;

  const terms = trimmed.split(/\s+/).filter(Boolean);
  return candidates
    .map((guide) => {
      const title = normalise(guide.title);
      const summary = normalise(guide.summary);
      const category = normalise(guide.category);
      const keywords = normalise(guide.keywords.join(' '));
      const sections = normalise(guide.sections.map((section) => section.heading).join(' '));
      let score = 0;
      if (title.includes(trimmed)) score += 18;
      if (keywords.includes(trimmed)) score += 14;
      for (const term of terms) {
        if (title.includes(term)) score += 6;
        if (keywords.includes(term)) score += 5;
        if (summary.includes(term)) score += 3;
        if (category.includes(term)) score += 2;
        if (sections.includes(term)) score += 1;
      }
      return { guide, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.guide.title.localeCompare(b.guide.title))
    .map((item) => item.guide);
}

export function adviceAudienceLabel(audience: AdviceAudience) {
  return audience === 'homeowner' ? 'For homeowners' : 'For tradespeople';
}
