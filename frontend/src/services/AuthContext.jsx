import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext(null);
const VES_EMAIL_REGEX = /^[^\s@]+@ves\.ac\.in$/i;
const ADMIN_EMAIL = 'gauravhinduja99@gmail.com';

function isAllowedEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  return VES_EMAIL_REGEX.test(normalizedEmail) || normalizedEmail === ADMIN_EMAIL;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    let { data, error } = await supabase
      .from('users')
      .select('id, email, role, full_name, phone, loyalty_points, loyalty_tier')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code === '42703') {
      // Fallback if the Supabase database hasn't been migrated yet!
      console.warn('Schema migration missing! Falling back to safe profile fetch...');
      const fallback = await supabase
        .from('users')
        .select('id, email, role, full_name, phone')
        .eq('id', userId)
        .maybeSingle();
      
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('Failed to fetch profile:', error.message);
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
      async signUp(email, password, details = {}) {
        const normalizedEmail = String(email || '').trim().toLowerCase();
        if (!isAllowedEmail(normalizedEmail)) {
          throw new Error('Only @ves.ac.in email IDs are allowed (except the configured admin email).');
        }

        const fullName = String(details.fullName || '').trim();
        const phone = String(details.phone || '').trim();

        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              full_name: fullName,
              phone,
            },
          },
        });
        if (error) {
          const message = String(error.message || '').toLowerCase();
          if (message.includes('already registered') || message.includes('already been registered')) {
            throw new Error('This email is already registered. Please login instead.');
          }
          throw error;
        }
      },
      async signIn(email, password) {
        const normalizedEmail = String(email || '').trim().toLowerCase();
        if (!isAllowedEmail(normalizedEmail)) {
          throw new Error('Only @ves.ac.in email IDs are allowed (except the configured admin email).');
        }

        const signInPromise = supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Login timeout. Please try again.')), 15000);
        });

        const { error } = await Promise.race([signInPromise, timeoutPromise]);
        if (error) throw error;
      },
      async signOut() {
        setSession(null);
        setProfile(null);
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
      async updateProfile(updates) {
        if (!profile?.id) throw new Error('No active profile to update');

        const { data, error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', profile.id)
          .select()
          .single();

        if (error) throw error;
        setProfile(data);
        return data;
      },
    }),
    [loading, profile, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
