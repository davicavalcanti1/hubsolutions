import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"company" | "account">("company");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function slugify(text: string) {
    return text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  const handleCompanyStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !companySlug) return;
    setStep("account");
  };

  const handleAccountStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: company, error: compErr } = await supabase
        .from("companies")
        .insert({ name: companyName, slug: companySlug, email: companyEmail || null })
        .select()
        .single();
      if (compErr) throw compErr;

      const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password });
      if (authErr) throw authErr;
      if (!authData.user) throw new Error("Falha ao criar usuário");

      const { error: profErr } = await supabase.from("profiles").insert({
        id: authData.user.id,
        company_id: company.id,
        full_name: fullName,
        email,
        role: "admin" as const,
      });
      if (profErr) throw profErr;

      navigate("/hub");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  const steps = ["company", "account"] as const;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-2xl mb-4 shadow-md">
            H
          </div>
          <h1 className="text-2xl font-bold text-foreground">HubSolutions</h1>
          <p className="text-sm text-muted-foreground mt-1">Registrar nova empresa</p>
        </div>

        <div className="flex gap-2 mb-6">
          {steps.map((s) => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${s === "company" || step === "account" ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>

        {step === "company" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados da empresa</CardTitle>
              <CardDescription>Etapa 1 de 2</CardDescription>
            </CardHeader>
            <form onSubmit={handleCompanyStep}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="companyName">Nome da empresa</Label>
                  <Input
                    id="companyName"
                    placeholder="Minha Clínica"
                    value={companyName}
                    onChange={e => { setCompanyName(e.target.value); setCompanySlug(slugify(e.target.value)); }}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="companySlug">Identificador (slug)</Label>
                  <Input
                    id="companySlug"
                    placeholder="minha-clinica"
                    value={companySlug}
                    onChange={e => setCompanySlug(slugify(e.target.value))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Usado nas URLs. Apenas letras, números e traços.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="companyEmail">E-mail da empresa <span className="text-muted-foreground">(opcional)</span></Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    placeholder="contato@empresa.com"
                    value={companyEmail}
                    onChange={e => setCompanyEmail(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full">Continuar</Button>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criar conta admin</CardTitle>
              <CardDescription>Etapa 2 de 2 — empresa: <strong>{companyName}</strong></CardDescription>
            </CardHeader>
            <form onSubmit={handleAccountStep}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Seu nome</Label>
                  <Input
                    id="fullName"
                    placeholder="João Silva"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Criar conta
                </Button>
                <button type="button" onClick={() => setStep("company")} className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
                  Voltar
                </button>
              </CardFooter>
            </form>
          </Card>
        )}

        <p className="text-xs text-muted-foreground text-center mt-4">
          Já tem conta?{" "}
          <Link to="/login" className="text-foreground font-medium underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
