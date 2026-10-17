import { useAuth } from '@clerk/expo';
import { Link } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

const categories = ['Trade insurance','Trade supplies','Property services','Interiors & design','Tools & equipment','Business services','Other'] as const;
const packages = ['local','featured','founding'] as const;
const placements = [
  ['trader-after-onboarding','After trade onboarding'],
  ['quote-after-send','After a quote is sent'],
  ['project-plus-kitchen','Project+ kitchen concepts'],
  ['project-plus-bathroom','Project+ bathroom concepts'],
  ['pro-member-benefits','Pro member benefits'],
] as const;
const levels=['standard','featured','exclusive'] as const;
type Status = 'draft' | 'live' | 'paused';
type Partner = { id: string; name: string; category: string; summary: string; websiteUrl: string; logoUrl: string | null; offerText: string; placements: string[]; placementLevel: string; memberOfferText: string; memberOfferTerms: string; package: string; termMonths: number; pricePence: number; status: Status; startsOn: string | null; endsOn: string | null; clickCount: number };
type Enquiry = { id: string; businessName: string; contactName: string; email: string; category: string; package: string; message: string; status: 'new'|'contacted'|'closed'; createdAt: string };
type Data = { partners: Partner[]; enquiries: Enquiry[] };
type Draft = { id: string | null; name: string; category: string; summary: string; websiteUrl: string; logoUrl: string; offerText: string; placements: string[]; placementLevel: string; memberOfferText: string; memberOfferTerms: string; package: string; termMonths: 6|12; price: string; status: Status; startsOn: string; endsOn: string };
function emptyDraft(): Draft { return { id: null, name:'',category:'Trade supplies',summary:'',websiteUrl:'',logoUrl:'',offerText:'',placements:[],placementLevel:'standard',memberOfferText:'',memberOfferTerms:'',package:'local',termMonths:6,price:'',status:'draft',startsOn:'',endsOn:'' }; }
function draftFor(p: Partner): Draft { return { id:p.id,name:p.name,category:p.category,summary:p.summary,websiteUrl:p.websiteUrl,logoUrl:p.logoUrl || '',offerText:p.offerText,placements:p.placements||[],placementLevel:p.placementLevel||'standard',memberOfferText:p.memberOfferText||'',memberOfferTerms:p.memberOfferTerms||'',package:p.package,termMonths:p.termMonths===12?12:6,price:(p.pricePence/100).toFixed(2),status:p.status,startsOn:p.startsOn||'',endsOn:p.endsOn||'' }; }
const money = (pence: number) => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(pence/100);

