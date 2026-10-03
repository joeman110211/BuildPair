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
