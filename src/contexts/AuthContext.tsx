import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

interface AppUser {
  id: string;
  supabase_user_id: string;
  company_id: string | null;
  full_name: string;
  email: string;
  role: "superadmin" | "admin" | "user";
  avatar_url: string | null;
  company_name: string | null;
  company_slug: string | null;
  company_logo: string | null;
}

interface AuthContextValue {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, session: null, loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (authUserId: string) => {
    try {
      const { data: profile } = await supabase
        .from("users")
        .select("id, supabase_user_id, company_id, full_name, email, role, avatar_url, companies:company_id(name, slug, logo_url)")
        .eq("supabase_user_id", authUserId)
        .maybeSingle();

      if (!profile) {
        await supabase.auth.signOut();
        setUser(null);
        return;
      }

      const co = profile.companies as any;
      setUser({
        id:               profile.id,
        supabase_user_id: profile.supabase_user_id ?? authUserId,
        company_id:       profile.company_id,
        full_name:        profile.full_name,
        email:            profile.email,
        role:             profile.role as "superadmin" | "admin" | "user",
        avatar_url:       profile.avatar_url ?? null,
        company_name:     co?.name ?? null,
        company_slug:     co?.slug ?? null,
        company_logo:     co?.logo_url ?? null,
      });
    } catch (err) {
      console.error("fetchProfile error:", err);
      setUser(null);
    }
  };

  useEffect(() => {
    // Fase 1 — carga inicial via getSession (mesmo padrão do controleoperacional)
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("initSession error:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // Fase 2 — subscription para mudanças futuras (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      if (session?.user) {
        // setTimeout(0) evita deadlock do Supabase ao fazer queries dentro do callback
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      } else {
        setUser(null);
      }

      // Garante que loading resolve mesmo que initSession já tenha rodado
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(translateSupabaseError(error.message)) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const refreshUser = async () => {
    if (session?.user) await fetchProfile(session.user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

function translateSupabaseError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos";
  if (msg.includes("Email not confirmed"))       return "Confirme seu e-mail antes de entrar";
  if (msg.includes("Too many requests"))         return "Muitas tentativas. Aguarde alguns minutos";
  return msg;
}
