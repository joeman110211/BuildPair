import { Text, View } from 'react-native';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function RewardsPage() {
  return <PublicInfoPage
    eyebrow="BuildPair Rewards"
    title="The more genuine work you complete well, the more BuildPair gives back."
    intro="BuildPair Rewards is designed to recognise active, reliable tradespeople without charging for individual leads. Member offers and achievement rewards recognise genuine completed projects and strong customer outcomes. BuildPay-specific rewards will be reviewed after BuildPay becomes available."
    sections={[
      { title: 'Member offers', body: <View style={infoStyles.list}>
        <Text style={infoStyles.item}>• No lead fee is added simply because a tradesperson receives or responds to a job through BuildPair. Future paid memberships are optional, and BuildPay is not currently available.</Text>
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
      { title: 'Reward periods and stacking', body: 'Promotional membership time is applied to the eligible BuildPair account. Individual promotions may state whether free periods can stack, when they begin and what happens if the member already has a paid subscription. BuildPair will show the applicable terms before awarding each promotion.' },
      { title: 'Fair-use protection', body: <View style={infoStyles.callout}><Text style={infoStyles.calloutText}>BuildPair can withhold or reverse a promotional reward where activity is fraudulent, duplicated, manipulated, abusive or otherwise outside the published eligibility rules. Genuine tradespeople using the platform normally should not have to think about this. It exists so the rewards go to actual work rather than creative spreadsheet fiction.</Text></View> },
    ]}
  />;
}
