import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';

import { supabaseClient } from '@/src/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  retry: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const retry = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError) throw sessionError;
      setSession(data.session);
    } catch {
      setError('Your session could not be restored. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let authEvents = 0;
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      authEvents += 1;
      setSession(nextSession);
      setError(null);
      if (event === 'INITIAL_SESSION') setLoading(false);
    });

    const initialEvents = authEvents;
    void supabaseClient.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || authEvents !== initialEvents) return;
      if (sessionError) setError('Your session could not be restored. Please try again.');
      else setSession(data.session);
      setLoading(false);
    }).catch(() => {
      if (!active || authEvents !== initialEvents) return;
      setError('Your session could not be restored. Please try again.');
      setLoading(false);
    });

    const refresh = (state: string | null) => {
      if (state === 'active') supabaseClient.auth.startAutoRefresh();
      else supabaseClient.auth.stopAutoRefresh();
    };
    if (Platform.OS !== 'web') refresh(AppState.currentState);
    const appState = Platform.OS !== 'web' ? AppState.addEventListener('change', refresh) : null;

    return () => {
      active = false;
      subscription.unsubscribe();
      appState?.remove();
      if (Platform.OS !== 'web') supabaseClient.auth.stopAutoRefresh();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, error, retry }}>
      {children}
    </AuthContext.Provider>
  );
}
