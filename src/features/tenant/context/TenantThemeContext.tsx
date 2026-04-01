import {
  createContext, useContext, useEffect, useState, type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [theme, setTheme]       = useState<TenantTheme | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // Get company
        const { data: company, error } = await supabase
          .from("companies")
          .select("id, slug, display_name, logo_url, favicon_url, primary_color, secondary_color, plans:plan_id(name)")
          .eq("slug", slug)
          .eq("active", true)
          .maybeSingle();

        if (error || !company) { setNotFound(true); setLoading(false); return; }

        // Get active modules for this company
        const { data: companyModules } = await supabase
          .from("company_modules")
          .select("module_key, active")
          .eq("company_id", company.id)
          .eq("active", true);

        // Get module details
        const moduleKeys = companyModules?.map(m => m.module_key) ?? [];
        const { data: moduleDetails } = moduleKeys.length > 0
          ? await supabase.from("modules").select("key, name, description").in("key", moduleKeys)
          : { data: [] };

        const activeModules = (companyModules ?? []).map(m => ({
          module_key:  m.module_key,
          active:      m.active,
          name:        moduleDetails?.find(d => d.key === m.module_key)?.name ?? m.module_key,
          description: moduleDetails?.find(d => d.key === m.module_key)?.description ?? "",
        }));

        const plan = company.plans as any;

        const themeData: TenantTheme = {
          id:              company.id,
          slug:            company.slug,
          display_name:    company.display_name,
          logo_url:        company.logo_url,
          favicon_url:     company.favicon_url,
          primary_color:   /^#[0-9a-fA-F]{6}$/.test(company.primary_color ?? "") ? company.primary_color! : "#a3e635",
          secondary_color: /^#[0-9a-fA-F]{6}$/.test(company.secondary_color ?? "") ? company.secondary_color! : "#ffffff",
          plan_name:       plan?.name ?? "free",
          active_modules:  activeModules,
        };

        setTheme(themeData);

        // Apply CSS custom properties for white-label theming
        document.documentElement.style.setProperty("--tenant-primary",   themeData.primary_color);
        document.documentElement.style.setProperty("--tenant-secondary", themeData.secondary_color);

        // Update favicon if provided
        if (themeData.favicon_url) {
          const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
          if (link) link.href = themeData.favicon_url;
        }

        // Update page title
        if (themeData.display_name) document.title = themeData.display_name;
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    load();

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
