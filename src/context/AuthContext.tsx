import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getStoreByUserId, isAdmin } from '@/lib/supabase-store';
import type { User as SupaUser, Session } from '@supabase/supabase-js';

interface AuthState {
  user: SupaUser | null;
  session: Session | null;
  storeId: string | null;
  storeName: string | null;
  isAdminUser: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null; storeStatus?: string }>;
  register: (email: string, password: string, storeData: {
    storeName: string; ownerName: string; contactNo: string;
    streetAddress: string; suburb: string; city: string; pinCode: string;
    refCodeDiscount: string;
  }) => Promise<{ error: string | null; storeId?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Defer data fetching to avoid deadlocks
        setTimeout(async () => {
          const store = await getStoreByUserId(session.user.id);
          if (store) {
            setStoreId(store.id);
            setStoreName(store.name);
          }
          const admin = await isAdmin(session.user.id);
          setIsAdminUser(admin);
          setLoading(false);
        }, 0);
      } else {
        setStoreId(null);
        setStoreName(null);
        setIsAdminUser(false);
        setLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };

      // Check store status and set store data immediately before returning
      try {
        const store = await getStoreByUserId(data.user.id);
        if (store?.status === 'paused') {
          await supabase.auth.signOut();
          return { error: 'This store is currently paused. Please contact admin.', storeStatus: 'paused' };
        }

        // Set store data now so it's available when navigating
        if (store) {
          setStoreId(store.id);
          setStoreName(store.name);
        }
      } catch (storeErr) {
        console.error('Failed to fetch store data:', storeErr);
      }

      try {
        const admin = await isAdmin(data.user.id);
        setIsAdminUser(admin);
      } catch {
        setIsAdminUser(false);
      }

      return { error: null };
    } catch (err) {
      console.error('Login error:', err);
      return { error: err instanceof Error ? err.message : 'Login failed. Please try again.' };
    }
  };

  const register = async (email: string, password: string, storeData: {
    storeName: string; ownerName: string; contactNo: string;
    streetAddress: string; suburb: string; city: string; pinCode: string;
    refCodeDiscount: string;
  }) => {
    // 1. Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'Registration failed' };

    // 2. Generate store ID
    const { data: newStoreId, error: idError } = await supabase.rpc('generate_store_id');
    if (idError) return { error: idError.message };

    // 3. Create store record
    const combinedAddress = `${storeData.streetAddress}, ${storeData.suburb}, ${storeData.city} ${storeData.pinCode}`;
    const { error: storeError } = await supabase.from('stores').insert({
      id: newStoreId,
      user_id: data.user.id,
      name: storeData.storeName,
      owner_name: storeData.ownerName,
      contact_no: storeData.contactNo,
      email,
      street_address: storeData.streetAddress,
      suburb: storeData.suburb,
      city: storeData.city,
      pin_code: storeData.pinCode,
      address: combinedAddress,
      ref_code_discount: storeData.refCodeDiscount,
    });
    if (storeError) return { error: storeError.message };

    return { error: null, storeId: newStoreId };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setStoreId(null);
    setStoreName(null);
    setIsAdminUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, storeId, storeName, isAdminUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
