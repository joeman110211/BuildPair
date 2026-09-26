import { useLocalSearchParams } from 'expo-router';
import { HandoverPackScreen } from '@/components/HandoverPackScreen';
export default function CustomerHandoverPack(){ const { id } = useLocalSearchParams<{id:string}>(); return <HandoverPackScreen jobId={id} role="customer" />; }
