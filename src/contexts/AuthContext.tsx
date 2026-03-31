import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setToken, clearToken } from "@/lib/api";

interface User {
  id: string;
  company_id: string;
  full_name: string;
  email: string;
  role: "superadmin" | "admin" | "user";
  avatar_url: string | null;
  company_name: string;
  company_slug: string;
  company_logo: string | null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, loading: true,
  signIn: async () => {}, signOut: () => {}, refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchMe() {
    try {
      const me = await api.get<User>("/api/auth/me");
      setUser(me);
    } catch {
      clearToken();
      setUser(null);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("hub_token");
    if (token) {
      fetchMe().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    const { token, user } = await api.post<{ token: string; user: User }>("/api/auth/login", { email, password });
    setToken(token);
    setUser(user);
  };

  const signOut = () => {
    clearToken();
    setUser(null);
  };

  const refreshUser = async () => { await fetchMe(); };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
