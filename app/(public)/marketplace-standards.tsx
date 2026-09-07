import { Text, View } from 'react-native';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function MarketplaceStandardsPage() {
  return <PublicInfoPage
    eyebrow="Marketplace policy"
    title="BuildPair Marketplace Standards"
    intro="These standards explain the behaviour BuildPair expects from homeowners and tradespeople so the marketplace remains useful, accurate and safe. They sit alongside the Terms of Use and Privacy Policy."
    updated="7 September 2026"
    sections={[
      { title: 'Be accurate', body: 'Profiles, jobs, quotes, credentials, reviews and messages must be honest and materially accurate. Do not impersonate another person or business, fabricate qualifications or completed work, hide important exclusions in a quote or deliberately misrepresent a job.' },
      { title: 'Keep work within your competence', body: 'Tradespeople must only offer work they are competent and legally permitted to perform. Where registration, licensing, certification, insurance or specialist permission is required, the tradesperson remains responsible for holding and maintaining it.' },
      { title: 'Keep jobs genuine', body: 'Homeowners should post genuine work with enough information for a tradesperson to make a sensible initial decision. Spam, duplicate bait listings, unlawful requests and deliberately misleading budget, location or scope information may be removed.' },
      { title: 'Communicate professionally', body: <View style={infoStyles.list}><Text style={infoStyles.item}>• No threats, targeted abuse, harassment or discriminatory conduct.</Text><Text style={infoStyles.item}>• No fraud, phishing, impersonation or attempts to obtain credentials or payment information dishonestly.</Text><Text style={infoStyles.item}>• Do not pressure another user to bypass BuildPair safety controls or falsify records.</Text><Text style={infoStyles.item}>• Keep job conversations relevant to the work and the legitimate business relationship.</Text></View> },
      { title: 'Reviews must reflect genuine experience', body: 'Do not buy, trade, fabricate or manipulate reviews. Do not threaten or reward another user for a misleading rating. BuildPair may investigate or remove reviews where the underlying marketplace record does not support the claimed experience.' },
      { title: 'Changes and variations should be explicit', body: 'Where the project scope changes, both sides should record what is changing, the effect on price or timing and any approval required before additional chargeable work proceeds. This reduces the classic “I thought that was included” dispute.' },
      { title: 'Reports and moderation', body: 'Users can report marketplace concerns. BuildPair may review messages, job records and account history reasonably necessary to investigate a report, apply proportionate restrictions, preserve evidence, remove content or suspend an account under the Terms of Use.' },
      { title: 'No guarantee of workmanship', body: 'BuildPair provides marketplace information and workflow tools but does not itself carry out the building work. Users remain responsible for choosing who they contract with and for making checks appropriate to the job.' },
    ]}
  />;
}
