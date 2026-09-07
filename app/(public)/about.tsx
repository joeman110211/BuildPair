import { Text, View } from 'react-native';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function AboutPage() {
  return <PublicInfoPage
    eyebrow="About BuildPair"
    title="Not another directory. A connected operating layer for home-improvement work."
    intro="BuildPair is a UK-focused marketplace and project platform designed to stay useful from the moment somebody describes a problem through discovery, quoting, hiring, communication, approved changes, project milestones, payment records and long-term reputation. Underneath the interface is a set of matching, AI-assistance, workflow, trust and business systems built around the same job."
    sections={[
      {
        title: 'Why BuildPair exists',
        body: 'Finding a tradesperson is only the first part of a home-improvement project. Homeowners still need to work out who they actually need, judge useful evidence, compare quotes properly, keep scope clear and avoid losing important decisions across texts, calls, notes and bank references. Tradespeople face the other side of the same mess: poor-quality leads, unpaid quoting time, fragmented communication, weak profile ownership and a pile of separate tools. BuildPair is designed around the whole relationship rather than stopping at the introduction.'
      },
      {
        title: 'One product, four connected layers',
        body: <View style={infoStyles.list}>
          <Text style={infoStyles.item}>• Discovery and matching: public search, broad UK trade categories, specific services, related homeowner terms, postcode-led location and service-radius matching.</Text>
          <Text style={infoStyles.item}>• Marketplace and trust: searchable trade profiles, galleries, project stories, credentials, availability, jobs, direct requests, genuine project reviews, reporting and moderation.</Text>
          <Text style={infoStyles.item}>• Project workflow: job-linked messages, structured quotes, quote comparison, approved variations, timeline events, payment milestones and completion history.</Text>
          <Text style={infoStyles.item}>• Trade business tools: profile management, job pipeline, saved searches, alerts, invoices and business analytics.</Text>
        </View>
      },
      {
        title: 'The intelligence layer: AI trade triage',
        body: 'A homeowner should not need to diagnose the profession before asking for help. BuildPair’s current AI trade-triage service can use Google Gemini to interpret a plain-English description, choose the closest category from BuildPair’s own trade taxonomy, suggest sensible alternatives and return useful follow-up questions. It is constrained to the platform’s category list and is told not to present dangerous electrical, gas or structural situations as safe. If the AI service is unavailable, deterministic matching rules provide a fallback for common problems.'
      },
      {
        title: 'The intelligence layer: AI job specifications',
        body: 'A vague post such as “need bathroom done” creates work for everyone later. BuildPair’s job-spec assistant can turn structured homeowner answers into a cleaner UK domestic trade brief covering scope, current condition, materials responsibility, access and timing, plus a final list of things the tradesperson still needs to confirm. The model is explicitly instructed not to invent dimensions, costs, certifications or safety claims. The purpose is clarity, not pretending software has inspected the property.'
      },
      {
        title: 'The intelligence layer: quote assistance without AI maths',
        body: 'The quote assistant helps a tradesperson draft professional wording around scope, exclusions, payment terms, likely duration, warranty and notes. Monetary inputs such as labour, materials and VAT are calculated deterministically by BuildPair rather than being left to a language model. That separation is deliberate: AI is useful for turning context into clearer wording, but commercial totals should come from explicit inputs and normal calculations.'
      },
      {
        title: 'The intelligence layer: job-aware message assistance',
        body: 'BuildPair’s message assistant can use the relevant job details and recent conversation to offer concise reply suggestions for the homeowner or tradesperson. Its instructions prohibit inventing prices, dates, measurements, qualifications or promises, discourage moving communication or payment off-platform to bypass safeguards, and steer argumentative conversations towards factual boundary-setting rather than escalation. The user still chooses, edits and sends the message.'
      },
      {
        title: 'AI assists. It does not become the contractor, surveyor or decision-maker.',
        body: <View style={infoStyles.callout}>
          <Text style={infoStyles.calloutText}>BuildPair uses AI at defined points to reduce ambiguity and admin. Generated trade suggestions, specifications, quote wording and reply options remain assistance. They do not replace an inspection, qualified tradesperson, regulated professional, legal advice, a safety assessment or the user’s responsibility for what they agree and send.</Text>
        </View>
      },
      {
        title: 'Built around the job, not the listing',
        body: 'Traditional directories are most valuable at discovery and then largely disappear from the project. BuildPair is intended to remain useful after somebody is found. The original job, conversation, quote, agreed variations, timeline, payment stages and completion record can stay connected so both sides have a clearer shared history instead of reconstructing it from screenshots and memory.'
      },
      {
        title: 'Structured quoting and comparison',
        body: 'A useful quote is more than a total. BuildPair can keep scope, exclusions, start date, estimated duration, deposit, stages, warranty information and other project detail in a consistent structure. Homeowners can compare the substance of competing quotes more easily, while tradespeople can make clear what is and is not included before work begins.'
      },
      {
        title: 'Variations, milestones and the project timeline',
        body: 'Home-improvement work changes. Hidden defects appear, customers add work and timings move. Instead of relying on a phone call everybody remembers differently, BuildPair variations can record what changed and the effect on price or timing before approval. Timeline events and payment milestones then keep those decisions attached to the project as it progresses.'
      },
      {
        title: 'Trust without pretending one badge solves everything',
        body: 'BuildPair can organise credentials, review status, work examples, marketplace history, availability and service information. Reporting and human moderation provide a route for concerns such as scams, harassment, unsafe behaviour, misleading credentials, poor workmanship, non-payment or payment disputes. None of this removes the need for job-specific checks, particularly where registration, qualifications, insurance, permissions or specialist competence matter.'
      },
      {
        title: 'A business system for trades, not just a lead tap',
        body: 'The tradesperson side is designed to remain useful after a lead is won. Profiles, local jobs, direct requests, saved searches, alerts, invoices, project stories and analytics give a business one place to present itself and manage more of the customer journey. BuildPair’s goal is to create durable business value rather than charging somebody merely for the privilege of pitching.'
      },
      {
        title: 'One identity, two modes, multiple platforms',
        body: 'The same BuildPair identity can support Homeowner and Tradesperson modes, which means somebody running a trade business does not need a second account to hire another trade at home. The product is built cross-platform so the web experience and the Android and iOS applications share the same core marketplace and workflow rather than becoming unrelated products.'
      },
      {
        title: 'Built for the UK',
        body: 'The trade taxonomy, postcode-led matching, marketplace wording, commercial model and public guidance are being designed around UK homeowners and tradespeople. The Advice Hub and Building Rules area are intended to point users towards current official information rather than freezing mutable regulation into marketing copy that quietly becomes wrong.'
      },
      {
        title: 'What BuildPair is not',
        body: 'BuildPair is not the contractor carrying out the work, an employer of independent tradespeople, a regulator, a building-control body or a substitute for professional advice. It provides marketplace, communication, assistance and project-management technology so users can make better-informed decisions and keep a clearer record of the work they choose to undertake together.'
      },
    ]}
  />;
}