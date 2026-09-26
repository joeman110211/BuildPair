import { useLocalSearchParams } from 'expo-router';
import { HandoverPackScreen } from '@/components/HandoverPackScreen';
export default function TraderHandoverPack(){ const { id } = useLocalSearchParams<{id:string}>(); return <HandoverPackScreen jobId={id} role="trader" />; }
