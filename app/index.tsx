import { Redirect } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';

export default function IndexScreen() {
  const { session } = useAuth();
  return <Redirect href={session ? '/profile' : '/login'} />;
}
