import { useLocalSearchParams } from 'expo-router';
import { SEO_ADVICE_BATCH_THREE, SeoAdviceBatchThreePage } from '@/components/SeoAdviceBatchThreePage';
export function generateStaticParams(){return SEO_ADVICE_BATCH_THREE.map(({slug})=>({slug}));}
export default function Page(){const {slug}=useLocalSearchParams<{slug:string}>();return <SeoAdviceBatchThreePage slug={slug??''}/>;}
