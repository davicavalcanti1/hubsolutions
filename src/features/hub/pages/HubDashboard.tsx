import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Package, LogOut, Settings } from "lucide-react";
import { Link } from "react-router-dom";

interface Module { key: string; name: string; description: string | null; price_monthly: number; }
interface CompanyModule { module_key: string; active: boolean; }

const MODULE_ICONS: Record<string, string> = {
  checkin: "🏥", enfermagem: "🔔", controlemidia: "📺",
};

export function HubDashboard() {
  const { user, signOut } = useAuth();
  const [allModules, setAllModules]       = useState<Module[]>([]);
  const [activeModules, setActiveModules] = useState<CompanyModule[]>([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    if (!user?.company_id) return;
    Promise.all([
      supabase.from("modules").select("key, name, description, price_monthly").order("name"),
      supabase.from("company_modules").select("module_key, active")
        .eq("company_id", user.company_id).eq("active", true),
    ]).then(([{ data: mods }, { data: cm }]) => {
      setAllModules(mods ?? []);
      setActiveModules(cm ?? []);
      setLoading(false);
    });
  }, [user?.company_id]);

  const isActive = (key: string) => activeModules.some(cm => cm.module_key === key);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">H</div>
            <div>
              <span className="font-semibold text-sm text-foreground">{user?.company_name}</span>
              <span className="text-xs text-muted-foreground block leading-none">{user?.company_slug}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === "admin" && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/hub/settings"><Settings className="h-4 w-4 mr-1.5" />Configurações</Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1.5" />Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Olá, {user?.full_name?.split(" ")[0]} 👋</h1>
          <p className="text-muted-foreground mt-1">Selecione um módulo para acessar</p>
        </div>

        <section className="mb-10">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Módulos ativos</h2>
          {activeModules.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
              <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum módulo ativo ainda.</p>
              {user?.role === "admin" && (
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link to="/hub/settings">Ativar módulos</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allModules.filter(m => isActive(m.key)).map(mod => (
                <Card key={mod.key} className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader className="pb-2">
                    <div className="text-3xl mb-2">{MODULE_ICONS[mod.key] ?? "📦"}</div>
                    <CardTitle className="text-base">{mod.name}</CardTitle>
                    <CardDescription className="text-xs">{mod.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      Acessar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {user?.role === "admin" && allModules.some(m => !isActive(m.key)) && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Disponíveis para contratar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allModules.filter(m => !isActive(m.key)).map(mod => (
                <Card key={mod.key} className="opacity-75 border-dashed">
                  <CardHeader className="pb-2">
                    <div className="text-3xl mb-2 grayscale">{MODULE_ICONS[mod.key] ?? "📦"}</div>
                    <CardTitle className="text-base text-muted-foreground">{mod.name}</CardTitle>
                    <CardDescription className="text-xs">{mod.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">R$ {mod.price_monthly.toFixed(2)}/mês</span>
                      <Button size="sm" asChild><Link to="/hub/settings">Contratar</Link></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
