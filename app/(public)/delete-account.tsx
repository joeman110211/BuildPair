import { Link } from 'expo-router';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { PublicInfoPage, infoStyles } from '@/components/PublicInfoPage';

export default function DeleteAccountPage() {
  return <PublicInfoPage
    eyebrow="Account & privacy"
    title="Delete your BuildPair account"
    intro="BuildPair provides an in-app account deletion option and a public route for people who cannot access the app."
    updated="12 September 2026"
    sections={[
      {
        title: 'Delete from BuildPair',
        body: <View style={infoStyles.list}>
          <Text style={infoStyles.item}>Sign in to BuildPair, open Account or Settings, choose the delete-account option and confirm the request. This is the fastest route because BuildPair can securely identify the signed-in account.</Text>
          <Link href="/settings" asChild><Button mode="contained">Open BuildPair settings</Button></Link>
        </View>,
      },
      {
        title: 'If you cannot sign in',
        body: <View style={infoStyles.list}>
          <Text style={infoStyles.item}>Email info@buildpair.co.uk from the email address associated with your BuildPair account and write “Account deletion request” in the subject. We may need to verify that you control the account before deleting personal data.</Text>
          <Text style={infoStyles.item}>Do not send passwords, card details, bank details or identity documents by ordinary email unless BuildPair specifically provides a secure method for a required verification step.</Text>
        </View>,
      },
      {
        title: 'What is deleted or retained',
        body: 'BuildPair deletes or anonymises account information that is no longer needed to provide the service. Some records may need to be retained where reasonably necessary for payment reconciliation, fraud prevention, dispute handling, tax, accounting or other legal obligations. Where retention is required, the information is kept only for the relevant purpose and period rather than left as an active marketplace account.',
      },
      {
        title: 'Public profile and marketplace visibility',
        body: 'After account deletion is processed, the account should no longer operate as an active BuildPair account and associated public profile information is removed from normal marketplace visibility, subject to any limited records that must lawfully be retained.',
      },
      {
        title: 'Questions',
        body: 'For account-deletion or privacy questions, contact info@buildpair.co.uk. More detail about data handling, retention and your UK data rights is available in the BuildPair Privacy Policy.',
      },
    ]}
  />;
}
