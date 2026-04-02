import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface User {
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
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, loading: true,
  signIn: async () => {}, signOut: async () => {}, refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setUser(null); return; }

    const { data: profile } = await supabase
      .from("users")
      .select("id, supabase_user_id, company_id, full_name, email, role, avatar_url, companies:company_id(name, slug, logo_url)")
      .eq("supabase_user_id", authUser.id)
      .maybeSingle();

    if (!profile) {
      await supabase.auth.signOut();
      setUser(null);
      return;
    }

    const co = profile.companies as any;
    setUser({
      id:               profile.id,
      supabase_user_id: profile.supabase_user_id ?? authUser.id,
      company_id:       profile.company_id,
      full_name:        profile.full_name,
      email:            profile.email,
      role:             profile.role as "superadmin" | "admin" | "user",
      avatar_url:       profile.avatar_url ?? null,
      company_name:     co?.name ?? null,
      company_slug:     co?.slug ?? null,
      company_logo:     co?.logo_url ?? null,
    });
  }

  useEffect(() => {
    let mounted = true;

    const timeout = <T,>(ms: number, fallback: T): Promise<T> =>
      new Promise(resolve => setTimeout(() => resolve(fallback), ms));

    // Carga inicial com timeout de 4s — getSession pode travar se token precisar de refresh
    Promise.race([
      supabase.auth.getSession(),
      timeout(4000, { data: { session: null } } as Awaited<ReturnType<typeof supabase.auth.getSession>>),
    ]).then(async ({ data: { session } }) => {
      if (!mounted) return;
      try {
        if (session) await loadProfile();
        else setUser(null);
      } catch {
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    // Subscription para mudanças futuras (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      try {
        if (session) await loadProfile();
        else setUser(null);
      } catch {
        setUser(null);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(translateSupabaseError(error.message));
    // onAuthStateChange dispara automaticamente e chama loadProfile
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshUser = async () => { await loadProfile(); };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser }}>
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
