import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      setProfile((prev) => prev || null);
      return;
    }

    setProfile(data || null);
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session?.user?.id) {
        fetchProfile(data.session.user.id);
      }
      setLoading(false);
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession);
        if (nextSession?.user?.id) {
          fetchProfile(nextSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      async signUp(email, password) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      },
      async signIn(email, password) {
        const signInPromise = supabase.auth.signInWithPassword({ email, password });
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Login timeout. Please try again.')), 15000);
        });

        const { error } = await Promise.race([signInPromise, timeoutPromise]);
        if (error) throw error;
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [loading, profile, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
