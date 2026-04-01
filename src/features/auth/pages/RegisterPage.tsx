import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-2xl mb-4 shadow-md">H</div>
          <h1 className="text-2xl font-bold text-foreground">HubSolutions</h1>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4 text-center">
            <ShieldCheck className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              O registro público não está disponível.<br />
              Acesse com suas credenciais fornecidas pelo administrador.
            </p>
            <Button asChild className="w-full">
              <Link to="/login">Ir para o login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
