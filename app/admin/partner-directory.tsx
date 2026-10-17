import { useAuth } from '@clerk/expo';
import { Link } from 'expo-router';
import { useCallback,useEffect,useRef,useState } from 'react';
import { Image,StyleSheet,View } from 'react-native';
import { Text,Chip } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Button } from '@/components/BrandButton';
import { Screen,LoadingScreen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch,errorMessage } from '@/lib/api';

type Applicant={id:string;name:string;contactName:string;email:string;category:string;description:string;websiteUrl:string;logoUrl:string|null;images:string[];status:string;paidUntil:string|null;subscriptionId:string|null;createdAt:string;adminNotes:string};
export default function DirectoryAdmin(){
 const {getToken}=useAuth(),tokenRef=useRef(getToken);
 const [rows,setRows]=useState<Applicant[]>([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(''),[error,setError]=useState(''),[note,setNote]=useState('');
 useEffect(()=>{tokenRef.current=getToken;},[getToken]);
 const load=useCallback(async()=>{
  try{const r=await apiFetch<{applications:Applicant[]}>('/api/admin/partner-directory',{},()=>tokenRef.current());setRows(r.applications);setError('');}
  catch(e){setError(errorMessage(e));}finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 async function decide(id:string,action:'approve'|'reject'|'suspend'){
  setSaving(id);setError('');setNote('');
  try{await apiFetch('/api/admin/partner-directory',{method:'POST',body:JSON.stringify({id,action})},()=>tokenRef.current());
   setNote(action==='approve'?'Approved. A secure payment link has been emailed to the applicant.':'Listing updated.');await load();
  }catch(e){setError(errorMessage(e));}finally{setSaving('');}
 }
 if(loading&&!rows.length&&!error)return <LoadingScreen label="Loading directory applications…"/>;
 const pending=rows.filter(r=>r.status==='pending_review').length;
 const active=rows.filter(r=>r.status==='active'||r.status==='cancel_pending').length;
 return <Screen title="Self-service partner directory" subtitle="Separate from negotiated sponsor campaigns. Approve suppliers, review images and see monthly Stripe listing status.">
  <View style={styles.row}><Chip>{pending} awaiting review</Chip><Chip>{active} paid listing(s)</Chip><Button mode="outlined" onPress={()=>void load()}>Refresh</Button><Link href="/admin/partners" asChild><Button mode="text">Managed partnerships</Button></Link></View>
  <Text style={styles.muted}>Approve only suppliers and complementary specialist services. Reject tradespeople selling installations, competitors and irrelevant offers. Stripe payment begins only after approval; publication requires a verified paid subscription.</Text>
  {error?<Text style={styles.error}>{error}</Text>:null}
  {note?<Text style={styles.good}>{note}</Text>:null}
  {!rows.length?<AppCard><Text style={styles.muted}>No applications received yet.</Text></AppCard>:null}
  {rows.map(item=><AppCard key={item.id} style={styles.card}>
   <View style={styles.row}><Text variant="titleLarge" style={styles.heading}>{item.name}</Text><Chip>{item.status.replace(/_/g,' ')}</Chip></View>
   <Text style={styles.muted}>{item.category} · {item.contactName} · {item.email}</Text>
   <Text style={styles.body}>{item.description}</Text>
   <Text selectable style={styles.muted}>Website: {item.websiteUrl}</Text>
   <View style={styles.row}>
    {item.logoUrl?<Image source={{uri:item.logoUrl}} resizeMode="contain" style={styles.logo}/>:null}
    {item.images.map(uri=><Image key={uri} source={{uri}} style={styles.photo}/>)}
   </View>
   <Text style={styles.muted}>Submitted: {new Date(item.createdAt).toLocaleDateString('en-GB')} · Stripe: {item.subscriptionId?'linked':'not started'} {item.paidUntil?'· Paid until '+new Date(item.paidUntil).toLocaleDateString('en-GB'):''}</Text>
   {item.status==='pending_review'?<View style={styles.row}>
     <Button mode="contained" disabled={Boolean(saving)} loading={saving===item.id} onPress={()=>void decide(item.id,'approve')}>Approve and email payment link</Button>
     <Button mode="outlined" disabled={Boolean(saving)} onPress={()=>void decide(item.id,'reject')}>Reject</Button>
   </View>:null}
   {['active','cancel_pending'].includes(item.status)?<Button mode="outlined" textColor="#B42318" disabled={Boolean(saving)} onPress={()=>void decide(item.id,'suspend')}>Suspend public listing</Button>:null}
   {item.status==='approved'?<Button mode="outlined" disabled={Boolean(saving)} onPress={()=>void decide(item.id,'approve')}>Resend approval link</Button>:null}
  </AppCard>)}
 </Screen>;
}
const styles=StyleSheet.create({
 row:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:10},heading:{fontWeight:'900',color:colors.charcoal},
 card:{gap:12},muted:{color:colors.muted,lineHeight:21},body:{color:colors.charcoal,lineHeight:22},
 logo:{width:110,height:65},photo:{width:105,height:80,borderRadius:9},
 error:{color:'#B42318',fontWeight:'700'},good:{color:'#15803D',fontWeight:'700'}
});
