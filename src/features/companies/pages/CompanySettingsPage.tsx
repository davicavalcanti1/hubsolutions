import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Member  { id: string; full_name: string; email: string; role: string; }
interface Module  { key: string; name: string; description: string | null; price_monthly: number; }
interface CompMod { module_key: string; active: boolean; }

export function CompanySettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  const [members, setMembers]           = useState<Member[]>([]);
  const [allModules, setAllModules]     = useState<Module[]>([]);
  const [activeModules, setActiveModules] = useState<CompMod[]>([]);
  const [inviteEmail, setInviteEmail]   = useState("");
  const [inviting, setInviting]         = useState(false);
  const [inviteLink, setInviteLink]     = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Member[]>("/api/companies/me/members"),
      api.get<Module[]>("/api/modules"),
      api.get<CompMod[]>("/api/companies/me/modules"),
    ]).then(([m, mods, cm]) => {
      setMembers(m);
      setAllModules(mods);
      setActiveModules(cm);
      setLoading(false);
    });
  }, []);

  const isActive = (key: string) => activeModules.some(cm => cm.module_key === key && cm.active);

  const toggleModule = async (key: string) => {
    setSaving(true);
    const updated = await api.post<CompMod>(`/api/companies/me/modules/${key}/toggle`, {});
    setActiveModules(prev => {
      const exists = prev.find(cm => cm.module_key === key);
      return exists ? prev.map(cm => cm.module_key === key ? updated : cm) : [...prev, updated];
    });
    setSaving(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    const inv = await api.post<{ token: string }>("/api/companies/me/invitations", { email: inviteEmail });
    setInviteLink(`${window.location.origin}/accept-invite?token=${inv.token}`);
    setInviteEmail("");
    setInviting(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/hub"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <span className="font-semibold text-sm">Configurações</span>
            <span className="text-xs text-muted-foreground block leading-none">{user?.company_name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Módulos</CardTitle>
            <CardDescription>Ative ou desative os módulos da sua empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {allModules.map(mod => (
              <div key={mod.key} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div>
                  <p className="text-sm font-medium">{mod.name}</p>
                  <p className="text-xs text-muted-foreground">{mod.description} · R$ {mod.price_monthly.toFixed(2)}/mês</p>
                </div>
                <button onClick={() => toggleModule(mod.key)} disabled={saving} className="text-muted-foreground hover:text-foreground transition-colors">
                  {isActive(mod.key) ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6" />}
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membros</CardTitle>
            <CardDescription>Usuários com acesso a esta empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium">{m.full_name}</p>
                  <p className="text-xs text-muted-foreground">{m.email} · {m.role}</p>
                </div>
                {m.id !== user?.id && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Convidar usuário</CardTitle>
            <CardDescription>Gere um link de convite para um novo membro</CardDescription>
          </CardHeader>
          <form onSubmit={handleInvite}>
            <CardContent className="space-y-4">
              {inviteLink && (
                <div className="bg-muted rounded-md p-3 text-xs font-mono break-all text-foreground">
                  <p className="text-muted-foreground mb-1 font-sans font-medium">Link de convite:</p>
                  {inviteLink}
                  <button type="button" onClick={() => navigator.clipboard.writeText(inviteLink)} className="ml-2 text-primary underline">copiar</button>
                </div>
              )}
              <div className="flex gap-2">
                <Input type="email" placeholder="email@usuario.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
                <Button type="submit" disabled={inviting}>
                  {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" />Convidar</>}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      </main>
    </div>
  );
}
