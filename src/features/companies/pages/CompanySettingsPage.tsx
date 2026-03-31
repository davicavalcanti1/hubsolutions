import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Module = Database["public"]["Tables"]["modules"]["Row"];
type CompanyModule = Database["public"]["Tables"]["company_modules"]["Row"];

export function CompanySettingsPage() {
  const { company, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [members, setMembers] = useState<Profile[]>([]);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [activeModules, setActiveModules] = useState<CompanyModule[]>([]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  useEffect(() => {
    if (!company?.id) return;
    Promise.all([
      supabase.from("profiles").select("*").eq("company_id", company.id),
      supabase.from("modules").select("*").order("name"),
      supabase.from("company_modules").select("*").eq("company_id", company.id),
    ]).then(([{ data: m }, { data: mods }, { data: cm }]) => {
      setMembers(m ?? []);
      setAllModules(mods ?? []);
      setActiveModules(cm ?? []);
      setLoading(false);
    });
  }, [company?.id]);

  const isActive = (key: string) => activeModules.some(cm => cm.module_key === key && cm.active);

  const toggleModule = async (key: string) => {
    if (!company?.id) return;
    setSaving(true);
    const existing = activeModules.find(cm => cm.module_key === key);
    if (existing) {
      await supabase.from("company_modules").update({ active: !existing.active }).eq("id", existing.id);
      setActiveModules(prev => prev.map(cm => cm.module_key === key ? { ...cm, active: !cm.active } : cm));
    } else {
      const { data } = await supabase.from("company_modules").insert({
        company_id: company.id, module_key: key, active: true,
      }).select().single();
      if (data) setActiveModules(prev => [...prev, data]);
    }
    setSaving(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id || !inviteEmail) return;
    setInviting(true);
    const { data } = await supabase.from("invitations").insert({
      company_id: company.id,
      email: inviteEmail,
      role: "user" as const,
    }).select().single();
    if (data) {
      const link = `${window.location.origin}/accept-invite?token=${data.token}`;
      setInviteLink(link);
      setInviteEmail("");
    }
    setInviting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/hub"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <span className="font-semibold text-sm">Configurações</span>
            <span className="text-xs text-muted-foreground block leading-none">{company?.name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* Modules */}
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
                <button
                  onClick={() => toggleModule(mod.key)}
                  disabled={saving}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isActive(mod.key)
                    ? <ToggleRight className="h-6 w-6 text-primary" />
                    : <ToggleLeft className="h-6 w-6" />
                  }
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Members */}
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
                {m.id !== profile?.id && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Invite */}
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
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(inviteLink)}
                    className="ml-2 text-primary underline"
                  >
                    copiar
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@usuario.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  required
                />
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
