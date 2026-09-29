import { Text, View } from 'react-native';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';
import { LAUNCH_OFFER } from '@/constants/site-language';

export default function RewardsPage() {
  return <PublicInfoPage
    eyebrow="BuildPair Rewards"
    title="The more genuine work you complete well, the more BuildPair gives back."
    intro="BuildPair Rewards is designed to recognise active, reliable tradespeople without charging for individual leads. Launch rewards give new members room to try the platform, while achievement rewards recognise genuine completed projects, strong customer outcomes and useful BuildPay adoption."
    updated="Launch offer"
    sections={[
      { title: 'Launch rewards', body: <View style={infoStyles.list}>
        <Text style={infoStyles.item}>• {LAUNCH_OFFER.short}</Text>
        <Text style={infoStyles.item}>• No lead fee is added simply because a tradesperson receives or responds to a job through BuildPair. Normal plan pricing and any separately disclosed BuildPay terms apply after promotional periods end.</Text>
      </View> },
      { title: 'Complete real jobs, unlock more', body: <View style={infoStyles.list}>
        <Text style={infoStyles.item}>• First 10 eligible tradespeople to complete 10 genuine BuildPair-recorded jobs: a further 3 months of Pro free.</Text>
        <Text style={infoStyles.item}>• First 10 eligible tradespeople to complete 3 genuine jobs using BuildPay through completion: 1 further month of Pro free.</Text>
        <Text style={infoStyles.item}>• Five eligible active tradespeople may be selected each month for a further 3 months of Pro under the published monthly reward terms.</Text>
        <Text style={infoStyles.item}>• BuildPair may run additional rewards for consistently strong project-linked ratings, reliable project completion and useful platform participation.</Text>
      </View> },
      { title: 'Quality matters more than raw volume', body: 'Rewards are not intended to create a race to collect meaningless job counts. BuildPair can consider genuine completed work, project-linked customer feedback, completion history, account standing, unresolved disputes and other anti-abuse signals when deciding whether an activity qualifies.' },
      { title: 'What counts as an eligible job', body: <View style={infoStyles.list}>
        <Text style={infoStyles.item}>• A real job for a genuine homeowner or customer, with a legitimate scope of work.</Text>
        <Text style={infoStyles.item}>• The project must reach the relevant BuildPair completion state and cannot simply be created to trigger a reward.</Text>
        <Text style={infoStyles.item}>• Self-referrals, duplicate jobs, collusive jobs, fabricated customers, circular payments, manipulated reviews and other artificial activity do not qualify.</Text>
        <Text style={infoStyles.item}>• BuildPair may ask for reasonable supporting information before awarding a promotional benefit.</Text>
      </View> },
      { title: 'BuildPay rewards', body: 'A BuildPay job only counts toward a BuildPay-specific reward when the supported payment flow was genuinely used for the project and the qualifying stages reached completion. Tiny or artificial transactions created solely to obtain a reward do not qualify.' },
      { title: 'Monthly member rewards', body: 'Where a monthly reward includes random selection, entry is limited to the eligible member pool described in that promotion. BuildPair will publish the applicable eligibility period and reward terms. Paying more money does not buy extra entries unless a future promotion explicitly and lawfully says otherwise.' },
      { title: 'Reward periods and stacking', body: 'Promotional plan time is applied to the eligible BuildPair account. Individual promotions may state whether free periods can stack, when they begin and what happens if the member already has a paid subscription. BuildPair will show the applicable terms before awarding each promotion.' },
      { title: 'Fair-use protection', body: <View style={infoStyles.callout}><Text style={infoStyles.calloutText}>BuildPair can withhold or reverse a promotional reward where activity is fraudulent, duplicated, manipulated, abusive or otherwise outside the published eligibility rules. These controls are intended to keep rewards focused on genuine work and genuine customer activity.</Text></View> },
    ]}
  />;
}
