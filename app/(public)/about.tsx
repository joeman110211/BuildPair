import { Text, View } from 'react-native';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function AboutPage() {
  return <PublicInfoPage
    eyebrow="About BuildPair"
    title="A better operating layer between homeowners and local trades."
    intro="BuildPair is a UK-focused marketplace and project-management platform designed to stay useful from the first description of a problem through to quote comparison, hiring, communication, approved changes, payment stages and verified reputation."
    sections={[
      { title: 'Why BuildPair exists', body: 'Finding a tradesperson is only the beginning of a home-improvement job. Homeowners still have to work out who they need, judge who to trust, compare quotes properly and keep control of scope and communication. Tradespeople face a different problem: lead quality, unpaid quoting time, scattered messages, weak online presentation and too many separate tools. BuildPair is designed around both sides of that same project.' },
      { title: 'One product, four connected layers', body: <View style={infoStyles.list}><Text style={infoStyles.item}>• Discovery and matching: public trade search, broad trade categories, services, related search terms, location and service-radius matching.</Text><Text style={infoStyles.item}>• Marketplace and trust: profiles, work galleries, credentials, availability, jobs, direct requests and reviews.</Text><Text style={infoStyles.item}>• Project workflow: messages, structured quotes, quote comparison, variations, timeline events, milestones and completion history.</Text><Text style={infoStyles.item}>• Trade business tools: profile presentation, job pipeline, invoices, saved searches, alerts and analytics.</Text></View> },
      { title: 'Built around the job, not the directory listing', body: 'Traditional directories are most useful at the moment of discovery. BuildPair is intended to remain useful after a homeowner finds someone: the job details, conversation, quote, changes, project history and final reputation can stay connected instead of being scattered across different apps and paper trails.' },
      { title: 'Problem-first search', body: 'A homeowner should not need to diagnose the trade before asking for help. Searches such as “water through the ceiling”, “wet room”, “cracked tiles”, “boiler problem” or “driveway” can be matched against related categories, services and search terms so the platform can surface relevant professionals rather than demanding one exact trade label.' },
      { title: 'One identity, two modes', body: 'A BuildPair account can support both Homeowner and Tradesperson modes. Someone who runs a trade business can still use the same login when they need work done at their own home, without creating duplicate identities.' },
      { title: 'Trust without pretending a badge solves everything', body: 'BuildPair can help organise credentials, work history, reviews, availability and service information, but it does not replace the checks required for a particular job. For regulated or specialist work, customers should still confirm the relevant registration, qualification, insurance and permissions.' },
      { title: 'Built for the UK', body: 'The product, trade taxonomy, postcode-led matching, commercial model and public information are being designed specifically around UK homeowners and tradespeople rather than treating the UK as an afterthought to a generic international marketplace.' },
      { title: 'What BuildPair is not', body: 'BuildPair is not the contractor carrying out the work, an employer of independent tradespeople, or a regulator. It provides marketplace, communication and project-management technology so users can make better-informed decisions and keep a clearer record of the work they agree.' },
    ]}
  />;
}
