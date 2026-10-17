import { useAuth } from '@clerk/expo';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Button } from '@/components/BrandButton';
import { PartnerSuggestion } from '@/components/PartnerSuggestion';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, ApiError } from '@/lib/api';

export default function TraderMemberBenefits() {
  const { getToken } = useAuth();
  const [state,setState] = useState<'loading'|'eligible'|'not-pro'|'error'>('loading');
  const [hasOffer,setHasOffer] = useState(false);
  useEffect(()=>{
    let active=true;
    // The server enforces live Pro/trial entitlement. No discount details are
    // published to unauthorised accounts.
    apiFetch<{suggestion: {id:string}|null}>(
      '/api/partners/suggestions?placement=pro-member-benefits',
      {},getToken
    ).then(r=>{if(active){setState('eligible');setHasOffer(Boolean(r.suggestion));}})
      .catch(err=>{if(active)setState(err instanceof ApiError&&[401,402,403].includes(err.status)?'not-pro':'error');});
    return()=>{active=false;};
  },[getToken]);
  if(state==='loading')return <LoadingScreen label="Checking member benefits…" />;
  return <Screen title="Pro member benefits" subtitle="Optional partner offers for eligible BuildPair Pro tradespeople.">
    {state==='not-pro'?<AppCard>
      <Text variant="titleLarge" style={{fontWeight:'800',color:colors.charcoal}}>Available with BuildPair Pro</Text>
      <Text style={{color:colors.muted,lineHeight:21}}>Verified partner discounts will be available here when agreed. Pro eligibility includes qualifying complimentary and trial access where offered in partner terms. No discount is guaranteed until shown.</Text>
      <Link href="/trader/subscription" asChild><Button mode="outlined">View membership</Button></Link>
    </AppCard>:state==='error'?<AppCard>
      <Text style={{color:colors.muted}}>Member offers could not be checked at the moment. Your existing tools and subscription remain unaffected.</Text>
    </AppCard>:<AppCard>
      <Text variant="titleLarge" style={{fontWeight:'800',color:colors.charcoal}}>Offers from selected partners</Text>
      <Text style={{color:colors.muted,lineHeight:21}}>{hasOffer?'Current partner offers appear below.':'No confirmed Pro-only partner offers have been published yet.'} We never share your account, customer or job information with advertisers. All offers are optional.</Text>
    </AppCard>}
    {state==='eligible'&&hasOffer?<PartnerSuggestion placement="pro-member-benefits" />:null}
    <Link href="/(public)/partners" asChild><Button mode="text">Explore all BuildPair partners</Button></Link>
  </Screen>;
}
