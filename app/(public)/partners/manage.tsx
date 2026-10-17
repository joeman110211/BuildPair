import Head from 'expo-router/head';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text } from 'react-native-paper';
import { PublicFooter } from '@/components/PublicFooter';
import { Button } from '@/components/BrandButton';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type Listing = { name: string; category: string; description: string; websiteUrl: string; logoUrl: string | null; images: string[]; status: string; paidUntil: string | null };
export default function ManagePartnerListing() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const [data, setData] = useState<Listing | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function reload() {
    if (!token) {setError('Open the private management link sent to your email.');return;}
    try {
      const r = await apiFetch<{ listing: Listing }>('/api/partner-directory/manage?token=' + encodeURIComponent(token));
      setData(r.listing);setError('');
    } catch (e) {setError(errorMessage(e));}
  }
  useEffect(() => {void reload();}, [token]);
  async function perform(action: 'checkout'|'submit'|'cancel'|'remove') {
    setBusy(true);setError('');setMessage('');
    try {
      const path=action==='checkout'?'/api/partner-directory/checkout':'/api/partner-directory/manage';
      const r=await apiFetch<{url?:string;status?:string}>(path,{method:'POST',body:JSON.stringify(action==='checkout'?{token}:{token,action})});
      if(r.url){await Linking.openURL(r.url);return;}
      setMessage(action==='submit'?'Submitted for review.':action==='remove'?'Your listing has been removed.':'Your request has been saved.');
      await reload();
    }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
  }
  async function upload(slot:'logo'|'photo') {
    setBusy(true);setError('');
    try{
      const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:0.8});
      if(result.canceled||!result.assets[0])return;
      const asset=result.assets[0];
      const form=new FormData();
      if(asset.file)form.append('file',asset.file);
      else {const response=await fetch(asset.uri);form.append('file',await response.blob(),asset.fileName||'image.jpg');}
      form.append('token',token);form.append('slot',slot);
      await apiFetch('/api/partner-directory/images',{method:'POST',body:form},undefined,45000);
      await reload();
    }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
  }
  return <ScrollView style={styles.page} contentContainerStyle={styles.wrap}>
    <Head><meta name="robots" content="noindex,nofollow"/><meta name="referrer" content="no-referrer"/></Head>
    <Text style={styles.heading}>Manage your directory listing</Text>
    <Text style={styles.sub}>Private access page. Do not share the address. Cancelling or removing a listing never requires BuildPair approval.</Text>
    {error?<Text style={styles.error}>{error}</Text>:null}
    {message?<Text style={styles.success}>{message}</Text>:null}
    {!data?<Text style={styles.sub}>Loading listing…</Text>:<View style={styles.card}>
      <Text style={styles.title}>{data.name}</Text>
      <Text style={styles.sub}>{data.category}</Text>
      <Text style={styles.sub}>{data.description}</Text>
      <Text style={styles.status}>Status: {data.status.replace(/_/g,' ')}</Text>
      {data.status==='awaiting_verification'?<>
        <Text style={styles.title}>Add your logo and images</Text>
        <Text style={styles.sub}>Images must pass a safety check. Upload a logo and at least one product or business image before sending your application for approval.</Text>
        {data.logoUrl?<Image source={{uri:data.logoUrl}} style={styles.logo} resizeMode="contain"/>:null}
        <Button mode="outlined" disabled={busy} onPress={()=>void upload('logo')}>{data.logoUrl?'Replace logo':'Upload logo'}</Button>
        <View style={styles.row}>{data.images.map(u=><Image key={u} source={{uri:u}} style={styles.image}/>)}</View>
        <Button mode="outlined" disabled={busy||data.images.length>=3} onPress={()=>void upload('photo')}>Add image ({data.images.length}/3)</Button>
        <Button mode="contained" disabled={busy||!data.logoUrl||!data.images.length} onPress={()=>void perform('submit')}>Submit for approval</Button>
      </>:null}
      {data.status==='pending_review'?<Text style={styles.sub}>Your application is waiting for a manual review. You have not been charged.</Text>:null}
      {data.status==='approved'?<>
        <Text style={styles.sub}>Approved for a directory-only listing at £24.99 a month. Your business will appear only after secure payment is confirmed.</Text>
        <Button mode="contained" disabled={busy} onPress={()=>void perform('checkout')}>Pay monthly with Stripe</Button>
      </>:null}
      {['active','cancel_pending'].includes(data.status)?<>
        <Text style={styles.sub}>To change an approved photo, description or website, contact info@buildpair.co.uk. Changes require review.</Text>
        <Button mode="outlined" onPress={()=>void Linking.openURL('mailto:info@buildpair.co.uk?subject=Partner%20listing%20change')}>Request a change</Button>
        {data.status==='active'?<Button mode="outlined" disabled={busy} onPress={()=>void perform('cancel')}>Cancel future renewal</Button>:<Text style={styles.sub}>Renewal cancelled; your paid listing remains until its paid period ends.</Text>}
        <Button mode="outlined" textColor="#B42318" disabled={busy} onPress={()=>void perform('remove')}>Remove listing now</Button>
      </>:null}
      {data.paidUntil?<Text style={styles.sub}>Paid through {new Date(data.paidUntil).toLocaleDateString('en-GB')}</Text>:null}
      {['removed','rejected','suspended','payment_issue'].includes(data.status)?<Text style={styles.sub}>Not visible in the public directory. Contact BuildPair if needed.</Text>:null}
    </View>}
    <Link href="/(public)/partners" asChild><Button mode="text">Back to Partners</Button></Link>
    <PublicFooter/>
  </ScrollView>;
}
const styles=StyleSheet.create({
 page:{flex:1,backgroundColor:colors.background},wrap:{width:'100%',maxWidth:850,alignSelf:'center',padding:20,gap:16},
 heading:{fontSize:27,color:colors.charcoal,fontWeight:'900'},title:{fontSize:19,fontWeight:'900',color:colors.charcoal},
 sub:{fontSize:14,lineHeight:22,color:colors.muted},status:{fontWeight:'800',color:colors.charcoal},
 card:{backgroundColor:colors.surfaceRaised,borderRadius:20,borderWidth:1,borderColor:colors.border,padding:20,gap:12},
 row:{flexDirection:'row',flexWrap:'wrap',gap:8},logo:{width:120,height:65},image:{width:110,height:85,borderRadius:10},
 error:{color:'#B42318'},success:{color:'#15803D'}
});
