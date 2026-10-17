import { useAuth } from '@clerk/expo';
import { useEffect, useState } from 'react';
import { Image, Linking, Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Button } from '@/components/BrandButton';
import { colors } from '@/constants/theme';
import { apiFetch } from '@/lib/api';

export type PartnerContext = 'trader-after-onboarding'|'quote-after-send'|'project-plus-kitchen'|'project-plus-bathroom'|'pro-member-benefits';
type PartnerAd = {
  id: string; name: string; summary: string; category: string;
  logoUrl: string|null; offerText: string; memberOfferText: string;
  memberOfferTerms: string;
};
const dismissedThisSession = new Set<string>();

function alreadyDismissed(context: PartnerContext) {
  if (dismissedThisSession.has(context)) return true;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { return window.sessionStorage.getItem('bp-partner-dismiss:'+context) === '1'; } catch { return false; }
  }
  return false;
}
function markDismissed(context: PartnerContext) {
  dismissedThisSession.add(context);
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { window.sessionStorage.setItem('bp-partner-dismiss:'+context, '1'); } catch { /* ephemeral fallback */ }
  }
}

export function PartnerSuggestion({ placement, enabled=true }: { placement: PartnerContext; enabled?: boolean }) {
  const { getToken } = useAuth();
  const [suggestion,setSuggestion] = useState<PartnerAd|null>(null);
  const [dismissed,setDismissed] = useState(()=>alreadyDismissed(placement));
  useEffect(()=>{
    if (!enabled || alreadyDismissed(placement)) return;
    let active=true;
    const tokenGetter=placement==='pro-member-benefits'?getToken:undefined;
    // An empty fixed placement code is the entire request context; no user,
    // quote, project, room brief or other private details are transmitted.
    apiFetch<{ suggestion: PartnerAd|null }>(
      '/api/partners/suggestions?placement='+encodeURIComponent(placement),
      {},tokenGetter
    ).then(r=>{if(active)setSuggestion(r.suggestion);}).catch(()=>undefined);
    return()=>{active=false;};
  },[placement,enabled,getToken]);
  if(!enabled||dismissed||!suggestion)return null;
  const member=placement==='pro-member-benefits';
  const copy=member?suggestion.memberOfferText:suggestion.offerText||suggestion.summary;
  return <AppCard style={styles.card}>
    <View style={styles.row}>
      <View style={styles.titleWrap}>
        <Text style={styles.tag}>AD · PAID BUILDPAIR PARTNER</Text>
        <Text variant="titleMedium" style={styles.title}>{suggestion.name}</Text>
        <Text style={styles.category}>{suggestion.category}</Text>
      </View>
      {suggestion.logoUrl?<Image style={styles.logo} source={{uri:suggestion.logoUrl}} resizeMode="contain" />:null}
    </View>
    <Text style={styles.body}>{copy}</Text>
    {member&&suggestion.memberOfferTerms?<Text style={styles.fine}>{suggestion.memberOfferTerms}</Text>:null}
    <Text style={styles.fine}>Optional third-party service. Paid promotion, not an independent BuildPair recommendation. We do not share your details.</Text>
    <View style={styles.actions}>
      <Button mode="outlined" compact onPress={()=>void Linking.openURL('https://www.buildpair.co.uk/api/partners/go?id='+encodeURIComponent(suggestion.id))}>Explore offer</Button>
      <Button mode="text" compact accessibilityLabel={'Dismiss '+suggestion.name+' advert'} onPress={()=>{markDismissed(placement);setDismissed(true);}}>Dismiss suggestion</Button>
    </View>
  </AppCard>;
}
const styles=StyleSheet.create({
  card:{gap:9,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surfaceRaised},
  row:{flexDirection:'row',gap:12,justifyContent:'space-between',alignItems:'center'},
  titleWrap:{flex:1,minWidth:0,gap:3},
  tag:{color:colors.primaryDark,fontSize:11,fontWeight:'900',letterSpacing:0.65},
  title:{color:colors.charcoal,fontWeight:'800'},
  category:{color:colors.muted,fontSize:12},
  logo:{width:82,height:46},
  body:{color:colors.charcoalSoft,lineHeight:21},
  fine:{color:colors.muted,fontSize:12,lineHeight:18},
  actions:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},
});
