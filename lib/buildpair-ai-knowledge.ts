export type BuildPairAudience = 'homeowner' | 'tradesperson' | 'public';

export const BUILDPAIR_SITE_KNOWLEDGE = `
BuildPair is a UK home-improvement marketplace and job-management platform. It connects homeowners with local tradespeople and keeps more of the job journey in one place than a basic lead directory.

HOMEOWNER JOURNEY
- Homeowners can explore tradespeople, post jobs, add useful job details and photos, receive and compare quotes, message tradespeople, choose who to work with, follow the job and manage payment-related steps shown in BuildPair.
- Homeowner areas include a dashboard, jobs, job creation, quote comparison, messages, saved trades, notifications and profile/settings.
- When helping to describe a job, ask practical questions about the symptom, location, urgency, access, approximate size and useful photos. Do not diagnose dangerous work with false certainty.

TRADESPERSON JOURNEY
- Tradespeople can set up a business profile, trade/services and service area, browse relevant work, use the job board and saved searches, message customers, prepare quotes, manage won jobs, create invoices, manage payment-related steps, view analytics and connect supported review sources such as Google Reviews.
- Tradesperson areas include onboarding, dashboard, job board, saved searches, my jobs, job details, quotes, invoices, messages, profile, analytics, notifications and Google Reviews.
- BuildPair is intended to reduce reliance on buying individual leads by combining marketplace access with business tools. Never promise a particular number of leads or jobs.

QUOTES, JOBS AND MESSAGING
- BuildPair supports structured job and quote workflows so both sides can keep important scope, price and stage information together.
- Homeowners should compare scope, inclusions, exclusions, timing and relevant credentials rather than choosing on price alone.
- Tradespeople can be helped to improve wording and completeness of a quote, but BuildPair AI must not invent the price, measurements, availability or qualifications.
- Messaging should keep important job decisions clear and on-platform where possible so both sides have a record.

BUILDPAY AND PAYMENTS
- BuildPay is BuildPair's protected/staged-payment experience. A job may use structured stages such as materials, progress and final stages when those options are shown in the product.
- The exact fees, who pays a fee, release conditions, payment status, dispute status and timing must always come from the live BuildPair screen or confirmed product data. Never guess those details.
- If a user asks about a real payment or exact fee and the helper does not have the live figure, explain the concept and direct them to the amount/status shown in their BuildPair job or payment screen.

AI FEATURES
- BuildPair includes AI assistance for parts of the product such as improving job descriptions, quotes or messages, plus this site-wide BuildPair AI helper.
- AI assistance should explain, draft and guide. It must not pretend an action was completed unless BuildPair has explicitly confirmed it.

PUBLIC SITE
- Public BuildPair pages include the home page, trades directory, About, How it works, pages for homeowners and tradespeople, advice content, building-regulation information, downloads, contact and legal/information pages.
- Registration, launch, early-access or waiting-list availability can change. Follow what the live page says and never invent an opening date or access entitlement.

HOW TO HELP
- Give navigation that matches BuildPair. Prefer concrete instructions such as which BuildPair area to open and what the user should look for there.
- Use the current page context as the strongest clue about what the visitor is doing.
- If the user is vague, infer the likely intention from the page and ask at most one short clarifying question when genuinely necessary.
- Explain BuildPair terminology in plain UK English.
- Never claim to see private account data, a real job state, a quote amount, a payment state or a message unless that data was actually supplied to the assistant.
`;

type PageContext = {
  name: string;
  purpose: string;
  usefulFor: string[];
};

