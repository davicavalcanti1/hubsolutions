import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, setToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface InviteInfo { email: string; company_name: string; company_id: string; role: string; }

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const token = searchParams.get("token");

  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [invite, setInvite]         = useState<InviteInfo | null>(null);
  const [fullName, setFullName]     = useState("");
  const [password, setPassword]     = useState("");

  useEffect(() => {
    if (!token) { setError("Token inválido"); setLoading(false); return; }
    api.get<InviteInfo>(`/api/invitations/${token}`)
      .then(data => { setInvite(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      const { token: jwt } = await api.post<{ token: string }>(`/api/invitations/${token}/accept`, { full_name: fullName, password });
      setToken(jwt);
      await refreshUser();
      navigate("/hub");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao aceitar convite");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (error && !invite) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center"><CardContent className="pt-6"><p className="text-sm text-destructive">{error}</p></CardContent></Card>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-2xl mb-4 shadow-md">H</div>
          <h1 className="text-2xl font-bold">HubSolutions</h1>
          <p className="text-sm text-muted-foreground mt-1">Aceitar convite — {invite?.company_name}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Criar sua conta</CardTitle>
            <CardDescription>Convite para <strong>{invite?.email}</strong></CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">{error}</div>}
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Seu nome</Label>
                <Input id="fullName" placeholder="João Silva" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar conta
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
