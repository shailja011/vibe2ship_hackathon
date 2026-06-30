"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";

interface AuthCtx {
  userId: string|null;
  profile: Profile|null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ userId:null, profile:null, loading:true, refresh:async()=>{}, logout:async()=>{} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string|null>(null);
  const [profile, setProfile] = useState<Profile|null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(id:string) {
    const { data } = await supabase.from("profiles").select("*").eq("id",id).single();
    setProfile(data as Profile ?? null);
  }

  async function refresh() {
    const { data:{ user } } = await supabase.auth.getUser();
    if(user) await loadProfile(user.id);
  }

  async function logout() {
    await supabase.auth.signOut();
    setUserId(null); setProfile(null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => {
      if(session?.user) {
        setUserId(session.user.id);
        loadProfile(session.user.id).finally(()=>setLoading(false));
      } else setLoading(false);
    });
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((_e,session) => {
      const id = session?.user?.id ?? null;
      setUserId(id);
      if(id) loadProfile(id); else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return <Ctx.Provider value={{ userId, profile, loading, refresh, logout }}>{children}</Ctx.Provider>;
}

export function useAuthCtx() { return useContext(Ctx); }
