import type { ReactNode } from 'react';

const paths: Record<string, ReactNode> = {
  check: <path d="m5 12 4 4L19 6" />,
  home: <><path d="m3 10 9-7 9 7v11H3Z" /><path d="M9 21v-8h6v8" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  quote: <><path d="M6 3h9l4 4v14H5V3Z" /><path d="M14 3v5h5M8 12h8M8 16h5" /></>,
  message: <><path d="M21 11a9 9 0 0 1-9 9 10 10 0 0 1-4-1l-5 2 1-5a9 9 0 1 1 17-5Z" /><path d="M8 10h8M8 14h5" /></>,
  shield: <><path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6Z" /><path d="m8 12 3 3 5-6" /></>,
  sparkle: <><path d="m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z" /><path d="M20 2v4M18 4h4" /></>,
  tools: <><path d="M14 6a5 5 0 0 0-6 6L2 18l4 4 6-6a5 5 0 0 0 6-6l-4 3-3-3Z" /><path d="m15 3 6 6" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 2v6M17 2v6M3 11h18m-13 5 2 2 5-4" /></>,
  wallet: <><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M3 9h18M15 13h6v4h-6Z" /></>,
  star: <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" />,
  tiles: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  water: <path d="M12 2S4 11 4 16a8 8 0 0 0 16 0c0-5-8-14-8-14Z" />,
  bolt: <path d="m13 2-9 12h7l-1 8 10-13h-8Z" />,
  paint: <><rect x="3" y="3" width="15" height="6" rx="2" /><path d="M18 6h3v7h-9v3M10 16h4v6h-4Z" /></>,
  kitchen: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 10h18M11 10v11M15 14v3M7 14v3M6 7h2M15 7h3" /></>,
  bath: <><path d="M3 12h18v4a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4ZM5 12V5a3 3 0 0 1 6 0M6 20v2M18 20v2" /></>,
};
export function HomeIcon({ name, size = 22 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.tools}</svg>;
}

export function ProjectPreview({ variant = 'project' }: { variant?: 'project' | 'quote' | 'messages' | 'planning' }) {
  return <div className={`bp-preview bp-preview--${variant}`} aria-label="Illustrative BuildPair project preview">
    <div className="bp-preview-top"><span className="bp-preview-mark">b<span>p</span></span><span>{variant === 'quote' ? 'Your quote' : variant === 'messages' ? 'Project messages' : variant === 'planning' ? 'Job planning' : 'Your project'}</span><span className="bp-example">Example</span></div>
    {variant === 'planning' ? <>
      <div className="bp-chat bp-chat-user">“I’d like to update my bathroom.”</div>
      <div className="bp-plan-result"><span className="bp-icon-box bp-lilac"><HomeIcon name="sparkle" /></span><div><strong>A clearer starting point</strong><small>Bathroom renovation · Draft brief</small></div></div>
      <div className="bp-mini-tags"><span>Scope of work</span><span>Photos</span><span>Site visit</span></div>
      <div className="bp-preview-line"><HomeIcon name="check" size={18} /> Review your brief before posting</div>
    </> : variant === 'quote' ? <>
      <strong className="bp-preview-title">Bathroom tiling</strong>
      <div className="bp-quote-row"><span>Materials</span><strong>£240</strong></div><div className="bp-quote-row"><span>Labour</span><strong>£560</strong></div>
      <div className="bp-quote-total"><span>Agreed total</span><strong>£800</strong></div>
      <div className="bp-mini-tags"><span>Scope included</span><span>Stages agreed</span></div>
    </> : variant === 'messages' ? <>
      <div className="bp-chat">Would Tuesday suit for a site visit?</div><div className="bp-chat bp-chat-user">Yes, after 10am works for me.</div>
      <div className="bp-message-event"><HomeIcon name="calendar" size={19} /><span>Site visit agreed <strong>Tuesday · 10:30am</strong></span></div>
      <div className="bp-preview-line"><HomeIcon name="check" size={18} /> Saved to the project timeline</div>
    </> : <>
      <div className="bp-project-heading"><div><small>HOME IMPROVEMENT</small><strong>Bathroom renovation</strong></div><span className="bp-status">In progress</span></div>
      <div className="bp-stage-line"><span /><span /><span className="bp-stage-pending" /></div>
      <div className="bp-stage-labels"><span>Quote agreed</span><span>Work started</span><span>Complete</span></div>
      <div className="bp-project-event"><span className="bp-icon-box bp-mint"><HomeIcon name="quote" /></span><div><strong>Everything in one place</strong><small>Quote · Messages · Payment stages</small></div><HomeIcon name="check" size={20} /></div>
    </>}
  </div>;
}

export function PaymentPreview({ privatePayment = false }: { privatePayment?: boolean }) {
  return <div className="bp-payment-visual" aria-label={privatePayment ? 'Private payment route' : 'BuildPair payment stages'}>
    <div className="bp-payment-heading"><span className="bp-icon-box bp-mint"><HomeIcon name="wallet" /></span><strong>{privatePayment ? 'Your own arrangement' : <>Build<span className="bp-orange">Pay</span></>}</strong><span className="bp-example">How it works</span></div>
    {privatePayment ? <><div className="bp-private-path"><span><HomeIcon name="home" size={30} />Homeowner</span><span className="bp-payment-arrow">↔</span><span><HomeIcon name="tools" size={30} />Tradesperson</span></div><div className="bp-preview-line"><HomeIcon name="quote" size={18} /> Keep the project record in BuildPair</div></> : <div className="bp-payment-stages">
      <div><span className="bp-stage-number">1</span><span><strong>Upfront materials or deposit</strong><small>Transfers to the trade when paid</small></span></div>
      <div><span className="bp-stage-number bp-stage-number--mint">2</span><span><strong>Progress and final stages</strong><small>Fund → Release requested → You approve</small></span></div>
      <div className="bp-release-note"><HomeIcon name="check" size={18} /> Your approval before these stages transfer</div>
    </div>}
  </div>;
}