export default function AdminPartnersPage() {
  const { getToken } = useAuth();
  const tokenRef = useRef(getToken);
  const [data,setData] = useState<Data|null>(null);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [draft,setDraft] = useState<Draft>(emptyDraft());
  const [showEditor,setShowEditor] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  useEffect(()=>{tokenRef.current=getToken;},[getToken]);
  const load = useCallback(async()=>{
    try{
      const result = await apiFetch<Data>('/api/admin/partners',{},()=>tokenRef.current());
      setData(result);setError('');
    }catch(e){setError(errorMessage(e));}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  const update = (field: keyof Draft,value: string|number|null) => setDraft(d=>({...d,[field]:value}));
  const save = async()=>{
    setError('');setNotice('');
    const price = draft.price.trim() ? Number(draft.price) : 0;
    if (!draft.name.trim() || !draft.websiteUrl.trim() || !/^\d+(\.\d{1,2})?$/.test(draft.price || '0') || !Number.isSafeInteger(Math.round(price*100))) {
      setError('Enter a business name, valid HTTPS website and a price such as 495.00.');return;
    }
    setSaving(true);
    try{
      await apiFetch('/api/admin/partners',{method:'POST',body:JSON.stringify({
        id:draft.id,name:draft.name,category:draft.category,summary:draft.summary,
        websiteUrl:draft.websiteUrl,logoUrl:draft.logoUrl,offerText:draft.offerText,
        placements:draft.placements,placementLevel:draft.placementLevel,
        memberOfferText:draft.memberOfferText,memberOfferTerms:draft.memberOfferTerms,
        package:draft.package,termMonths:draft.termMonths,pricePence:Math.round(price*100),
        status:draft.status,startsOn:draft.startsOn||null,endsOn:draft.endsOn||null,
      })},()=>tokenRef.current());
      setShowEditor(false);setDraft(emptyDraft());setNotice('Partner listing saved.');await load();
    }catch(e){setError(errorMessage(e));}
    finally{setSaving(false);}
  };
  const setEnquiryStatus = async(id:string,status:Enquiry['status'])=>{
    setError('');
    try{await apiFetch('/api/admin/partners',{method:'PATCH',body:JSON.stringify({id,status})},()=>tokenRef.current());setNotice('Enquiry updated.');await load();}
    catch(e){setError(errorMessage(e));}
  };
  if (loading && !data && !error) return <LoadingScreen label="Loading partnership enquiries…" />;
  const live = data?.partners.filter(p=>p.status==='live').length ?? 0;
  const pending = data?.enquiries.filter(e=>e.status==='new').length ?? 0;
  return <Screen title="Commercial partners" subtitle="Review enquiries, control paid listings and keep track of agreements. Only approved live listings appear publicly.">
    <View style={styles.row}>
      <Chip>{live} published partners</Chip><Chip>{pending} new enquiries</Chip>
      <Link href="/(public)/partners" asChild><Button mode="outlined">View public page</Button></Link>
      <Button mode="contained" onPress={()=>{setDraft(emptyDraft());setShowEditor(true);setError('');}}>Add partner</Button>
      <Button mode="outlined" loading={loading} onPress={()=>void load()}>Refresh</Button>
    </View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {notice ? <Text style={styles.good}>{notice}</Text> : null}
    {showEditor ? <AppCard style={styles.card}>
      <Text variant="titleLarge" style={styles.title}>{draft.id?'Edit partner':'Create partner'}</Text>
      <Text style={styles.muted}>Create in draft first. Set to Live only after you have a written agreement and permission to display the brand.</Text>
      <TextInput mode="outlined" label="Business name" value={draft.name} onChangeText={v=>update('name',v)} maxLength={120}/>
      <TextInput mode="outlined" label="HTTPS website URL" autoCapitalize="none" value={draft.websiteUrl} onChangeText={v=>update('websiteUrl',v)} maxLength={500}/>
      <TextInput mode="outlined" label="Logo image HTTPS URL (optional)" autoCapitalize="none" value={draft.logoUrl} onChangeText={v=>update('logoUrl',v)} maxLength={500}/>
      <TextInput mode="outlined" label="Short description" value={draft.summary} onChangeText={v=>update('summary',v)} multiline maxLength={600}/>
      <TextInput mode="outlined" label="Promotional offer (optional)" value={draft.offerText} onChangeText={v=>update('offerText',v)} multiline maxLength={250}/>
      <Text style={styles.label}>Optional contextual placements</Text>
      <Text style={styles.muted}>Disabled by default. Choose only where the signed agreement allows. No personal or job data is shared. One clearly labelled suggestion per relevant screen, with a dismiss button.</Text>
      <View style={styles.row}>{placements.map(([id,label])=><Button key={id} compact mode={draft.placements.includes(id)?'contained':'outlined'} onPress={()=>setDraft(d=>({...d,placements:d.placements.includes(id)?d.placements.filter(x=>x!==id):[...d.placements,id]}))}>{draft.placements.includes(id)?'✓ ':''}{label}</Button>)}</View>
      <Text style={styles.label}>Placement priority</Text>
      <View style={styles.row}>{levels.map(level=><Button key={level} compact mode={draft.placementLevel===level?'contained':'outlined'} onPress={()=>update('placementLevel',level)}>{level==='exclusive'?'Exclusive suggestion slot':level==='featured'?'Priority suggestion':'Standard rotation'}</Button>)}</View>
      <Text style={styles.muted}>Exclusivity applies only to an agreed suggestion slot and dates, not all recommendations, the whole industry or independent editorial guides. Record the contract before enabling it.</Text>
      <TextInput mode="outlined" label="Agreed Pro-only discount or benefit (optional)" value={draft.memberOfferText} onChangeText={v=>update('memberOfferText',v)} multiline maxLength={250}/>
      <TextInput mode="outlined" label="Pro benefit conditions, eligible members, end date (optional)" value={draft.memberOfferTerms} onChangeText={v=>update('memberOfferTerms',v)} multiline maxLength={500}/>
      <Text style={styles.label}>Category</Text>
      <View style={styles.row}>{categories.map(c=><Button key={c} compact mode={draft.category===c?'contained':'outlined'} onPress={()=>update('category',c)}>{c}</Button>)}</View>
      <Text style={styles.label}>Package</Text>
      <View style={styles.row}>{packages.map(p=><Button key={p} compact mode={draft.package===p?'contained':'outlined'} onPress={()=>update('package',p)}>{p}</Button>)}</View>
      <Text style={styles.label}>Agreed term</Text>
      <View style={styles.row}>{([6,12] as const).map(n=><Button key={n} compact mode={draft.termMonths===n?'contained':'outlined'} onPress={()=>update('termMonths',n)}>{n} months</Button>)}</View>
      <TextInput mode="outlined" label="Agreed price (£, manually recorded)" keyboardType="decimal-pad" value={draft.price} onChangeText={v=>update('price',v)}/>
      <Text style={styles.muted}>Price is a record, not proof of payment or an automatically collected charge.</Text>
      <TextInput mode="outlined" label="Start date YYYY-MM-DD (optional)" value={draft.startsOn} onChangeText={v=>update('startsOn',v)}/>
      <TextInput mode="outlined" label="End date YYYY-MM-DD (optional)" value={draft.endsOn} onChangeText={v=>update('endsOn',v)}/>
      <Text style={styles.label}>Publication status</Text>
      <View style={styles.row}>{(['draft','live','paused'] as const).map(s=><Button key={s} compact mode={draft.status===s?'contained':'outlined'} onPress={()=>update('status',s)}>{s}</Button>)}</View>
      <View style={styles.row}><Button mode="contained" loading={saving} disabled={saving} onPress={()=>void save()}>Save listing</Button><Button mode="outlined" onPress={()=>setShowEditor(false)}>Cancel</Button></View>
    </AppCard> : null}
    <Text variant="titleLarge" style={styles.title}>Partner listings</Text>
    {!data?.partners.length ? <AppCard><Text style={styles.muted}>No sponsors have been added. Add a draft listing after agreeing a partnership.</Text></AppCard> : null}
    <View style={styles.grid}>{data?.partners.map(p=><AppCard key={p.id} style={styles.card}>
      <View style={styles.row}><Text variant="titleMedium" style={styles.title}>{p.name}</Text><Chip>{p.status}</Chip></View>
      <Text style={styles.muted}>{p.category} · {p.package} · {p.termMonths} months · {money(p.pricePence)}</Text>
      <Text style={styles.muted}>{p.startsOn||'No start date'} to {p.endsOn||'No end date'} · {p.clickCount} indicative outbound clicks (may include bots)</Text>
      <Text style={styles.muted}>{p.summary}</Text>
      <Text style={styles.muted}>Suggestion priority: {p.placementLevel||'standard'} · Placements: {p.placements?.join(', ')||'none'} · Pro deal: {p.memberOfferText?'agreed offer recorded':'not available'}</Text>
      <Button mode="outlined" onPress={()=>{setDraft(draftFor(p));setShowEditor(true);setNotice('');}}>Edit listing</Button>
    </AppCard>)}</View>
    <Text variant="titleLarge" style={styles.title}>Partnership enquiries</Text>
    {!data?.enquiries.length ? <AppCard><Text style={styles.muted}>No applications received yet. New enquiries will appear here.</Text></AppCard> : null}
    <View style={styles.grid}>{data?.enquiries.map(e=><AppCard key={e.id} style={styles.card}>
      <View style={styles.row}><Text variant="titleMedium" style={styles.title}>{e.businessName}</Text><Chip>{e.status}</Chip></View>
      <Text style={styles.muted}>{e.contactName} · {e.email}</Text>
      <Text style={styles.muted}>{e.category} · {e.package} · {new Date(e.createdAt).toLocaleDateString('en-GB')}</Text>
      {e.message?<Text style={styles.muted}>{e.message}</Text>:null}
      <View style={styles.row}>
        <Button compact mode="outlined" onPress={()=>void setEnquiryStatus(e.id,'contacted')}>Mark contacted</Button>
        <Button compact mode="outlined" onPress={()=>void setEnquiryStatus(e.id,'closed')}>Close</Button>
        <Button compact mode="outlined" onPress={()=>void setEnquiryStatus(e.id,'new')}>Reopen</Button>
      </View>
    </AppCard>)}</View>
  </Screen>;
}
const styles=StyleSheet.create({
  row:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:9},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:12},
  card:{flexGrow:1,flexBasis:320,minWidth:0,gap:12},
  title:{fontWeight:'900',color:colors.charcoal},
  muted:{color:colors.muted,lineHeight:21},
  label:{fontWeight:'800',color:colors.charcoal},
  error:{color:'#B42318',fontWeight:'700'},
  good:{color:'#197D50',fontWeight:'700'},
});