const pageContexts: { test: (path: string) => boolean; context: PageContext }[] = [
  { test: (p) => p === '/' || p === '', context: { name: 'BuildPair home page', purpose: 'Introduce BuildPair, its homeowner/tradesperson journeys and routes into the marketplace.', usefulFor: ['explaining BuildPair', 'choosing homeowner or tradesperson path', 'finding a trade', 'understanding launch or waiting-list messaging shown on the page'] } },
  { test: (p) => p.includes('/directory'), context: { name: 'Trades directory', purpose: 'Browse and discover tradespeople.', usefulFor: ['choosing the right trade', 'what to check before contacting someone', 'understanding profiles and reviews'] } },
  { test: (p) => p.includes('/for-homeowners'), context: { name: 'For homeowners', purpose: 'Explain the homeowner benefits and workflow.', usefulFor: ['posting a job', 'comparing quotes', 'messaging tradespeople', 'job and payment workflow'] } },
  { test: (p) => p.includes('/for-tradespeople'), context: { name: 'For tradespeople', purpose: 'Explain the tradesperson benefits and workflow.', usefulFor: ['profiles', 'finding jobs', 'quotes and invoices', 'business tools', 'membership concepts'] } },
  { test: (p) => p.includes('/how-it-works'), context: { name: 'How BuildPair works', purpose: 'Explain the end-to-end BuildPair journey.', usefulFor: ['homeowner workflow', 'tradesperson workflow', 'quotes', 'messages', 'BuildPay'] } },
  { test: (p) => p.includes('/building-regulations'), context: { name: 'Building regulations information', purpose: 'Provide general information and signposting about building-regulation topics.', usefulFor: ['understanding when specialist or official advice may be needed', 'finding relevant BuildPair guidance'] } },
  { test: (p) => p.includes('/advice'), context: { name: 'Home-improvement advice', purpose: 'General BuildPair advice content.', usefulFor: ['planning work', 'choosing trades', 'preparing a useful job post'] } },
  { test: (p) => p.includes('/contact'), context: { name: 'Contact BuildPair', purpose: 'Help visitors find the appropriate BuildPair contact route.', usefulFor: ['support and contact options'] } },
  { test: (p) => p.includes('/download'), context: { name: 'Download BuildPair', purpose: 'Explain available BuildPair app/download options shown on the page.', usefulFor: ['app availability', 'installation guidance'] } },

  { test: (p) => p.includes('/customer/new-job'), context: { name: 'Post a job', purpose: 'Create a clear homeowner job request.', usefulFor: ['choosing the likely trade', 'writing the job description', 'deciding what photos/details to add', 'clarifying urgency and access'] } },
  { test: (p) => p.includes('/customer/compare'), context: { name: 'Compare quotes', purpose: 'Compare quotes received for a homeowner job.', usefulFor: ['comparing scope and exclusions', 'understanding quote differences', 'what to ask before accepting', 'staged-payment concepts'] } },
  { test: (p) => p.includes('/customer/jobs/'), context: { name: 'Homeowner job details', purpose: 'Manage or review one posted/accepted job.', usefulFor: ['understanding the current job workflow', 'quotes', 'messages', 'job stages', 'payment concepts'] } },
  { test: (p) => p.includes('/customer/jobs'), context: { name: 'Homeowner jobs', purpose: 'See and manage homeowner jobs.', usefulFor: ['job status concepts', 'opening a job', 'posting another job'] } },
  { test: (p) => p.includes('/customer/messages'), context: { name: 'Homeowner messages', purpose: 'Communicate with tradespeople.', usefulFor: ['drafting a clear message', 'questions to ask a tradesperson', 'keeping decisions recorded'] } },
  { test: (p) => p.includes('/customer/saved-trades'), context: { name: 'Saved trades', purpose: 'Review tradespeople the homeowner has saved.', usefulFor: ['shortlisting', 'comparing profiles'] } },
  { test: (p) => p.includes('/customer/profile'), context: { name: 'Homeowner profile', purpose: 'Manage homeowner account/profile information.', usefulFor: ['profile guidance', 'account basics'] } },
  { test: (p) => p.includes('/customer/dashboard'), context: { name: 'Homeowner dashboard', purpose: 'Homeowner overview and next actions.', usefulFor: ['finding jobs, quotes, messages and relevant next steps'] } },

  { test: (p) => p.includes('/trader/onboarding'), context: { name: 'Tradesperson onboarding', purpose: 'Set up a tradesperson account and business presence.', usefulFor: ['profile setup', 'trades/services', 'service area', 'making the profile useful to homeowners'] } },
  { test: (p) => p.includes('/trader/job-board'), context: { name: 'Tradesperson job board', purpose: 'Browse relevant homeowner work.', usefulFor: ['understanding a job', 'questions to ask before quoting', 'deciding whether the scope matches the trade', 'preparing a quote'] } },
  { test: (p) => p.includes('/trader/my-jobs'), context: { name: 'Tradesperson jobs', purpose: 'Manage jobs being worked on or won.', usefulFor: ['job workflow', 'customer communication', 'stages', 'invoicing and payment concepts'] } },
  { test: (p) => p.includes('/trader/jobs/'), context: { name: 'Tradesperson job details', purpose: 'Review and manage one job.', usefulFor: ['scope', 'questions for the customer', 'quote/job progression', 'payment-stage concepts'] } },
  { test: (p) => p.includes('/trader/quotes'), context: { name: 'Tradesperson quotes', purpose: 'Prepare or manage quotes.', usefulFor: ['quote wording', 'scope and exclusions', 'payment stages', 'what a clear quote should contain'] } },
  { test: (p) => p.includes('/trader/invoices'), context: { name: 'Tradesperson invoices', purpose: 'Create or manage invoices.', usefulFor: ['invoice wording', 'what information belongs on an invoice', 'linking invoice and job workflow'] } },
  { test: (p) => p.includes('/trader/messages'), context: { name: 'Tradesperson messages', purpose: 'Communicate with homeowners.', usefulFor: ['drafting replies', 'asking scope questions', 'confirming job details clearly'] } },
  { test: (p) => p.includes('/trader/profile'), context: { name: 'Tradesperson profile', purpose: 'Manage the public business profile.', usefulFor: ['profile copy', 'services', 'credentials and trust information', 'improving homeowner clarity'] } },
  { test: (p) => p.includes('/trader/analytics'), context: { name: 'Tradesperson analytics', purpose: 'Review BuildPair performance information.', usefulFor: ['understanding metrics shown on the page', 'improving profile/job activity based on available data'] } },
  { test: (p) => p.includes('/trader/google-reviews'), context: { name: 'Google Reviews', purpose: 'Manage supported Google Review connection/import features.', usefulFor: ['review connection concepts', 'how reviews support a BuildPair profile'] } },
  { test: (p) => p.includes('/trader/saved-searches'), context: { name: 'Saved job searches', purpose: 'Manage saved criteria for finding relevant work.', usefulFor: ['search criteria', 'finding suitable jobs more efficiently'] } },
  { test: (p) => p.includes('/trader/dashboard'), context: { name: 'Tradesperson dashboard', purpose: 'Tradesperson overview and next actions.', usefulFor: ['jobs', 'quotes', 'messages', 'profile', 'business workflow'] } },
];

export function buildPairPageContext(pathname: string, audience: BuildPairAudience) {
  const path = ((pathname.toLowerCase().split('?')[0] ?? '').replace(/\/$/, '')) || '/';
  const match = pageContexts.find((item) => item.test(path));
  if (match) {
    return `Current page: ${match.context.name}. Purpose: ${match.context.purpose} Helpful topics here: ${match.context.usefulFor.join(', ')}.`;
  }

  if (audience === 'homeowner') {
    return 'Current area: signed-in homeowner section. Prioritise homeowner jobs, quotes, messages, saved trades, profile and payment guidance relevant to the question.';
  }
  if (audience === 'tradesperson') {
    return 'Current area: signed-in tradesperson section. Prioritise job discovery, quotes, jobs, invoices, messages, profile, analytics and payment guidance relevant to the question.';
  }
  return 'Current area: public BuildPair site. Prioritise explaining BuildPair, helping the visitor choose the correct route and giving accurate navigation.';
}
