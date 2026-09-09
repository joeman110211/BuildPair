import { PublicInfoPage } from '@/components/PublicInfoPage';

export default function CookiesPage() {
  return <PublicInfoPage
    eyebrow="Legal"
    title="Cookie & Analytics Storage Policy"
    intro="BuildPair uses browser storage and similar technologies where needed to keep sessions working, remember choices and understand how the service is used."
    updated="9 September 2026"
    sections={[
      { title: 'Essential storage', body: 'Some cookies or local-storage items are necessary for authentication, account security, navigation and core app behaviour. Disabling these may stop parts of BuildPair from working correctly.' },
      { title: 'Preference storage', body: 'BuildPair may store limited preferences such as account mode, interface choices and analytics choices so they do not need to be selected every visit. Storage used solely to remember an analytics objection or consent choice is not reused for advertising or profiling.' },
      { title: 'Basic statistical analytics', body: 'BuildPair uses privacy-conscious first-party statistical analytics to count and aggregate information such as page views, meaningful clicks, scroll depth, time on pages, referral source, broad device/browser/operating-system categories and coarse location signals where available. The purpose is solely to understand and improve the BuildPair website and service. Basic analytics does not create or retain an individual visitor journey and does not use advertising trackers or cross-site identifiers. Visitors can object at any time using the Analytics choices control.' },
      { title: 'Optional detailed journey analytics', body: 'Detailed journey analytics is separate from basic statistics and is not enabled unless a visitor actively chooses “Allow detailed”. If enabled, BuildPair stores an anonymous visitor identifier for up to 90 days and a visit-session identifier so the sequence of pages, meaningful clicks, scroll milestones and named form fields reached can be reviewed for product-improvement purposes. The contents typed into fields are not recorded. Turning detailed analytics off removes the local identifiers and requests deletion of detailed journey records associated with that anonymous identifier.' },
      { title: 'What we do not use for visitor analytics', body: 'BuildPair does not use visitor analytics to store passwords, raw payment credentials, bank details, raw IP addresses, precise GPS location, mouse-movement recordings, hidden keystrokes, advertising profiles, cross-site behaviour or device fingerprinting designed to identify someone after they object.' },
      { title: 'Third-party services', body: 'Authentication, payment, hosting and other service providers may set or read their own cookies or storage when their features are used. Their handling of those technologies is governed by their own notices and our agreements with them. BuildPair’s own visitor analytics is designed as a first-party product-improvement system rather than an advertising tracker.' },
      { title: 'Managing analytics choices', body: 'The Analytics choices control lets a visitor keep basic aggregate statistics, explicitly allow detailed journey analytics, or turn analytics off. Browser settings can also block or delete stored values, although blocking essential authentication storage may affect sign-in and app functionality.' },
      { title: 'Contact', body: 'Questions about cookies, browser storage or tracking technologies can be sent to info@buildpair.co.uk.' },
    ]}
  />;
}
