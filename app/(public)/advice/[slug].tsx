import { useLocalSearchParams } from 'expo-router';
import { SeoAdviceBatchThreePage } from '@/components/SeoAdviceBatchThreePage';
export default function Page(){const {slug}=useLocalSearchParams<{slug:string}>();return <SeoAdviceBatchThreePage slug={slug??''}/>;}
