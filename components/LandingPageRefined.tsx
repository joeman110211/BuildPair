import { type FormEvent, useState } from 'react';
import { ScrollView } from 'react-native';
import { PublicFooter } from '@/components/PublicFooter';
import { FeaturedTradesCarousel } from '@/components/FeaturedTradesCarousel';
import { HomeCarousel } from '@/components/HomeCarousel';
import { HomeTabs } from '@/components/HomeTabs';
import { HomeIcon, PaymentPreview, ProjectPreview } from '@/components/HomeVisuals';
import { HOME_STYLES } from '@/components/homepage-styles';
import { TRADE_CATEGORIES } from '@/constants/options';
import { LAUNCH_DATE_LABEL, REGISTRATION_OPEN } from '@/lib/launch-config';

const TRADES = [
  { name: 'Tiling', icon: 'tiles', tone: 'orange' },
  { name: 'Plumbing', icon: 'water', tone: 'blue' },
  { name: 'Electrical', icon: 'bolt', tone: 'lilac' },
  { name: 'Building & Extensions', icon: 'home', tone: 'mint' },
  { name: 'Roofing & Roofline', icon: 'home', tone: 'blue' },
  { name: 'Painting & Decorating', icon: 'paint', tone: 'orange' },
  { name: 'Kitchens', icon: 'kitchen', tone: 'mint' },
  { name: 'Bathrooms', icon: 'bath', tone: 'lilac' },
];
const STEPS = [
  { title: 'Tell us about the job', text: 'Describe the work and add useful photos. A clear brief is a better starting point.', icon: 'home', tone: 'orange', chip: 'Your idea → A clear brief' },
  { title: 'Find your local trade', text: 'Explore profiles and past work. Invite a quote or arrange a site visit.', icon: 'search', tone: 'blue', chip: 'Local profiles → Your shortlist' },
  { title: 'Agree the details', text: 'Compare scope, costs and timings. Agree the quote and payment stages together.', icon: 'quote', tone: 'lilac', chip: 'Clear quote → Shared agreement' },
  { title: 'Keep the job together', text: 'Messages, agreed changes and progress stay with the project through to completion.', icon: 'check', tone: 'mint', chip: 'Work in progress → Job complete' },
];
const TOOLS = [
  { title: 'A clearer brief, with AI support', text: 'Turn your first idea into a useful job description. You review it before it goes anywhere.', variant: 'planning' as const, tone: 'lilac' },
  { title: 'Quotes you can actually compare', text: 'See the scope, exclusions, materials and labour together, with the payment stages attached.', variant: 'quote' as const, tone: 'orange' },
  { title: 'Conversations with context', text: 'Questions, site visits and decisions stay attached to the right job.', variant: 'messages' as const, tone: 'blue' },
  { title: 'One place for the whole project', text: 'Follow progress, agree changes and keep a useful record from first quote to final review.', variant: 'project' as const, tone: 'mint' },
];
const TRUST = [
  { icon: 'pin', tone: 'blue', title: 'Local means local', text: 'Tradespeople set a service base and working radius, so job matching starts with the area they cover.', tag: 'Matched to a real service area' },
  { icon: 'shield', tone: 'mint', title: 'Know what has been checked', text: 'See submitted credential statuses. Check the relevant qualifications and registers for your job.', tag: 'Clear credential status' },
  { icon: 'star', tone: 'orange', title: 'Reputation with context', text: 'See past work and distinguish verified completed-job reviews from profile information.', tag: 'Real work. Useful evidence.' },
  { icon: 'message', tone: 'lilac', title: 'A record when it matters', text: 'Keep agreed changes and conversations together. Both sides can report concerns for human review.', tag: 'Project history stays connected' },
];
const PLANS = [
  { name: 'Starter', price: '0', tone: 'plain', text: 'Get your business established.', features: ['Shareable business profile', 'Up to 2 main trade categories', 'Browse marketplace jobs'] },
  { name: 'Plus', price: '19.99', tone: 'orange', text: 'Be found. Start winning work.', features: ['Searchable marketplace profile', 'Direct homeowner quote requests', '15 marketplace offers per month'] },
  { name: 'Pro', price: '29.99', tone: 'navy', text: 'More capacity. More insight.', features: ['Everything in Plus', '35 marketplace offers per month', 'Analytics and priority alerts'] },
];
const FAQS = [
  ['When can I join BuildPair?', `BuildPair launches on ${LAUNCH_DATE_LABEL}. Join the launch list for an email when registration opens. Existing members can still sign in. You can also register interest in limited pre-launch testing on the waiting-list page.`],
  ['What if the tradesperson needs to see the job first?', 'You can arrange a site visit through the job before a formal quote is sent. The quote, messages and proposed payment stages then stay in the same project.'],
  ['How do staged payments work?', 'Upfront materials payments and deposits transfer to the tradesperson when paid. Progress and final stages are funded first, then transfer only after the tradesperson requests release and the homeowner approves. Supported payments are processed through Stripe.'],
  ['Can we arrange payment privately?', 'Yes. Keep the quote and project record in BuildPair, and pay the tradesperson directly if you both prefer. BuildPair cannot process, pause, refund or recover money paid outside its payment flow.'],
  ['Does BuildPair guarantee the work?', 'No. BuildPair provides marketplace and project tools; it does not inspect or guarantee workmanship and is not an escrow service. Review the trade’s work, credentials and suitability before appointing them.'],
  ['What is included in trade membership?', 'Starter is free. Plus is £19.99 per month and Pro is £29.99 per month. Paid memberships add marketplace access and business tools. Direct homeowner requests do not use your monthly marketplace-offer allowance. Payment transaction fees are separate.'],
];
const joinHref = (audience?: 'homeowner' | 'trader') => REGISTRATION_OPEN ? '/auth/account' : `/waitlist?source=homepage${audience ? `&audience=${audience}` : ''}`;

