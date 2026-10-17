import { useState } from 'react';
import { ScrollView,StyleSheet,View } from 'react-native';
import { Text,TextInput } from 'react-native-paper';
import { Link } from 'expo-router';
import { PublicSeo } from '@/components/PublicSeo';
import { PublicFooter } from '@/components/PublicFooter';
import { Button } from '@/components/BrandButton';
import { colors } from '@/constants/theme';
import { apiFetch,errorMessage } from '@/lib/api';

const categories=[
  'Building materials & supplies','Tools, equipment & workwear','Interior design & showrooms',
  'Vans, vehicle hire & fleet','Plant, site equipment & skips','Home products & appliances',
  'Property & surveying services','Trade training & qualifications','Business & professional services'
] as const;
export default function DirectoryAdvertise(){
  const [businessName,setBusinessName]=useState(''),[contactName,setContactName]=useState(''),[email,setEmail]=useState('');
  const [category,setCategory]=useState<(typeof categories)[number]>(categories[0]);
  const [description,setDescription]=useState(''),[websiteUrl,setWebsiteUrl]=useState('');
  const [sending,setSending]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState('');
  async function submit(){
    setError('');
    if(businessName.trim().length<2||contactName.trim().length<2||!email.includes('@')||description.trim().length<50||!websiteUrl.startsWith('https://')){
      setError('Please complete all fields, use a secure HTTPS website and add at least 50 characters about your business.');return;
    }
    setSending(true);
    try{
      await apiFetch('/api/partner-directory',{method:'POST',body:JSON.stringify({businessName,contactName,email,category,description,websiteUrl,website:''})});
      setSent(true);
    }catch(err){setError(errorMessage(err));}finally{setSending(false);}
  }
  return <ScrollView style={styles.page} contentContainerStyle={styles.container}>
    <PublicSeo title="Advertise your business in BuildPair Partners" description="Apply for a £24.99 per month directory-only listing for eligible UK home improvement suppliers and related businesses. Every listing is reviewed." />
    <Text style={styles.eyebrow}>BUILDPAIR PARTNER DIRECTORY</Text>
    <Text style={styles.title}>Put your business in the right place.</Text>
    <Text style={styles.body}>For companies supplying products and specialist services that complement home improvement projects. Not for tradespeople advertising installation or building work, or competing lead directories.</Text>
    <View style={styles.price}>
      <Text style={styles.priceText}>£24.99 <Text style={styles.priceSmall}>per month</Text></Text>
      <Text style={styles.body}>One searchable directory listing, logo, three images and website link. No paid suggestion slots or guaranteed enquiries. Monthly payments begin only after BuildPair approves you and you complete Stripe Checkout. Cancel renewal or remove your listing at any time.</Text>
    </View>
    {sent?<View style={styles.card}><Text style={styles.titleSmall}>Check your inbox</Text><Text style={styles.body}>We've sent a private application link to your email. Open it to upload your logo and images and submit everything for review. Nothing is published or charged at this stage.</Text><Link href="/(public)/partners" asChild><Button mode="outlined">Back to Partners</Button></Link></View>:<View style={styles.card}>
      <Text style={styles.titleSmall}>Apply to join the directory</Text>
      <TextInput mode="outlined" style={styles.input} label="Business name *" value={businessName} onChangeText={setBusinessName} maxLength={120}/>
      <TextInput mode="outlined" style={styles.input} label="Contact name *" value={contactName} onChangeText={setContactName} maxLength={100}/>
      <TextInput mode="outlined" style={styles.input} label="Business email *" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" maxLength={200}/>
      <Text style={styles.label}>Business category</Text>
      <View style={styles.chips}>{categories.map(c=><Button key={c} compact mode={c===category?'contained':'outlined'} onPress={()=>setCategory(c)}>{c}</Button>)}</View>
      <TextInput mode="outlined" style={styles.input} label="Business website (HTTPS) *" value={websiteUrl} onChangeText={setWebsiteUrl} autoCapitalize="none" maxLength={500}/>
      <TextInput mode="outlined" style={styles.input} label="What does your business supply or provide? *" multiline numberOfLines={5} value={description} onChangeText={setDescription} maxLength={1200}/>
      <Text style={styles.body}>The next step uses a secure email link so you can upload your images without creating a tradesperson account. Your application, images and website will be checked manually before Stripe payment is offered. Once approved and published, changes require BuildPair review. No personal account data is sold to partners.</Text>
      {error?<Text style={styles.error}>{error}</Text>:null}
      <Button mode="contained" onPress={()=>void submit()} disabled={sending} loading={sending}>Continue application</Button>
      <Text style={styles.fine}>By applying you accept the <Link href="/(public)/terms" style={styles.link}>Terms</Link> and <Link href="/(public)/privacy" style={styles.link}>Privacy Policy</Link>. The £24.99 plan renews monthly until cancelled. No money is collected now.</Text>
    </View>}
    <PublicFooter />
  </ScrollView>;
}
const styles=StyleSheet.create({
  page:{flex:1,backgroundColor:colors.background},container:{gap:17,paddingHorizontal:16,paddingTop:35,paddingBottom:50,maxWidth:960,width:'100%',alignSelf:'center'},
  eyebrow:{color:colors.primary,fontWeight:'900',letterSpacing:1.3,fontSize:12},
  title:{fontSize:30,lineHeight:36,fontWeight:'900',color:colors.charcoal},
  titleSmall:{fontSize:20,fontWeight:'900',color:colors.charcoal},
  body:{fontSize:14,lineHeight:22,color:colors.muted},
  price:{padding:22,backgroundColor:colors.primarySoft,borderRadius:20,gap:12},
  priceText:{fontSize:29,fontWeight:'900',color:colors.charcoal},
  priceSmall:{fontSize:14,fontWeight:'500',color:colors.muted},
  card:{borderWidth:1,borderColor:colors.border,backgroundColor:colors.surfaceRaised,borderRadius:20,padding:20,gap:12},
  input:{backgroundColor:colors.surfaceRaised},label:{color:colors.charcoal,fontWeight:'800'},
  chips:{flexDirection:'row',flexWrap:'wrap',gap:8},error:{color:'#B42318',fontWeight:'700'},
  fine:{color:colors.muted,fontSize:12,lineHeight:18},link:{color:colors.primary,textDecorationLine:'underline'},
});
