import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";

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
    try {
      const me = await api.get<User>("/api/auth/me");
      setUser(me);
    } catch (err: any) {
      // NO_PROFILE: autenticado no Supabase mas sem perfil local ainda
      // (ex: usuário recém registrado que ainda não completou o cadastro)
      if (err?.code !== "NO_PROFILE") {
        await supabase.auth.signOut();
      }
      setUser(null);
    }
  }

  useEffect(() => {
    // Escuta mudanças de sessão do Supabase (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await loadProfile();
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
