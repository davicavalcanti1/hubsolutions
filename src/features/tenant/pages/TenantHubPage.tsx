import { Navigate } from "react-router-dom";
import { useTenantTheme } from "../context/TenantThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Monitor, UserCheck, Bell, LogOut, Settings,
  ArrowRight, Loader2, ClipboardList, CalendarDays,
} from "lucide-react";
import { Link } from "react-router-dom";

const MODULE_META: Record<string, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }> = {
  controlemidia: { icon: Monitor,       color: "#0ea5e9" },
  checkin:       { icon: UserCheck,     color: "#6366f1" },
  enfermagem:    { icon: Bell,          color: "#8b5cf6" },
  ocorrencias:   { icon: ClipboardList, color: "#f97316" },
  escala:        { icon: CalendarDays,  color: "#0d9488" },
};

export function TenantHubPage() {
  const { theme, loading, notFound } = useTenantTheme();
  const { user, signOut } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <p className="text-6xl font-black text-slate-200 mb-4">404</p>
        <p className="text-slate-400 mb-6">Empresa não encontrada.</p>
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-800 underline">Voltar ao início</Link>
      </div>
    </div>
  );

  if (!theme) return null;

  const primary = theme.primary_color;
  const name    = theme.display_name ?? theme.slug;
  const modules = theme.active_modules;

  if (modules.length === 1 && user) {
    return <Navigate to={`/${theme.slug}/${modules[0].module_key}`} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Subtle grid background */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      {/* Brand glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${primary}18 0%, transparent 70%)` }} />

      <header className="relative border-b border-slate-200 backdrop-blur-xl bg-white/80 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme.logo_url ? (
              <img src={theme.logo_url} alt={name} className="h-7 w-auto object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black"
                style={{ background: `${primary}20`, color: primary, border: `1px solid ${primary}35` }}>
                {name[0]?.toUpperCase()}
              </div>
            )}
            <span className="font-bold text-sm text-slate-900">{name}</span>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === "admin" && (
              <Link to={`/${theme.slug}/settings`}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100">
                <Settings className="h-4 w-4" />
              </Link>
            )}
            {user ? (
              <button onClick={signOut}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100">
                <LogOut className="h-3.5 w-3.5" /> Sair
              </button>
            ) : (
              <Link to="/login"
                className="text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                style={{ background: `${primary}15`, color: primary, border: `1px solid ${primary}30` }}>
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="relative max-w-5xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-3xl font-black tracking-tight mb-2 text-slate-900">
            {user ? `Olá, ${user.full_name?.split(" ")[0]}` : `Bem-vindo a ${name}`}
          </h1>
          <p className="text-slate-400">Selecione um módulo para acessar.</p>
        </div>

        {modules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-4">
              <Bell className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-slate-400 text-sm">Nenhum módulo ativo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map(mod => {
              const meta  = MODULE_META[mod.module_key] ?? { icon: Bell, color: primary };
              const Icon  = meta.icon;
              const color = meta.color;
              return (
                <Link key={mod.module_key}
                  to={user ? `/${theme.slug}/${mod.module_key}` : "/login"}
                  className="group relative rounded-2xl border border-slate-200 bg-white p-6 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-300">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                    <Icon className="h-5 w-5" style={{ color }} />
                  </div>
                  <h3 className="text-base font-bold mb-1 text-slate-900">{mod.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-5">{mod.description}</p>
                  <div className="flex items-center gap-1 text-xs font-medium transition-colors" style={{ color: primary }}>
                    Acessar <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-100 py-6 text-center">
        <p className="text-[10px] text-slate-300">
          Powered by <Link to="/" className="hover:text-slate-500 transition-colors">HubSolutions</Link>
        </p>
      </footer>
    </div>
  );
}