function Heading({ eyebrow, title, copy, light = false }: { eyebrow: string; title: string; copy?: string; light?: boolean }) {
  return <div className={`bp-section-heading${light ? ' bp-section-heading--light' : ''}`}><span className="bp-eyebrow">{eyebrow}</span><h2>{title}</h2>{copy ? <p>{copy}</p> : null}</div>;
}

export default function LandingPageRefined() {
  const [search, setSearch] = useState('');
  const [motionPaused, setMotionPaused] = useState(false);
  const [audience, setAudience] = useState<'homeowner' | 'trader'>('homeowner');
  const [payment, setPayment] = useState<'buildpay' | 'private'>('buildpay');
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.location.assign(`/directory${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''}`);
  }

  return <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF' }} contentContainerStyle={{ flexGrow: 1, width: '100%', minWidth: 0 }}>
    <style>{HOME_STYLES}</style>
    <main className={`bp-home${motionPaused ? ' bp-motion-paused' : ''}`} data-testid="visual-homepage">
      {!REGISTRATION_OPEN ? <div className="bp-launch-bar"><span>Launching <strong>{LAUNCH_DATE_LABEL}</strong></span><span className="bp-launch-divider" aria-hidden="true" /><a href={joinHref()}>Join the launch list <span aria-hidden="true">↗</span></a></div> : null}
      <section className="bp-hero">
        <div className="bp-hero-glow" aria-hidden="true" />
        <div className="bp-hero-inner bp-container">
          <div className="bp-float bp-float--left" aria-hidden="true"><span className="bp-icon-box bp-mint"><HomeIcon name="check" /></span><span>Quote agreed<small>Everyone on the same page</small></span></div>
          <div className="bp-float bp-float--right" aria-hidden="true"><span className="bp-icon-box bp-orange-soft"><HomeIcon name="pin" /></span><span>Local expertise<small>The right people, nearby</small></span></div>
          <span className="bp-hero-eyebrow">YOUR HOME. THEIR CRAFT. ONE CONNECTION.</span>
          <h1>Find the right trade.<br /><span>Bring your project to life.</span></h1>
          <p className="bp-hero-description">Meet local tradespeople, compare clear quotes and manage the whole job in one place. From the first idea to the final detail.</p>
          <div className="bp-hero-actions"><a href={joinHref('homeowner')} className="bp-button bp-button--primary">{REGISTRATION_OPEN ? 'Post a job' : 'Join the launch list'}<span aria-hidden="true">↗</span></a><a href="/for-tradespeople" className="bp-button bp-button--outline">I’m a tradesperson</a></div>
          <div className="bp-hero-proof"><span><HomeIcon name="pin" size={16} />Local trade matching</span><span><HomeIcon name="quote" size={16} />Clear quotes</span><span><HomeIcon name="message" size={16} />One project record</span></div>
          <button type="button" className="bp-motion-toggle" aria-pressed={motionPaused} onClick={() => setMotionPaused(value => !value)}>{motionPaused ? 'Resume motion' : 'Pause motion'}</button>
        </div>
      </section>

      <FeaturedTradesCarousel />

      <section className="bp-search-section bp-container" aria-labelledby="bp-find-title" data-testid="home-find-trade">
        <div className="bp-search-panel"><div className="bp-search-heading"><span className="bp-icon-box bp-orange-soft"><HomeIcon name="search" /></span><div><h2 id="bp-find-title">Find a trade</h2><p>What have you got in mind?</p></div></div>
          <form className="bp-search-form" onSubmit={submitSearch} action="/directory" method="get"><label className="bp-sr-only" htmlFor="bp-trade-search">Describe the work you need done</label><HomeIcon name="search" /><input id="bp-trade-search" type="search" name="q" value={search} onChange={event => setSearch(event.target.value)} placeholder="Try ‘bathroom tiling’ or ‘leaking tap’" /><button className="bp-button bp-button--primary" type="submit">Find a trade <span aria-hidden="true">→</span></button></form>
        </div>
        <div className="bp-category-grid">{TRADES.map(trade => <a key={trade.name} className="bp-category" href={`/directory?trade=${encodeURIComponent(trade.name)}`}><span className={`bp-icon-box bp-${trade.tone === 'orange' ? 'orange-soft' : trade.tone}`}><HomeIcon name={trade.icon} size={25} /></span><span>{trade.name}</span></a>)}</div>
        <a className="bp-text-link bp-center-link" href="/directory">Explore all {TRADE_CATEGORIES.length} trade categories <span aria-hidden="true">↗</span></a>
      </section>

      <section className="bp-audience-section bp-container" aria-label="BuildPair for homeowners and tradespeople">
        <Heading eyebrow="A marketplace that goes further" title="The introduction is just the beginning." />
        <HomeTabs label="Choose your experience" options={[{ value: 'homeowner', label: 'For homeowners', icon: 'home' }, { value: 'trader', label: 'For tradespeople', icon: 'tools' }]} value={audience} onChange={setAudience} panelId="bp-audience-panel" />
        <div className={`bp-audience-panel bp-audience-panel--${audience}`} id="bp-audience-panel" role="tabpanel" aria-label={audience === 'homeowner' ? 'For homeowners' : 'For tradespeople'}>
          <div className="bp-audience-copy" key={audience}><span className="bp-eyebrow">{audience === 'homeowner' ? 'From “where do I start?” to “job done.”' : 'Your trade. Your business.'}</span><h3>{audience === 'homeowner' ? 'A great home project starts with a clear plan.' : 'Win the work. Then run it professionally.'}</h3><p>{audience === 'homeowner' ? 'Find the right people, agree the details and stay connected as the work takes shape.' : 'Build your reputation, find local opportunities and keep quotes, customers and jobs organised.'}</p><ul className="bp-tick-list">{(audience === 'homeowner' ? ['Browse real profiles and past work', 'Compare quotes and agree payment stages', 'Keep messages and changes with the job'] : ['A profile that shows what you do best', 'Local job opportunities and direct requests', 'Quotes, invoices and project tools together']).map(text => <li key={text}><HomeIcon name="check" size={18} />{text}</li>)}</ul><a className="bp-button bp-button--primary" href={audience === 'homeowner' ? '/for-homeowners' : '/for-tradespeople'}>Explore {audience === 'homeowner' ? 'homeowner' : 'trade'} features <span aria-hidden="true">↗</span></a></div>
          <div className="bp-audience-visual"><div className="bp-preview-orbit" aria-hidden="true" /><ProjectPreview variant={audience === 'homeowner' ? 'project' : 'quote'} /><div className="bp-visual-float"><HomeIcon name={audience === 'homeowner' ? 'message' : 'calendar'} size={19} /><span>{audience === 'homeowner' ? 'The next step, made clear.' : 'Less admin. More time on the tools.'}</span></div></div>
        </div>
      </section>

      <section className="bp-steps-section"><div className="bp-container"><Heading eyebrow="How it works" title="Your next project, in four clear steps." copy="Quote remotely or arrange a visit first. There’s room for the way real jobs work." /><HomeCarousel label="Project steps" variant="steps">{STEPS.map((step, index) => <article key={step.title} className={`bp-step-card bp-step-card--${step.tone}`}><div className="bp-step-visual"><span className={`bp-icon-box bp-${step.tone === 'orange' ? 'orange-soft' : step.tone}`}><HomeIcon name={step.icon} size={34} /></span><span className="bp-step-count">0{index + 1}</span></div><h3>{step.title}</h3><p>{step.text}</p><div className="bp-step-caption">{step.chip}</div></article>)}</HomeCarousel><a className="bp-text-link bp-center-link" href="/how-it-works">See the full process <span aria-hidden="true">↗</span></a></div></section>

      <section className="bp-tools-section bp-container"><Heading eyebrow="More than finding a lead" title="The tools to take it from here." copy="Good projects need more than an introduction. Keep the important parts connected." /><HomeCarousel label="Project tools" variant="tools">{TOOLS.map(tool => <article key={tool.title} className={`bp-tool-card bp-tool-card--${tool.tone}`}><div className="bp-tool-visual"><ProjectPreview variant={tool.variant} /></div><div className="bp-tool-copy"><h3>{tool.title}</h3><p>{tool.text}</p></div></article>)}</HomeCarousel></section>

      <section className="bp-payments-section"><div className="bp-container"><Heading eyebrow="Introducing BuildPay" title="A clear plan for paying, too." copy="Choose BuildPair payments or your own arrangement. Keep the agreement with the job." light /><HomeTabs label="Payment routes" options={[{ value: 'buildpay', label: 'BuildPair payments' }, { value: 'private', label: 'Pay privately' }]} value={payment} onChange={setPayment} panelId="bp-payment-panel" dark /><div className="bp-payment-panel" id="bp-payment-panel" role="tabpanel" aria-label={payment === 'buildpay' ? 'BuildPair payments' : 'Private payment'}><div className="bp-payment-copy"><h3>{payment === 'buildpay' ? 'Agree the stages. Know what happens next.' : 'Your arrangement, with a project record.'}</h3><p>{payment === 'buildpay' ? 'Upfront materials and deposits transfer when paid. Progress and final stages transfer after the trade requests release and you approve.' : 'Pay the tradesperson directly if you both prefer. Keep quotes, messages and changes in BuildPair, but privately paid money cannot be paused, refunded or recovered by BuildPair.'}</p><a className="bp-button bp-button--white" href="/payments">How payments work <span aria-hidden="true">↗</span></a></div><PaymentPreview privatePayment={payment === 'private'} /></div><p className="bp-payment-note">Stripe processes supported payments. BuildPair is not an escrow service and does not inspect or guarantee the work. Transaction fees are separate from membership.</p></div></section>

      <section className="bp-trust-section bp-container"><Heading eyebrow="Confidence comes from clarity" title="Know who you’re hiring. Keep the record." /><HomeCarousel label="Trust and safety" variant="trust">{TRUST.map(item => <article key={item.title} className="bp-trust-card"><div className={`bp-trust-visual bp-${item.tone === 'orange' ? 'orange-soft' : item.tone}`}><HomeIcon name={item.icon} size={36} /><span>{item.tag}</span></div><h3>{item.title}</h3><p>{item.text}</p></article>)}</HomeCarousel><a className="bp-text-link bp-center-link" href="/trust-safety">Our approach to trust and safety <span aria-hidden="true">↗</span></a></section>

      <section className="bp-membership-section"><div className="bp-container"><Heading eyebrow="For independent trades and growing teams" title="Start free. Choose your next step." copy="Straightforward membership for the way you work." /><HomeCarousel label="Membership plans" variant="plans">{PLANS.map(plan => <article key={plan.name} className={`bp-plan bp-plan--${plan.tone}`}><div className="bp-plan-heading"><h3>{plan.name}</h3>{plan.name === 'Pro' ? <span>More room to grow</span> : <HomeIcon name={plan.name === 'Plus' ? 'bolt' : 'tools'} size={22} />}</div><div className="bp-price">£{plan.price}<span>/ month</span></div><p>{plan.text}</p><ul className="bp-tick-list">{plan.features.map(feature => <li key={feature}><HomeIcon name="check" size={18} />{feature}</li>)}</ul><a href={joinHref('trader')} className={`bp-button ${plan.name === 'Pro' ? 'bp-button--white' : plan.name === 'Plus' ? 'bp-button--primary' : 'bp-button--outline'}`}>{REGISTRATION_OPEN ? 'Get started' : 'Join the trade launch list'}<span aria-hidden="true">↗</span></a></article>)}</HomeCarousel><p className="bp-membership-note">Direct homeowner requests don’t use your monthly marketplace-offer allowance. Payment transaction fees are separate.</p><a className="bp-text-link bp-center-link" href="/pricing">Compare every plan feature <span aria-hidden="true">↗</span></a></div></section>

      <section className="bp-faq-section bp-container"><Heading eyebrow="A few useful answers" title="Before you get started." /><div className="bp-faq-list">{FAQS.map(([question, answer]) => <details key={question} className="bp-faq"><summary>{question}<span className="bp-faq-plus" aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div><div className="bp-resource-links"><a href="/advice"><HomeIcon name="quote" size={18} />Advice Hub ↗</a><a href="/building-regulations"><HomeIcon name="home" size={18} />Building rules ↗</a><a href="/contact"><HomeIcon name="message" size={18} />Talk to BuildPair ↗</a></div></section>

      <section className="bp-final-section bp-container"><div className="bp-final"><span className="bp-final-accent" aria-hidden="true"><HomeIcon name="sparkle" size={42} /></span><span className="bp-eyebrow">LET’S BUILD SOMETHING BETTER</span><h2>Your next project.<br />A better way to begin.</h2><p>{REGISTRATION_OPEN ? 'Find the right trade and keep your whole project connected.' : `Join us for the launch on ${LAUNCH_DATE_LABEL}.`}</p><div className="bp-hero-actions"><a className="bp-button bp-button--primary" href={joinHref()}>{REGISTRATION_OPEN ? 'Get started' : 'Join the launch list'} <span aria-hidden="true">↗</span></a><a className="bp-button bp-button--outline" href="/directory">Explore the trades</a></div>{!REGISTRATION_OPEN ? <p className="bp-founding-offer"><strong>Founding trades offer:</strong> the first 50 eligible waiting-list trades to complete registration within 24 hours of launch get 3 months of Pro free. <a href={joinHref('trader')}>Register interest ↗</a></p> : null}</div></section>
    </main>
    <PublicFooter />
  </ScrollView>;
}
