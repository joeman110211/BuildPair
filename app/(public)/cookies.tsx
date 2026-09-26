import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { PublicInfoPage } from '@/components/PublicInfoPage';

const CHOICE_KEY = 'buildpair_analytics_choice_v1';
const VISITOR_KEY = 'buildpair_analytics_visitor_v1';
const SESSION_KEY = 'buildpair_analytics_session_v1';
const SIGNUP_INTENT_KEY = 'buildpair_analytics_signup_intent_v1';

type AnalyticsChoice = 'basic' | 'detailed' | 'off';

function currentChoice(): AnalyticsChoice {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 'basic';
  try {
    const raw = window.localStorage.getItem(CHOICE_KEY);
    if (!raw) return 'basic';
    const parsed = JSON.parse(raw) as { choice?: string };
    return parsed.choice === 'detailed' || parsed.choice === 'off' || parsed.choice === 'basic' ? parsed.choice : 'basic';
  } catch {
    return 'basic';
  }
}

function removeDetailedIdentity(requestDeletion = true) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(VISITOR_KEY);
    if (requestDeletion && raw) {
      const parsed = JSON.parse(raw) as { id?: string };
      if (parsed.id) {
        void fetch('/api/visitor-analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'withdraw', visitorId: parsed.id }),
          keepalive: true,
        }).catch(() => undefined);
      }
    }
  } catch { /* best effort */ }

  try {
    window.localStorage.removeItem(VISITOR_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SIGNUP_INTENT_KEY);
  } catch { /* browser storage may be unavailable */ }
}

export default function CookiesPage() {
  const [choice, setChoice] = useState<AnalyticsChoice>('basic');

  useEffect(() => {
    setChoice(currentChoice());
  }, []);

  const saveChoice = (next: AnalyticsChoice) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    try {
      if (next !== 'detailed') removeDetailedIdentity(true);
      window.localStorage.setItem(CHOICE_KEY, JSON.stringify({ choice: next, decidedAt: new Date().toISOString() }));
      setChoice(next);
    } catch { /* browser storage may be unavailable */ }
  };

  const controls = Platform.OS === 'web'
    ? <View style={{ gap: 10 }}>
        <Text>Your current BuildPair analytics setting: <Text style={{ fontWeight: '900' }}>{choice === 'basic' ? 'Basic aggregate' : choice === 'detailed' ? 'Detailed journey analytics' : 'Off'}</Text>.</Text>
        <Text>Basic aggregate analytics is the default. It does not create a persistent visitor ID or retain an individual browsing journey. Detailed analytics creates a random anonymous browser identifier only after you choose it.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button mode={choice === 'basic' ? 'contained' : 'outlined'} onPress={() => saveChoice('basic')}>Use basic analytics</Button>
          <Button mode={choice === 'detailed' ? 'contained' : 'outlined'} onPress={() => saveChoice('detailed')}>Allow detailed analytics</Button>
          <Button mode={choice === 'off' ? 'contained-tonal' : 'outlined'} onPress={() => saveChoice('off')}>Turn analytics off</Button>
        </View>
      </View>
    : <Text>Visitor analytics controls apply to the BuildPair website. Website visitors can choose basic aggregate analytics, explicitly allow detailed journey analytics, or turn analytics off.</Text>;

  return <PublicInfoPage
    eyebrow="Legal"
    title="Cookie & Analytics Storage Policy"
    intro="BuildPair uses browser storage and similar technologies where needed to keep sessions working, remember choices and understand how the service is used."
    updated="26 September 2026"
    sections={[
      { title: 'Essential storage', body: 'Some cookies or local-storage items are necessary for authentication, account security, navigation and core app behaviour. Disabling these may stop parts of BuildPair from working correctly.' },
      { title: 'Basic statistical analytics', body: 'BuildPair uses first-party aggregate statistics by default to understand and improve the service. This can include visit starts, page views, meaningful button or link clicks, scroll-depth milestones, time spent on pages, named form fields reached, referral source, campaign parameters, broad device type, browser and operating-system category, language, timezone, screen or viewport size bands, connection category and coarse country, region or town/city location. Basic analytics does not retain an individual visitor journey or create a persistent visitor identifier.' },
      { title: 'Coarse location', body: 'BuildPair may use location information supplied by the hosting or network layer. Where that does not provide a useful town or region, the server may temporarily use the request IP address with an IP geolocation service, currently ipwho.is, to estimate country, region and town/city. BuildPair stores the coarse result in analytics rather than the raw IP address. IP geolocation is an estimate and is not treated as a street address, exact postcode or precise device location.' },
      { title: 'Optional detailed journey analytics', body: 'Detailed journey analytics is separate from basic statistics and is enabled only when a visitor actively chooses “Allow detailed analytics”. It uses a random first-party browser identifier, normally retained for up to 90 days, and a shorter-lived visit identifier to understand a sequence of pages and actions. It does not record the contents typed into fields. Switching back to basic analytics or turning analytics off removes the browser identifiers and requests deletion of detailed journey records associated with the anonymous identifier.' },
      { title: 'What visitor analytics excludes', body: 'BuildPair visitor analytics does not store passwords, authentication secrets, payment-card or bank-account details, the contents typed into form fields, precise GPS coordinates, street addresses, exact household location, mouse-movement recordings, hidden keystroke recordings, advertising profiles or cross-site tracking identifiers.' },
      { title: 'Privacy signals', body: 'BuildPair respects the browser privacy signals used by its analytics code, including Global Privacy Control and Do Not Track where available. Those signals disable BuildPair visitor analytics for that browser.' },
      { title: 'Analytics choices', body: controls },
      { title: 'Third-party services', body: 'Authentication, payment, hosting and other service providers may set or read their own cookies or storage when their features are used. Their handling of those technologies is governed by their own notices and our agreements with them. BuildPair visitor analytics is designed for product measurement and improvement rather than advertising.' },
      { title: 'Contact', body: 'Questions about cookies, browser storage, location estimation or analytics can be sent to info@buildpair.co.uk.' },
    ]}
  />;
}
