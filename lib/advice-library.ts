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
        paragraphs: ['Published 2026 UK marketplace guides vary because they define a “bathroom renovation” differently. Current market guidance places standard bathroom installations broadly in the mid-thousands, while premium and complex projects can reach five figures. Treat these as planning ranges, not a quote.'],
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
        paragraphs: ['Current 2026 UK market guidance publishes an average day-rate range of roughly £320–£480 and project labour around £1,500–£3,000. Those figures are useful for orientation, but a real bathroom quote can sit outside them depending on location, specification and how many separate trades are needed.'],
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
        paragraphs: ['Current UK market guidance uses about £50 per m² as an average labour-only figure and a tiler day-rate range around £200–£350. Another current UK market guide publishes bathroom-tiling labour around £20–£40 per m² and lower floor-tiling day rates in some examples. The gap is exactly why a single national “price per metre” should never be treated as a quote.'],
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
        paragraphs: ['Current UK market guidance suggests many UK homeowners pay around £500–£800 for bathroom tiling, while Another current UK market guide gives around £800–£1,200 for fully tiling bathroom walls and floors. Different room sizes and assumptions explain much of that gap. For a real budget, measure the actual tiled area and get itemised quotes.'],
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
      'Current UK market guidance puts an average floor-tiling project around £700, with many jobs roughly £400–£1,000.',
      'Material costs can vary far more than the labour rate.',
      'Levelling, decoupling and removal of old flooring can materially increase the price.',
      'Large simple areas can be cheaper per m² than tiny awkward rooms.',
    ],
    sections: [
      {
        heading: 'Published 2026 planning figures',
        paragraphs: ['Current UK market guidance gives an average floor-tiling project around £700 and a rough £400–£1,000 range depending on room size and tile. Checkatrade uses about £50 per m² as an average labour-only tiling figure. Use these only to sense-check a budget; actual preparation and tile choice can move the result substantially.'],
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
        paragraphs: ['Current 2026 UK market guidance gives a broad £300–£1,500 range for supplying and installing a new shower, depending on shower type and complexity. That does not mean a complete shower-area renovation with tray, enclosure, wall preparation and tiling will fit inside the same range.'],
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
        paragraphs: ['Current 2026 UK market guidance places wet-room installation broadly around £5,000–£13,000, with an average figure around £9,000. That is a planning estimate only: smaller straightforward rooms and major structural alterations can sit outside it.'],
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
{
    "slug": "plumber-cost-uk-2026",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Plumber cost in the UK: hourly and day rates for 2026",
    "summary": "Plan for plumber hourly rates, day rates, call-out fees and common small-job pricing before requesting quotes.",
    "description": "Typical UK plumber costs in 2026, including hourly rates, day rates, call-out fees and common plumbing jobs.",
    "appliesTo": "UK homeowners. Actual rates vary by region, urgency, business size and job complexity.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "plumber cost",
      "plumber hourly rate",
      "plumber day rate",
      "plumbing cost uk",
      "plumber prices 2026"
    ],
    "keyPoints": [
      "Current UK guidance puts standard plumber rates around £40–£60 per hour, with an average near £50.",
      "A typical published day rate is around £350.",
      "Emergency and out-of-hours work costs materially more and may include a call-out fee.",
      "For larger jobs, a fixed project quote is often more useful than multiplying an hourly rate."
    ],
    "sections": [
      {
        "heading": "Typical 2026 plumber rates",
        "paragraphs": [
          "Current 2026 UK market guidance publishes plumber rates of roughly £40–£60 per hour and £325–£375 per day, with an average around £50 per hour or £350 per day. These are budgeting figures rather than guaranteed local prices."
        ]
      },
      {
        "heading": "Why your quote can be higher or lower",
        "bullets": [
          "Urgent or out-of-hours attendance.",
          "London and South East labour costs.",
          "Access to pipework and the need to open walls or floors.",
          "Materials, valves, fittings and replacement components.",
          "Whether the plumber quotes by time or by the completed job."
        ]
      },
      {
        "heading": "What to ask before booking",
        "paragraphs": [
          "Confirm whether there is a call-out fee or minimum charge, whether VAT and materials are included, and whether the price is hourly or fixed for the described work."
        ]
      }
    ],
    "sources": [
      {
        "title": "Plumber costs in the UK: 2026 price guide",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/plumber-cost/"
      },
      {
        "title": "Plumbing installation costs in the UK in 2026",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/plumbing-installation-costs/"
      }
    ],
    "relatedSlugs": [
      "emergency-plumber-cost-uk",
      "leak-repair-cost-uk",
      "bathroom-plumbing-cost-uk"
    ]
  },
  {
    "slug": "emergency-plumber-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Emergency plumber cost in the UK: 2026 call-out guide",
    "summary": "Understand emergency hourly rates, call-out charges and why out-of-hours plumbing can cost significantly more.",
    "description": "Typical UK emergency plumber costs in 2026, including call-out fees, hourly rates and urgent repair pricing.",
    "appliesTo": "UK homeowners. Emergency rates vary significantly by time, region and severity.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "emergency plumber cost",
      "emergency plumber call out fee",
      "out of hours plumber",
      "plumber emergency rate"
    ],
    "keyPoints": [
      "Current published guidance puts emergency plumber hourly rates broadly around £75–£150.",
      "A separate call-out fee around £100–£120 is common in current national guidance.",
      "Night, weekend and bank-holiday work can cost more.",
      "Ask for the attendance fee and labour rate before the visit where circumstances allow."
    ],
    "sections": [
      {
        "heading": "Typical emergency pricing",
        "paragraphs": [
          "Current 2026 UK market guidance lists emergency plumber hourly rates around £75–£150, averaging about £100, with typical emergency call-out fees around £100–£120."
        ]
      },
      {
        "heading": "What the call-out normally covers",
        "paragraphs": [
          "A call-out fee may cover travel and initial attendance rather than the full repair. Parts, additional labour and follow-up work can be charged separately."
        ]
      },
      {
        "heading": "Reduce surprises",
        "bullets": [
          "Ask whether the fee includes the first hour.",
          "Confirm any out-of-hours premium.",
          "Request approval before non-emergency extra work is added.",
          "Keep the invoice and description of the repair."
        ]
      }
    ],
    "sources": [
      {
        "title": "Plumber costs in the UK: 2026 price guide",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/plumber-cost/"
      }
    ],
    "relatedSlugs": [
      "plumber-cost-uk-2026",
      "leak-repair-cost-uk"
    ]
  },
  {
    "slug": "radiator-installation-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Radiator installation cost in the UK: 2026 guide",
    "summary": "Budget for replacing or adding a radiator and understand when new pipework makes the job more expensive.",
    "description": "Typical UK radiator installation costs in 2026, including replacement radiators, new pipework and labour factors.",
    "appliesTo": "UK homeowners. Boiler, heating-system and pipework condition can materially affect the price.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "radiator installation cost",
      "replace radiator cost",
      "new radiator cost",
      "radiator fitting price"
    ],
    "keyPoints": [
      "A straightforward radiator installation is currently published around £150–£180 in one major UK cost guide.",
      "Moving a radiator or adding new pipework is a different and usually more expensive job.",
      "Designer or oversized radiators can increase both product and labour cost.",
      "Heating-system balancing and valve changes may also be required."
    ],
    "sections": [
      {
        "heading": "Typical planning figure",
        "paragraphs": [
          "Current UK market data lists radiator installation around £150–£180, averaging roughly £165 for a straightforward job."
        ]
      },
      {
        "heading": "What changes the price",
        "bullets": [
          "Like-for-like replacement versus a new location.",
          "Access beneath floors or behind walls.",
          "Thermostatic valve replacement.",
          "Radiator size and weight.",
          "System draining, refilling and balancing."
        ]
      },
      {
        "heading": "Describe the job accurately",
        "paragraphs": [
          "When requesting quotes, state whether the radiator is staying in the same location and whether you are supplying the radiator and valves."
        ]
      }
    ],
    "sources": [
      {
        "title": "Plumber costs in the UK: 2026 price guide",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/plumber-cost/"
      }
    ],
    "relatedSlugs": [
      "plumber-cost-uk-2026",
      "whole-house-plumbing-cost-uk"
    ]
  },
  {
    "slug": "leak-repair-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Plumbing leak repair cost in the UK: 2026 guide",
    "summary": "Estimate the cost of fixing an accessible leak and understand why hidden leaks can cost much more.",
    "description": "Typical UK plumbing leak repair costs in 2026, including accessible leaks, burst pipes and hidden-access work.",
    "appliesTo": "UK homeowners. Water damage, access and emergency attendance can dominate the final cost.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "leak repair cost",
      "plumber leak cost",
      "fix leaking pipe cost",
      "burst pipe repair cost"
    ],
    "keyPoints": [
      "Current published guidance puts many simple leak repairs around £77–£128, averaging about £100.",
      "Burst-pipe repairs are often higher and emergency attendance can add a call-out fee.",
      "Hidden leaks behind floors, ceilings or tiled walls can require access and making-good work.",
      "Stopping active water damage quickly can matter more than finding the cheapest call-out."
    ],
    "sections": [
      {
        "heading": "Typical simple repair range",
        "paragraphs": [
          "Current UK market guidance puts a typical leak-repair range around £77–£128 and an average near £100, while burst-pipe repair examples can rise to around £150 or more depending on the work."
        ]
      },
      {
        "heading": "Hidden costs are often access costs",
        "paragraphs": [
          "A cheap fitting can still become an expensive job if the plumber has to locate the leak, lift flooring, remove boxing or open a wall before reaching it."
        ]
      },
      {
        "heading": "For active leaks",
        "bullets": [
          "Shut off the water if safe and practical.",
          "Protect electrics from water and seek urgent help where needed.",
          "Photograph damage for your records.",
          "Ask what repair and making-good are included."
        ]
      }
    ],
    "sources": [
      {
        "title": "Plumber costs in the UK: 2026 price guide",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/plumber-cost/"
      }
    ],
    "relatedSlugs": [
      "emergency-plumber-cost-uk",
      "plumber-cost-uk-2026"
    ]
  },
  {
    "slug": "tap-installation-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Tap installation and replacement cost in the UK: 2026 guide",
    "summary": "Compare kitchen, basin, bath and mixer-tap fitting costs and understand when pipework changes increase labour.",
    "description": "Typical UK tap installation costs in 2026, including kitchen taps, basin taps, bath taps and labour-only replacements.",
    "appliesTo": "UK homeowners. Tap type, access and existing isolation valves affect the price.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "tap installation cost",
      "replace kitchen tap cost",
      "bath tap replacement cost",
      "mixer tap fitting cost"
    ],
    "keyPoints": [
      "Current UK guidance puts average tap-installation labour around £140.",
      "Like-for-like replacements are generally cheaper than adapting pipework or changing tap configuration.",
      "Published replacement ranges vary by basin, bath and kitchen tap type.",
      "Supplying your own tap can separate product cost from labour."
    ],
    "sections": [
      {
        "heading": "Typical 2026 figures",
        "paragraphs": [
          "Checkatrade's current guide gives average tap-installation labour around £140. It publishes basin-tap replacement around £140–£220, mixer tap replacement around £140–£260 and bath tap replacement around £200–£320."
        ]
      },
      {
        "heading": "Why some tap changes take longer",
        "bullets": [
          "No accessible isolation valves.",
          "Corroded or old fittings.",
          "Changing from separate hot/cold taps to a mixer.",
          "Awkward access behind sinks or baths.",
          "Non-standard pipe sizes or adapters."
        ]
      },
      {
        "heading": "Get a useful quote",
        "paragraphs": [
          "Tell the plumber the current tap type, the replacement type and whether isolation valves are present. Photos can help the plumber price a straightforward swap more accurately."
        ]
      }
    ],
    "sources": [
      {
        "title": "Tap installation cost in 2026",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/tap-installation-cost/"
      }
    ],
    "relatedSlugs": [
      "outside-tap-installation-cost-uk",
      "plumber-cost-uk-2026"
    ]
  },
  {
    "slug": "outside-tap-installation-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Outside tap installation cost in the UK: 2026 guide",
    "summary": "Budget for fitting an outside tap and understand how pipe-run length, access and frost protection affect the price.",
    "description": "Typical UK outside tap installation costs in 2026, including materials, labour and common installation factors.",
    "appliesTo": "UK homeowners. Water fittings requirements apply to the installation.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "outside tap cost",
      "garden tap installation cost",
      "fit outside tap price",
      "outdoor tap installation"
    ],
    "keyPoints": [
      "Current published guidance puts a standard outside-tap installation around £120–£200 including materials and labour.",
      "Longer pipe runs and difficult wall access increase labour.",
      "Hot-and-cold outdoor mixers normally cost more than a simple cold supply.",
      "Backflow protection and compliant fittings matter."
    ],
    "sections": [
      {
        "heading": "Typical 2026 range",
        "paragraphs": [
          "Current UK market guidance puts a typical outside-tap installation range of £120–£200 for materials and labour, averaging around £160."
        ]
      },
      {
        "heading": "What affects the quote",
        "bullets": [
          "Distance from the nearest suitable water supply.",
          "Wall thickness and drilling access.",
          "Cold-only versus hot-and-cold supply.",
          "Frost-resistant fittings.",
          "Whether pipework is surface-mounted or concealed."
        ]
      },
      {
        "heading": "Compliance still matters",
        "paragraphs": [
          "Outside water fittings should be installed in line with the applicable Water Supply (Water Fittings) Regulations or local equivalent requirements, including suitable backflow protection."
        ]
      }
    ],
    "sources": [
      {
        "title": "Tap installation cost in 2026",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/tap-installation-cost/"
      }
    ],
    "relatedSlugs": [
      "tap-installation-cost-uk",
      "plumber-cost-uk-2026"
    ]
  },
  {
    "slug": "bathroom-plumbing-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Bathroom plumbing cost in the UK: 2026 guide",
    "summary": "Plan the plumbing part of a bathroom project separately from sanitaryware, tiling and electrics.",
    "description": "Typical UK bathroom plumbing costs in 2026, including new pipework, layout changes and the factors that increase labour.",
    "appliesTo": "UK homeowners. Figures exclude many fixtures and finishes unless a quote says otherwise.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "bathroom plumbing cost",
      "new bathroom plumbing cost",
      "bathroom pipework cost",
      "plumbing bathroom price"
    ],
    "keyPoints": [
      "Current UK guidance puts bathroom plumbing installation around £3,250 excluding sanitaryware for a typical project example.",
      "Keeping fixtures near existing services usually costs less than moving drainage and supplies.",
      "A plumbing quote may exclude sanitaryware, tiling, electrics and decoration.",
      "Ask for the plumbing scope to be itemised separately."
    ],
    "sections": [
      {
        "heading": "Current planning figure",
        "paragraphs": [
          "Current 2026 UK market guidance gives a typical bathroom plumbing cost around £3,250 excluding sanitaryware. The real figure depends heavily on the existing layout and the amount of new pipework required."
        ]
      },
      {
        "heading": "Expensive layout changes",
        "bullets": [
          "Moving a WC soil connection.",
          "Relocating bath or shower wastes.",
          "Running new hot and cold supplies.",
          "Concealing pipework in floors or walls.",
          "Working around joists, structural elements or limited access."
        ]
      },
      {
        "heading": "Separate plumbing from the rest",
        "paragraphs": [
          "For a useful comparison, identify which parts of the bathroom quote cover plumbing and which cover sanitaryware, tiling, waterproofing, electrical work and finishing."
        ]
      }
    ],
    "sources": [
      {
        "title": "Plumbing installation costs in the UK in 2026",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/plumbing-installation-costs/"
      }
    ],
    "relatedSlugs": [
      "bathroom-renovation-cost-uk",
      "bathroom-fitter-cost-uk",
      "plumber-cost-uk-2026"
    ]
  },
  {
    "slug": "whole-house-plumbing-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Whole-house plumbing cost in the UK: 2026 guide",
    "summary": "Understand the scale of replumbing a home and why property size, access and heating work can change the budget dramatically.",
    "description": "Typical UK whole-house plumbing costs in 2026, including 2-bed and 4-bed property planning figures and major cost drivers.",
    "appliesTo": "UK homeowners. Scope can range from new water pipework only to much broader heating and drainage work.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "whole house plumbing cost",
      "replumb house cost",
      "new plumbing house cost",
      "plumbing installation cost"
    ],
    "keyPoints": [
      "Current 2026 guidance gives whole-house plumbing examples around £14,500 for a 2-bed property and £21,500 for a 4-bed property.",
      "Clarify whether heating, drainage, sanitaryware and making-good are included.",
      "Occupied homes and difficult access can increase labour.",
      "Older properties can reveal additional work after floors and walls are opened."
    ],
    "sections": [
      {
        "heading": "Published planning figures",
        "paragraphs": [
          "Current UK market guidance gives example whole-house plumbing costs of around £14,500 for a 2-bed property and £21,500 for a 4-bed property. These are broad planning figures, not fixed rates."
        ]
      },
      {
        "heading": "Define the scope before comparing prices",
        "bullets": [
          "Hot and cold water distribution.",
          "Heating pipework and radiators.",
          "Waste and soil pipework.",
          "Bathrooms and kitchen connections.",
          "Boiler or cylinder work.",
          "Making good after access."
        ]
      },
      {
        "heading": "Why property condition matters",
        "paragraphs": [
          "Older homes may contain obsolete pipe materials, awkward routes or previous alterations that only become visible once work starts. A clear contingency is sensible on major replumbing projects."
        ]
      }
    ],
    "sources": [
      {
        "title": "Plumbing installation costs in the UK in 2026",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/plumbing-installation-costs/"
      }
    ],
    "relatedSlugs": [
      "plumber-cost-uk-2026",
      "bathroom-plumbing-cost-uk"
    ]
  },
  {
    "slug": "electrician-cost-uk-2026",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Electrician cost in the UK: hourly and day rates for 2026",
    "summary": "Plan for electrician hourly rates, day rates, minimum charges and common fixed-price electrical jobs.",
    "description": "Typical UK electrician costs in 2026, including hourly rates, day rates, emergency rates and common job prices.",
    "appliesTo": "UK homeowners. Rates vary by region, urgency, certification needs and job complexity.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "electrician cost",
      "electrician hourly rate",
      "electrician day rate",
      "electrical cost uk",
      "electrician prices 2026"
    ],
    "keyPoints": [
      "Current 2026 guidance puts normal electrician rates around £45–£60 per hour, averaging about £50.",
      "A typical published day rate is around £400.",
      "Emergency work can approach £80–£100 per hour.",
      "Small jobs may still attract a minimum charge or call-out fee."
    ],
    "sections": [
      {
        "heading": "Typical electrician rates",
        "paragraphs": [
          "Checkatrade's current guide publishes electrician rates around £45–£60 per hour, with an average near £50, and a typical day rate around £400. Emergency rates are published around £80–£100 per hour."
        ]
      },
      {
        "heading": "Fixed job prices are common",
        "paragraphs": [
          "Sockets, light fittings, consumer units, showers, EICRs and rewires are often priced as jobs rather than simply hours multiplied by a rate."
        ]
      },
      {
        "heading": "Compare the whole quote",
        "bullets": [
          "Materials and fittings.",
          "Testing and certification.",
          "Making good after chasing.",
          "Travel or call-out charges.",
          "VAT where applicable."
        ]
      }
    ],
    "sources": [
      {
        "title": "Electrician hourly rates in the UK in 2026",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/electrician-hourly-rate/"
      }
    ],
    "relatedSlugs": [
      "house-rewire-cost-uk",
      "consumer-unit-replacement-cost-uk",
      "eicr-cost-uk"
    ]
  },
  {
    "slug": "house-rewire-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "House rewiring cost in the UK: 2026 price guide",
    "summary": "Budget for a full rewire by property size, access and specification rather than relying on one national average.",
    "description": "Typical UK house rewiring costs in 2026, including property-size ranges, labour, materials and making-good factors.",
    "appliesTo": "UK homeowners. Electrical work should be carried out by competent people and relevant notification requirements must be met.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "house rewire cost",
      "rewiring cost uk",
      "cost to rewire house",
      "rewire 3 bed house",
      "electrical rewire price"
    ],
    "keyPoints": [
      "Current major UK guides place full house rewires broadly between about £2,500 and £12,500 depending on property size and scope.",
      "A current UK market range is roughly £3,900–£10,000 for common property sizes.",
      "Occupied properties and difficult access can increase labour.",
      "Making good, decorating and premium fittings may be extra."
    ],
    "sections": [
      {
        "heading": "Current 2026 ranges",
        "paragraphs": [
          "Current UK market guidance puts typical rewiring costs from about £3,900 for a 1-bed flat to around £10,000 for a 5-bed house. Another current UK market guide publishes a broader £2,500–£12,500 range across different property types and specifications."
        ]
      },
      {
        "heading": "What makes rewiring expensive",
        "bullets": [
          "Property size and circuit count.",
          "Occupied versus empty property.",
          "Access beneath floors and inside walls.",
          "Number and type of sockets, lights and specialist circuits.",
          "Consumer-unit replacement.",
          "Making good and redecoration."
        ]
      },
      {
        "heading": "Check the condition first",
        "paragraphs": [
          "An Electrical Installation Condition Report can help identify the condition of an existing installation before a major rewire is specified."
        ]
      }
    ],
    "sources": [
      {
        "title": "How much does it cost to rewire a house in the UK?",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/rewire-house-cost/"
      },
      {
        "title": "How much to rewire a house in the UK? 2026 prices",
        "publisher": "MyJobQuote",
        "url": "https://www.myjobquote.co.uk/costs/rewiring-a-house"
      },
      {
        "title": "Electrical safety: Approved Document P",
        "publisher": "GOV.UK",
        "url": "https://www.gov.uk/government/publications/electrical-safety-approved-document-p"
      }
    ],
    "relatedSlugs": [
      "electrician-cost-uk-2026",
      "consumer-unit-replacement-cost-uk",
      "eicr-cost-uk"
    ]
  },
  {
    "slug": "consumer-unit-replacement-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Consumer unit replacement cost in the UK: 2026 guide",
    "summary": "Understand typical fuse-box replacement pricing, testing and why remedial work can change the final bill.",
    "description": "Typical UK consumer unit replacement costs in 2026, including testing, certification and common extra work.",
    "appliesTo": "UK homeowners. Consumer-unit work is safety-critical and may be notifiable depending on the nation and circumstances.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "consumer unit replacement cost",
      "fuse box replacement cost",
      "new fuse board cost",
      "consumer unit price"
    ],
    "keyPoints": [
      "Current 2026 guidance puts a typical consumer-unit replacement around £450–£800.",
      "The published average is roughly £625.",
      "Existing faults or non-compliant circuits can add remedial work.",
      "Testing and certification should be included in the scope."
    ],
    "sections": [
      {
        "heading": "Typical 2026 cost",
        "paragraphs": [
          "Current UK market guidance puts a consumer-unit replacement range of roughly £450–£800, averaging around £625."
        ]
      },
      {
        "heading": "Why the quote can grow",
        "bullets": [
          "Number of circuits.",
          "Existing wiring defects.",
          "Earthing and bonding issues.",
          "Surge protection or additional protection requirements.",
          "Access and labelling/testing work."
        ]
      },
      {
        "heading": "Do not compare the box price alone",
        "paragraphs": [
          "The consumer unit itself is only part of the job. Safe isolation, testing, fault identification, installation and certification are central to the work."
        ]
      }
    ],
    "sources": [
      {
        "title": "Electrician hourly rates in the UK in 2026",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/electrician-hourly-rate/"
      },
      {
        "title": "Electrical safety: Approved Document P",
        "publisher": "GOV.UK",
        "url": "https://www.gov.uk/government/publications/electrical-safety-approved-document-p"
      }
    ],
    "relatedSlugs": [
      "electrician-cost-uk-2026",
      "house-rewire-cost-uk",
      "electrical-work-building-regulations-england"
    ]
  },
  {
    "slug": "socket-installation-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Plug socket installation cost in the UK: 2026 guide",
    "summary": "Compare the cost of adding a socket with simple replacement work and understand how cable routes affect labour.",
    "description": "Typical UK plug socket installation costs in 2026, including new sockets, cable runs and common extra work.",
    "appliesTo": "UK homeowners. Electrical safety and notification requirements depend on the work and location.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "socket installation cost",
      "new plug socket cost",
      "add socket price",
      "electrician socket cost"
    ],
    "keyPoints": [
      "Current national guidance puts a standard socket installation around £55–£75, averaging about £65.",
      "Long cable runs, chasing and difficult access can increase the price.",
      "Several sockets done during one visit can be more efficient than separate call-outs.",
      "Testing and safe circuit capacity still matter on small jobs."
    ],
    "sections": [
      {
        "heading": "Typical 2026 price",
        "paragraphs": [
          "Current UK market guidance puts a typical socket-installation range around £55–£75, with an average near £65 for a straightforward installation."
        ]
      },
      {
        "heading": "What changes the cost",
        "bullets": [
          "Distance to a suitable circuit.",
          "Surface wiring versus chasing walls.",
          "Wall construction and making good.",
          "Number of sockets installed in one visit.",
          "Condition and capacity of the existing circuit."
        ]
      },
      {
        "heading": "Describe the location",
        "paragraphs": [
          "Photos and a clear description of the desired socket position can make initial quoting more useful, though the electrician still needs to confirm the circuit is suitable."
        ]
      }
    ],
    "sources": [
      {
        "title": "Electrician hourly rates in the UK in 2026",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/electrician-hourly-rate/"
      }
    ],
    "relatedSlugs": [
      "electrician-cost-uk-2026",
      "light-fitting-installation-cost-uk"
    ]
  },
  {
    "slug": "light-fitting-installation-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Light fitting installation cost in the UK: 2026 guide",
    "summary": "Budget for replacing a light fitting, moving a switch or installing more complex lighting.",
    "description": "Typical UK light fitting and light switch installation costs in 2026, including straightforward replacements and more complex work.",
    "appliesTo": "UK homeowners. Complex fittings, access and new wiring can materially increase labour.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "light fitting installation cost",
      "replace light fitting cost",
      "light switch replacement cost",
      "electrician lighting cost"
    ],
    "keyPoints": [
      "Current 2026 guidance puts a standard light-fitting replacement around £55–£75.",
      "A like-for-like light-switch replacement is published around £75 in a current UK guide.",
      "Moving switches or adding new points costs more because new wiring is needed.",
      "High ceilings, exterior fittings and decorative fittings can increase labour."
    ],
    "sections": [
      {
        "heading": "Typical straightforward jobs",
        "paragraphs": [
          "Current UK market guidance puts standard light-fitting replacement around £55–£75. Its 2026 light-switch guide gives about £75 for a like-for-like switch replacement and around £150 for moving or adding one switch."
        ]
      },
      {
        "heading": "What increases the quote",
        "bullets": [
          "New cable routes.",
          "High or awkward access.",
          "Multiple downlights.",
          "Exterior or weatherproof fittings.",
          "Heavy decorative fittings or specialist supports."
        ]
      },
      {
        "heading": "Small jobs still have minimum charges",
        "paragraphs": [
          "Even if the physical replacement takes less than an hour, an electrician may apply a minimum attendance or half-day charge."
        ]
      }
    ],
    "sources": [
      {
        "title": "Electrician hourly rates in the UK in 2026",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/electrician-hourly-rate/"
      },
      {
        "title": "Cost to replace a light switch in 2026",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/cost-replace-light-switch/"
      }
    ],
    "relatedSlugs": [
      "socket-installation-cost-uk",
      "electrician-cost-uk-2026"
    ]
  },
  {
    "slug": "electric-shower-installation-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Electric shower installation cost in the UK: 2026 guide",
    "summary": "Separate the cost of the shower unit from the electrical installation and understand when circuit upgrades are needed.",
    "description": "Typical UK electric shower installation costs in 2026, including electrical labour, shower units and circuit-upgrade factors.",
    "appliesTo": "UK homeowners. Electrical and plumbing requirements depend on the existing installation and UK nation.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "electric shower installation cost",
      "fit electric shower cost",
      "electric shower electrician cost",
      "new shower circuit cost"
    ],
    "keyPoints": [
      "Current guidance puts electric-shower electrical installation around £250–£400 excluding the shower unit.",
      "Supply and installation can rise toward roughly £800 in some current examples.",
      "Existing cable size, circuit protection and consumer-unit capacity matter.",
      "Bathroom electrical work may be notifiable under applicable Building Regulations."
    ],
    "sections": [
      {
        "heading": "Typical 2026 figures",
        "paragraphs": [
          "Current UK market guidance puts electric-shower installation labour around £250–£400, averaging roughly £325, excluding the shower unit. It notes that supply-and-install jobs can rise closer to around £800 depending on the product and work required."
        ]
      },
      {
        "heading": "Why an existing shower does not guarantee a simple swap",
        "bullets": [
          "The new shower may have a different power rating.",
          "Cable size may be unsuitable.",
          "Circuit protection may need upgrading.",
          "The consumer unit may need work.",
          "Plumbing and electrical scopes may be separate."
        ]
      },
      {
        "heading": "Regulated work",
        "paragraphs": [
          "Use a competent electrician and confirm what certification or notification applies to the work where the property is located."
        ]
      }
    ],
    "sources": [
      {
        "title": "Electrician hourly rates in the UK in 2026",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/electrician-hourly-rate/"
      },
      {
        "title": "Electrical safety: Approved Document P",
        "publisher": "GOV.UK",
        "url": "https://www.gov.uk/government/publications/electrical-safety-approved-document-p"
      }
    ],
    "relatedSlugs": [
      "shower-installation-cost-uk",
      "electrical-work-building-regulations-england",
      "electrician-cost-uk-2026"
    ]
  },
  {
    "slug": "eicr-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "EICR cost in the UK: 2026 electrical inspection guide",
    "summary": "Understand typical Electrical Installation Condition Report pricing and why property size affects the inspection cost.",
    "description": "Typical UK EICR costs in 2026, including property-size ranges, inspection scope and what happens if defects are found.",
    "appliesTo": "UK homeowners and landlords. Legal duties differ by tenure, nation and circumstances.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "EICR cost",
      "electrical safety certificate cost",
      "electrical inspection cost",
      "EICR price uk"
    ],
    "keyPoints": [
      "Current UK guidance puts EICR pricing roughly from £125 for a small property to £300+ for larger homes.",
      "A current national average is around £212.50.",
      "Remedial work identified by the inspection is normally separate.",
      "An EICR reports condition; it is not itself a repair quote."
    ],
    "sections": [
      {
        "heading": "Typical 2026 cost",
        "paragraphs": [
          "Current UK market guidance puts EICR costs from around £125 for a one-bedroom property to £300+ for larger homes, with an average figure around £212.50."
        ]
      },
      {
        "heading": "What the inspection is for",
        "paragraphs": [
          "An EICR assesses the condition of an electrical installation and identifies observations that may need attention. Any repair or upgrade work is normally priced separately."
        ]
      },
      {
        "heading": "What changes the price",
        "bullets": [
          "Property size.",
          "Number of circuits.",
          "Access to boards and equipment.",
          "Complexity of the installation.",
          "Commercial versus domestic premises."
        ]
      }
    ],
    "sources": [
      {
        "title": "Electrician hourly rates in the UK in 2026",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/electrician-hourly-rate/"
      }
    ],
    "relatedSlugs": [
      "house-rewire-cost-uk",
      "electrician-cost-uk-2026"
    ]
  },
  {
    "slug": "ev-charger-installation-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Home EV charger installation cost in the UK: 2026 guide",
    "summary": "Budget for the charger, electrical installation and possible cable-route or groundworks extras.",
    "description": "Typical UK home EV charger installation costs in 2026, including charger supply, labour, trenching and electrical-upgrade factors.",
    "appliesTo": "UK homeowners. Grants and eligibility rules can change; check current official schemes before budgeting.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "EV charger installation cost",
      "home car charger cost",
      "electric car charger installation",
      "7kw charger cost uk"
    ],
    "keyPoints": [
      "Current published guidance puts a typical home EV charger supply-and-install figure around £1,000 before any applicable grant.",
      "Long cable runs, trenching and electrical upgrades can increase the total.",
      "A typical 7kW charger unit alone is currently published around £450–£800 in one major cost guide.",
      "Grant availability and eligibility should be checked against current official rules."
    ],
    "sections": [
      {
        "heading": "Typical 2026 planning figure",
        "paragraphs": [
          "Current UK market guidance puts an average home EV charger supply-and-install cost around £1,000. Its guide gives a typical 7kW charger supply-only range around £450–£800."
        ]
      },
      {
        "heading": "Common extras",
        "bullets": [
          "Long cable routes.",
          "Consumer-unit or protective-device upgrades.",
          "Groundworks and trenching.",
          "Detached garages or parking away from the house.",
          "Load-management equipment where required."
        ]
      },
      {
        "heading": "Do not assume a grant",
        "paragraphs": [
          "Grant schemes, eligibility and contribution levels can change. Check current government guidance before treating any grant as part of the project budget."
        ]
      }
    ],
    "sources": [
      {
        "title": "Electric car charger installation cost in 2026",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/electric-car-charger-installation-cost/"
      }
    ],
    "relatedSlugs": [
      "electrician-cost-uk-2026",
      "consumer-unit-replacement-cost-uk"
    ]
  },
  {
    "slug": "builder-day-rate-uk-2026",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Builder day rate in the UK: 2026 guide",
    "summary": "Understand typical builder day rates and why project quotes are more useful than day rates for extensions and renovations.",
    "description": "Typical UK builder day rates in 2026, including hourly pricing, construction-company rates and factors that affect labour costs.",
    "appliesTo": "UK homeowners. Builder rates vary by region, project type, business structure and included management.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "builder day rate",
      "builder hourly rate",
      "builder cost per day uk",
      "builder rates 2026"
    ],
    "keyPoints": [
      "Current 2026 guidance uses around £400 per day as a typical builder or construction-company rate.",
      "Self-employed builders may quote around £40 per hour for smaller work in current national guidance.",
      "Large projects are normally quoted as complete jobs rather than simple day rates.",
      "A higher day rate can include project management, insurance, equipment and coordination."
    ],
    "sections": [
      {
        "heading": "Typical 2026 rate",
        "paragraphs": [
          "Current UK market guidance uses around £400 per day as a typical builder/construction-company rate and around £40 per hour for some self-employed builder work."
        ]
      },
      {
        "heading": "Why a day rate can mislead",
        "paragraphs": [
          "An extension builder coordinating several trades may cost more per day than a sole trader doing a small repair, but the scope, supervision and overheads are completely different."
        ]
      },
      {
        "heading": "For larger projects",
        "bullets": [
          "Compare the full written scope.",
          "Check materials and waste removal.",
          "Understand who manages subcontractors.",
          "Agree variation pricing.",
          "Use staged payments tied to clear work milestones."
        ]
      }
    ],
    "sources": [
      {
        "title": "Builder day rates 2026",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/builder-day-rate/"
      }
    ],
    "relatedSlugs": [
      "house-extension-cost-uk",
      "how-to-compare-building-quotes"
    ]
  },
  {
    "slug": "house-extension-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "House extension cost in the UK: 2026 price guide",
    "summary": "Plan extension costs per square metre and understand the difference between shell-only and finished space.",
    "description": "Typical UK house extension costs in 2026, including per-m² rates, single-storey examples and major budget factors.",
    "appliesTo": "UK homeowners. Planning, Building Regulations and party-wall requirements depend on the project and location.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "house extension cost",
      "extension cost per m2",
      "single storey extension cost",
      "extension price uk 2026"
    ],
    "keyPoints": [
      "Current UK guidance puts full extension costs broadly around £1,800–£3,000 per m².",
      "Shell-only extensions are published around £1,200–£1,700 per m².",
      "A 20m² single-storey extension is currently budgeted around £40,000–£56,000 in one major guide.",
      "Kitchens, bathrooms and complex structural work push costs above basic living-space rates."
    ],
    "sections": [
      {
        "heading": "Typical 2026 extension rates",
        "paragraphs": [
          "Current UK market guidance puts full house-extension costs around £1,800–£3,000 per m², averaging about £2,400 per m², and shell-only costs around £1,200–£1,700 per m²."
        ]
      },
      {
        "heading": "Example project sizes",
        "paragraphs": [
          "Its 2026 guide places a 20m² single-storey extension around £40,000–£56,000, a 30m² project around £60,000–£84,000 and larger 50m² projects around £100,000–£140,000."
        ]
      },
      {
        "heading": "Budget beyond the shell",
        "bullets": [
          "Design and structural engineering.",
          "Building Control fees.",
          "Kitchen or bathroom fit-out.",
          "Glazing and doors.",
          "Heating and electrical work.",
          "Flooring and decoration.",
          "Contingency for ground conditions and changes."
        ]
      }
    ],
    "sources": [
      {
        "title": "House extension cost breakdown 2026",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/house-extension-cost/"
      },
      {
        "title": "Building regulations approval",
        "publisher": "GOV.UK",
        "url": "https://www.gov.uk/building-regulations-approval"
      }
    ],
    "relatedSlugs": [
      "builder-day-rate-uk-2026",
      "structural-engineer-cost-uk",
      "extension-over-garage-cost-uk"
    ]
  },
  {
    "slug": "loft-conversion-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Loft conversion cost in the UK: 2026 guide",
    "summary": "Compare rooflight, dormer, hip-to-gable and other loft-conversion budgets before requesting specialist quotes.",
    "description": "Typical UK loft conversion costs in 2026, including Velux, dormer, hip-to-gable and mansard project ranges.",
    "appliesTo": "UK homeowners. Building Regulations apply and planning requirements depend on the design and property.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "loft conversion cost",
      "dormer loft cost",
      "velux loft conversion cost",
      "loft conversion price 2026"
    ],
    "keyPoints": [
      "Current guidance puts many loft conversions between about £27,500 and £75,000+.",
      "Dormer projects are currently published around £50,000 on average in one major guide.",
      "Structural changes, stairs, insulation and fire-safety work are major cost drivers.",
      "Building Regulations approval is required for loft conversions."
    ],
    "sections": [
      {
        "heading": "Typical 2026 project figures",
        "paragraphs": [
          "Checkatrade's current guide places rooflight/Velux conversions around £27,500, dormers around £50,000, hip-to-gable projects around £60,000 and mansard conversions around £65,000 as typical examples."
        ]
      },
      {
        "heading": "Why loft costs vary",
        "bullets": [
          "Existing roof structure.",
          "Required headroom and floor strengthening.",
          "Dormer or roof-shape alterations.",
          "New stairs.",
          "Fire-safety upgrades.",
          "Bathrooms or plumbing.",
          "Insulation, windows and finishes."
        ]
      },
      {
        "heading": "Approvals",
        "paragraphs": [
          "Loft conversions must meet Building Regulations. Planning permission may also be needed depending on the type of alteration, permitted-development rights and property constraints."
        ]
      }
    ],
    "sources": [
      {
        "title": "Loft conversion cost: 2026 UK price guide",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/loft-conversion-cost/"
      },
      {
        "title": "Building regulations approval",
        "publisher": "GOV.UK",
        "url": "https://www.gov.uk/building-regulations-approval"
      }
    ],
    "relatedSlugs": [
      "house-extension-cost-uk",
      "structural-engineer-cost-uk"
    ]
  },
  {
    "slug": "garage-conversion-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Garage conversion cost in the UK: 2026 guide",
    "summary": "Compare integral, attached and detached garage-conversion budgets and the work needed to make a garage habitable.",
    "description": "Typical UK garage conversion costs in 2026, including per-m² ranges, project examples and major cost factors.",
    "appliesTo": "UK homeowners. Planning and Building Regulations requirements depend on the property and intended use.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "garage conversion cost",
      "convert garage cost uk",
      "garage conversion price",
      "garage to room cost"
    ],
    "keyPoints": [
      "Current major UK guides place many standard garage conversions around £8,000–£20,000.",
      "Current UK market guidance puts an average standard garage conversion around £14,500.",
      "Detached garages and conversions adding kitchens or bathrooms can cost much more.",
      "Insulation, floor levels, windows, ventilation and utility upgrades are common budget items."
    ],
    "sections": [
      {
        "heading": "Typical 2026 ranges",
        "paragraphs": [
          "Current UK market guidance puts garage-conversion costs from about £8,000 to £45,000 across different garage types, with an average standard project around £14,500. Another current UK market guide gives around £10,000–£20,000 for many integrated or attached 16m² garages."
        ]
      },
      {
        "heading": "What turns a garage into habitable space",
        "bullets": [
          "Thermal insulation.",
          "Floor build-up and damp protection.",
          "Replacing or infilling the garage door.",
          "Windows and ventilation.",
          "Heating and electrics.",
          "Plastering and finishes.",
          "Plumbing where required."
        ]
      },
      {
        "heading": "Check approvals early",
        "paragraphs": [
          "Garage conversions can require Building Regulations approval and may need planning permission in some situations, particularly where permitted-development rights are restricted."
        ]
      }
    ],
    "sources": [
      {
        "title": "Garage conversion cost UK: 2026 guide",
        "publisher": "MyJobQuote",
        "url": "https://www.myjobquote.co.uk/costs/garage-conversion-cost"
      },
      {
        "title": "Garage conversion cost in the UK in 2026",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/garage-conversion-cost/"
      }
    ],
    "relatedSlugs": [
      "garage-build-cost-uk",
      "house-extension-cost-uk"
    ]
  },
  {
    "slug": "structural-engineer-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Structural engineer cost in the UK: 2026 guide",
    "summary": "Budget for site visits, reports, beam calculations and extension design work before structural building begins.",
    "description": "Typical UK structural engineer costs in 2026, including site visits, reports, RSJ calculations and residential project fees.",
    "appliesTo": "UK homeowners. Engineering fees vary with complexity, region and the level of design responsibility.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "structural engineer cost",
      "structural engineer fees",
      "RSJ calculation cost",
      "structural survey cost"
    ],
    "keyPoints": [
      "Current 2026 guidance puts structural engineer hourly rates around £100–£200.",
      "A site inspection is currently published around £300 and a report around £700 in one major guide.",
      "RSJ calculations may be around £200 where separately priced.",
      "Complex residential design work can cost several thousand pounds."
    ],
    "sections": [
      {
        "heading": "Typical 2026 fees",
        "paragraphs": [
          "Current UK market guidance puts structural engineer rates around £100–£200 per hour, a typical site inspection around £300, a report around £700 and an RSJ calculation around £200."
        ]
      },
      {
        "heading": "What you are paying for",
        "bullets": [
          "Structural assessment.",
          "Load calculations.",
          "Beam or lintel specification.",
          "Drawings and details for Building Regulations.",
          "Coordination with architects or builders where needed."
        ]
      },
      {
        "heading": "Check the deliverables",
        "paragraphs": [
          "Ask whether the fee includes the site visit, calculations, drawings, revisions and responses to Building Control queries."
        ]
      }
    ],
    "sources": [
      {
        "title": "Structural engineer costs UK: 2026 prices",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/structural-engineer-costs/"
      }
    ],
    "relatedSlugs": [
      "load-bearing-wall-removal-cost-uk",
      "house-extension-cost-uk"
    ]
  },
  {
    "slug": "load-bearing-wall-removal-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Load-bearing wall removal cost in the UK: 2026 guide",
    "summary": "Budget for structural calculations, temporary support, steelwork and making good when opening up a room.",
    "description": "Typical UK load-bearing wall removal costs in 2026, including RSJs, structural engineer fees and open-plan knock-through examples.",
    "appliesTo": "UK homeowners. Structural work requires competent design and Building Regulations compliance.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "load bearing wall removal cost",
      "knock through wall cost",
      "remove supporting wall price",
      "RSJ wall removal cost"
    ],
    "keyPoints": [
      "Current guidance puts many load-bearing wall removals around £1,250–£1,750.",
      "Larger openings can cost materially more.",
      "Steelwork, structural calculations and making good can be separate items.",
      "Building Regulations approval is normally relevant to structural alterations."
    ],
    "sections": [
      {
        "heading": "Typical 2026 figures",
        "paragraphs": [
          "Current UK market guidance puts an average range around £1,250–£1,750 for removing a load-bearing wall, with examples around £1,525 for a roughly 2m opening and £2,700 for a larger 4m open-plan opening."
        ]
      },
      {
        "heading": "What the price needs to cover",
        "bullets": [
          "Structural engineer calculations.",
          "Temporary propping.",
          "Steel beam or other support.",
          "Padstones or bearings.",
          "Labour and demolition.",
          "Plastering, flooring and decoration afterwards."
        ]
      },
      {
        "heading": "Do not remove first and calculate later",
        "paragraphs": [
          "The support arrangement needs to be designed before structural elements are removed. Building Control requirements should be checked before work starts."
        ]
      }
    ],
    "sources": [
      {
        "title": "Load-bearing wall removal costs 2026",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/cost-remove-load-bearing-wall/"
      },
      {
        "title": "Building regulations approval",
        "publisher": "GOV.UK",
        "url": "https://www.gov.uk/building-regulations-approval"
      }
    ],
    "relatedSlugs": [
      "structural-engineer-cost-uk",
      "house-extension-cost-uk"
    ]
  },
  {
    "slug": "extension-over-garage-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Extension over a garage cost in the UK: 2026 guide",
    "summary": "Plan for structural checks, roof work and fit-out when adding a room above an existing garage.",
    "description": "Typical UK extension-over-garage costs in 2026, including single-garage projects, ensuite additions and structural factors.",
    "appliesTo": "UK homeowners. Planning permission or permitted-development confirmation and Building Regulations may be required.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "extension over garage cost",
      "build above garage cost",
      "garage first floor extension",
      "room over garage price"
    ],
    "keyPoints": [
      "Current 2026 guidance puts a single-garage overbuild around £25,000–£36,000.",
      "A typical published average is around £30,000 before major extras.",
      "Adding an ensuite can push the project toward roughly £40,000 in current examples.",
      "Existing garage foundations must be checked for the additional load."
    ],
    "sections": [
      {
        "heading": "Typical 2026 range",
        "paragraphs": [
          "Current UK market guidance puts a single-garage extension-over cost of roughly £25,000–£36,000, averaging around £30,000, with ensuite examples reaching around £40,000."
        ]
      },
      {
        "heading": "Structural checks come first",
        "paragraphs": [
          "An existing garage may not have been designed to carry another storey. Foundation capacity, walls and roof structure need assessment before the project can be priced with confidence."
        ]
      },
      {
        "heading": "Main cost drivers",
        "bullets": [
          "Underpinning or strengthening.",
          "Roof alterations.",
          "New stairs and access.",
          "Ensuite plumbing.",
          "Windows and insulation.",
          "Structural steelwork.",
          "Internal fit-out."
        ]
      }
    ],
    "sources": [
      {
        "title": "Extension over a garage cost in 2026",
        "publisher": "Checkatrade",
        "url": "https://www.checkatrade.com/blog/cost-guides/cost-of-extension-over-garage/"
      }
    ],
    "relatedSlugs": [
      "house-extension-cost-uk",
      "structural-engineer-cost-uk",
      "garage-conversion-cost-uk"
    ]
  },
  {
    "slug": "garage-build-cost-uk",
    "audience": "homeowner",
    "category": "Costs & pricing",
    "title": "Cost to build a garage in the UK: 2026 guide",
    "summary": "Compare prefab, single-brick and double-garage budgets before deciding whether to build, extend or convert.",
    "description": "Typical UK garage build costs in 2026, including prefab and brick-built garages, labour and major specification factors.",
    "appliesTo": "UK homeowners. Planning, Building Regulations and site constraints can affect both feasibility and cost.",
    "reviewedAt": "2026-10-03",
    "keywords": [
      "garage build cost",
      "cost to build garage uk",
      "brick garage cost",
      "double garage cost",
      "garage construction price"
    ],
    "keyPoints": [
      "Current UK market data puts traditional brick/block garages broadly around £21,000–£58,000.",
      "A basic single brick garage is currently published around £21,000 in one 2026 guide.",
      "Prefab garages can be much cheaper but are a different product and specification.",
      "Foundations, roof type, doors, insulation, electrics and site access are major cost drivers."
    ],
    "sections": [
      {
        "heading": "Typical 2026 figures",
        "paragraphs": [
          "Current UK market guidance puts traditionally built garage costs around £21,000–£58,000, with a basic single brick garage example around £21,000 and a pitched-roof single brick garage around £25,000."
        ]
      },
      {
        "heading": "Prefab versus traditional build",
        "paragraphs": [
          "A prefab kit can cost far less than a traditional masonry garage, but the lifespan, security, insulation, appearance and future conversion potential are not directly comparable."
        ]
      },
      {
        "heading": "Budget items",
        "bullets": [
          "Groundworks and slab.",
          "Brick or block walls.",
          "Flat or pitched roof.",
          "Garage doors and windows.",
          "Drainage.",
          "Electrics and security.",
          "Insulation and internal finishes where required."
        ]
      }
    ],
    "sources": [
      {
        "title": "Cost to build a garage: 2026 UK prices",
        "publisher": "MyJobQuote",
        "url": "https://www.myjobquote.co.uk/costs/garage-extension"
      }
    ],
    "relatedSlugs": [
      "garage-conversion-cost-uk",
      "extension-over-garage-cost-uk",
      "house-extension-cost-uk"
    ]
  }
];

const OFFICIAL_ADVICE_SOURCE_HOSTS = [
  'gov.uk',
  'www.gov.uk',
  'hse.gov.uk',
  'www.hse.gov.uk',
  'legislation.gov.uk',
  'www.legislation.gov.uk',
  'citizensadvice.org.uk',
  'www.citizensadvice.org.uk',
  'businesscompanion.info',
  'www.businesscompanion.info',
  'gassaferegister.co.uk',
  'www.gassaferegister.co.uk',
];

export function isOfficialAdviceSource(source: AdviceSource) {
  try {
    return OFFICIAL_ADVICE_SOURCE_HOSTS.includes(new URL(source.url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

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
