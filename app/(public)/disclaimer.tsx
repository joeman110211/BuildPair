import { PublicInfoPage } from '@/components/PublicInfoPage';

export default function DisclaimerPage() {
  return <PublicInfoPage
    eyebrow="Legal"
    title="Marketplace Disclaimer"
    intro="BuildPair helps people find, compare and communicate with tradespeople. It does not replace checks that are appropriate for the work being commissioned."
    updated="17 October 2026"
    sections={[
      { title: 'BuildPair is a platform', body: 'Unless BuildPair explicitly states otherwise for a specific service, BuildPair does not carry out the building work advertised or posted through the marketplace and is not a party to the underlying contract between homeowner and tradesperson.' },
      { title: 'Profiles and supplied information', body: 'Some profile content is supplied by tradespeople themselves. BuildPair may provide verification or moderation features, but users should not assume every statement, qualification, insurance policy or registration has been independently verified unless the interface specifically says it has.' },
      { title: 'Regulated and specialist work', body: 'For gas, electrical, structural, planning, asbestos and other regulated or safety-critical work, users should verify the registrations, competence, approvals and insurance relevant to that job before appointment.' },
      { title: 'Reviews', body: 'Reviews can be useful marketplace signals but are opinions based on individual experiences. They do not guarantee future performance and should be considered alongside other information.' },
      { title: 'Pricing and estimates', body: 'Quotes, budget ranges and estimates displayed through BuildPair are not guarantees unless the parties separately agree that they are binding. Users should confirm scope, exclusions, VAT, materials, payment stages and variation terms before work begins.' },
      { title: 'Commercial partners and sponsored suggestions', body: 'Some business listings, offers or future product suggestions may be paid advertisements and will be clearly labelled. A sponsorship is not proof that a business is independently recommended, the cheapest, insured for a particular job or suitable for every customer. BuildPair does not guarantee third-party pricing, discounts, stock, service, delivery, insurance cover, workmanship or lead results. Compare alternatives and check the provider’s own terms. Partner advertising should not replace independent editorial guidance or the homeowner’s or tradesperson’s choice.' },
      { title: 'No professional advice', body: 'General information or AI-assisted suggestions shown by BuildPair are for navigation and drafting support. They are not legal, structural, engineering, building-control, safety or other professional advice.' },
    ]}
  />;
}
