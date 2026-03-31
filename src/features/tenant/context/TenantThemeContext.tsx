import {
  createContext, useContext, useEffect, useState, type ReactNode,
} from "react";
import { api } from "@/lib/api";

interface TenantModule {
  module_key: string; active: boolean; name: string; description: string;
}

interface TenantTheme {
  id: string;
  slug: string;
  display_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  plan_name: string;
  active_modules: TenantModule[];
}

interface TenantThemeContextValue {
  theme: TenantTheme | null;
  loading: boolean;
  notFound: boolean;
}

const TenantThemeContext = createContext<TenantThemeContextValue>({
  theme: null, loading: true, notFound: false,
});

export function useTenantTheme() {
  return useContext(TenantThemeContext);
}

export function TenantThemeProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [theme, setTheme]     = useState<TenantTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get<TenantTheme>(`/api/hub/${slug}`)
      .then(data => {
        setTheme(data);
        // Apply CSS custom properties for white-label theming
        document.documentElement.style.setProperty("--tenant-primary",   data.primary_color);
        document.documentElement.style.setProperty("--tenant-secondary", data.secondary_color);
        // Update favicon if provided
        if (data.favicon_url) {
          const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
          if (link) link.href = data.favicon_url;
        }
        // Update page title
        if (data.display_name) document.title = data.display_name;
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    return () => {
      // Reset CSS vars when leaving tenant hub
      document.documentElement.style.removeProperty("--tenant-primary");
      document.documentElement.style.removeProperty("--tenant-secondary");
    };
  }, [slug]);

  return (
    <TenantThemeContext.Provider value={{ theme, loading, notFound }}>
      {children}
    </TenantThemeContext.Provider>
  );
}
