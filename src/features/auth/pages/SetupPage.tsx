import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";

export function SetupPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [exists, setExists]     = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    api.get<{ exists: boolean }>("/api/auth/has-superadmin")
      .then(data => { setExists(data.exists); setChecking(false); })
      .catch(() => setChecking(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Senha deve ter no mínimo 8 caracteres"); return; }
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/setup-superadmin", { full_name: fullName, email, password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao configurar");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (exists) return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="pt-6 space-y-3">
          <ShieldCheck className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">A plataforma já foi configurada.</p>
          <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>Ir para o login</Button>
        </CardContent>
      </Card>
    </div>
  );

  if (success) return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="pt-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-sm font-medium">Developer criado com sucesso!</p>
          <p className="text-xs text-muted-foreground">Redirecionando para o login...</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-2xl mb-4 shadow-md">H</div>
          <h1 className="text-2xl font-bold text-foreground">HubSolutions</h1>
          <p className="text-sm text-muted-foreground mt-1">Configuração inicial</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Criar conta Developer</CardTitle>
            <CardDescription>Esta conta terá controle total da plataforma. Só pode ser criada uma vez.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">{error}</div>}
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Seu nome</Label>
                <Input id="fullName" placeholder="Seu nome completo" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" placeholder="dev@hubsolutions.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input id="password" type={showPw ? "text" : "password"} placeholder="Mínimo 8 caracteres"
                    value={password} onChange={e => setPassword(e.target.value)} minLength={8} required className="pr-10" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar Developer
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
