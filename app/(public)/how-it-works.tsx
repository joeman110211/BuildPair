import { Text, View } from 'react-native';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function HowItWorksPage() {
  return <PublicInfoPage
    eyebrow="How it works"
    title="From the first vague problem to a useful finished-project record."
    intro="BuildPair connects discovery, AI-assisted planning, marketplace decisions and project workflow so the important information does not disappear after a homeowner finds a tradesperson. Here is what the platform is actually doing at each stage."
    sections={[
      {
        title: '1. Start with the job, service or symptom',
        body: 'A homeowner can search directly for a trade or service, or describe what is happening in ordinary language. That matters because real people often know the problem before they know the profession: “water through the ceiling”, “cracked bathroom tiles” or “I want this room completely refitted” are perfectly valid starting points.'
      },
      {
        title: '2. BuildPair narrows the likely trade',
        body: 'The platform matches the wording against its UK trade categories, services and related search terms. Its AI trade-triage service can use Google Gemini to select the closest BuildPair category, suggest up to a small number of alternatives and ask useful follow-up questions. The AI is constrained to the platform’s taxonomy and common-problem rules provide a fallback if the AI service is unavailable.'
      },
      {
        title: '3. Turn rough homeowner answers into a clearer job specification',
        body: 'When a homeowner creates a fuller job, BuildPair can collect structured answers about the property, current condition, requested work, access, timing and other details. The AI job-spec assistant can reorganise those answers into a concise brief with clear headings, materials responsibility and a “Tradesperson to confirm” section. It is deliberately told not to invent measurements, certifications, costs or safety claims.'
      },
      {
        title: '4. Use location and service context to find relevant people',
        body: 'BuildPair combines broad trade categories with specific services and location information rather than relying on one keyword. Searchable profiles can present a tradesperson’s working area, service radius, categories, services, experience, portfolio work, project stories, availability and submitted credentials so the homeowner has context before making contact.'
      },
      {
        title: '5. Post publicly or approach a suitable profile directly',
        body: 'A homeowner can place suitable work into the marketplace or use a relevant profile to make a direct request. On the trade side, memberships determine marketplace visibility, category allowance, open-marketplace offer capacity and access to additional business tools. Direct requests and marketplace opportunities are kept within the same account rather than becoming unrelated lead products.'
      },
      {
        title: '6. Compare structured quotes, not just headline prices',
        body: <View style={infoStyles.list}>
          <Text style={infoStyles.item}>• Scope: what the trade is actually pricing to do.</Text>
          <Text style={infoStyles.item}>• Exclusions: what is not included and may require a separate variation.</Text>
          <Text style={infoStyles.item}>• Timing: proposed start, duration and useful scheduling information.</Text>
          <Text style={infoStyles.item}>• Commercial structure: deposit, payment stages, materials and warranty wording where relevant.</Text>
          <Text style={infoStyles.item}>• Comparison: homeowners can assess the substance of competing quotes instead of sorting only by one total.</Text>
        </View>
      },
      {
        title: '7. AI can help a trade make the quote clearer, but it does not invent the money',
        body: 'The quote assistant can draft professional wording for scope, exclusions, payment terms, likely duration, warranty and notes based on information the tradesperson supplies. Labour, materials and VAT figures are calculated deterministically by BuildPair instead of asking a language model to invent commercial totals. The tradesperson remains responsible for checking the quote before sending it.'
      },
      {
        title: '8. Keep the conversation attached to the job',
        body: 'BuildPair messaging is job-linked, so a conversation has the project context around it rather than becoming another disconnected chat thread. The message assistant can review the relevant job and recent conversation before suggesting three calm, practical replies. Its rules prohibit inventing prices, dates, measurements, qualifications or promises and discourage moving payment or communication off-platform to bypass safeguards.'
      },
      {
        title: '9. Record changes as variations rather than arguments later',
        body: 'Projects change. A wall gets opened and reveals a defect, the customer adds work, a material changes or the schedule moves. A BuildPair variation can record what changed, the commercial or timing effect and whether it was approved. That creates a much stronger project history than “I thought you said that on the phone”.'
      },
      {
        title: '10. Track progress with timeline events and payment milestones',
        body: 'Project timeline events and payment stages can show how the job moves from accepted quote towards completion. The aim is not to micromanage the trade. It is to keep the key events and agreed commercial stages in the same record as the job and conversation so both sides have a clearer reference point.'
      },
      {
        title: '11. Complete the work and build reputation from real activity',
        body: 'Completed marketplace work can contribute to genuine review history rather than an unexplained star score floating in isolation. Tradespeople can also turn completed work into portfolio project stories, while homeowners can keep a shortlist of people they may want to use again. The history becomes more useful because it relates back to actual project activity.'
      },
      {
        title: '12. The tradesperson keeps using BuildPair after the introduction',
        body: 'The trade side includes business-profile tools, a job pipeline, saved searches, alerts, invoices and analytics. The point is to reduce the familiar pattern where a marketplace sells an introduction and then becomes useless. BuildPair is designed to help present the business, find work, quote it and manage more of the relationship in one place.'
      },
      {
        title: '13. Trust and moderation sit around the workflow',
        body: 'Credentials, marketplace review history, reporting and moderation provide useful signals around the project. Reports can cover issues such as scams, harassment, unsafe behaviour, misleading credentials, poor workmanship, non-payment and payment disputes. Moderation is intended to be evidence-led and can include warnings, restrictions, suspension, restoration and recorded reasons rather than automatically treating an allegation as guilt.'
      },
      {
        title: '14. What the AI does not do',
        body: <View style={infoStyles.callout}>
          <Text style={infoStyles.calloutText}>The AI layer does not inspect the building, guarantee the correct trade, certify somebody’s competence, decide whether work is safe, provide legal advice, or take responsibility for a quote or message. It reduces friction and improves structure. Qualified humans still make the decisions that require inspection, specialist knowledge and accountability.</Text>
        </View>
      },
      {
        title: '15. One account can follow both sides of real life',
        body: 'One BuildPair identity can enable both Homeowner and Tradesperson modes. A plumber, builder or tiler may still need an electrician or roofer at home, so the platform does not force that person to create a duplicate identity. The same core product is designed for web, Android and iOS so the workflow can follow the project rather than the device.'
      },
    ]}
  />;
}