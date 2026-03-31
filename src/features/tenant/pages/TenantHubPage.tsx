import { useParams, Navigate } from "react-router-dom";
import { TenantThemeProvider, useTenantTheme } from "../context/TenantThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Monitor, UserCheck, Bell, LogOut, Settings, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const MODULE_META: Record<string, { icon: React.ComponentType<{ className?: string }>; gradient: string }> = {
  screenflow:   { icon: Monitor,   gradient: "from-lime-400 to-emerald-400"  },
  flowdesk:     { icon: UserCheck, gradient: "from-sky-400 to-blue-500"      },
  nurselink:    { icon: Bell,      gradient: "from-violet-400 to-purple-500" },
  checkin:      { icon: UserCheck, gradient: "from-sky-400 to-blue-500"      },
  enfermagem:   { icon: Bell,      gradient: "from-violet-400 to-purple-500" },
  controlemidia:{ icon: Monitor,   gradient: "from-lime-400 to-emerald-400"  },
};

function HubContent() {
  const { theme, loading, notFound } = useTenantTheme();
  const { user, signOut } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <Loader2 className="h-6 w-6 animate-spin text-white/30" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
      <div className="text-center">
        <p className="text-6xl font-black text-white/10 mb-4">404</p>
        <p className="text-white/40 mb-6">Empresa não encontrada.</p>
        <Link to="/" className="text-sm text-white/60 hover:text-white underline">Voltar ao início</Link>
      </div>
    </div>
  );

  if (!theme) return null;

  const primary = theme.primary_color;
  const name    = theme.display_name ?? theme.slug;
  const modules = theme.active_modules;

  // Single module → redirect directly
  if (modules.length === 1 && user) {
    return <Navigate to={`/${theme.slug}/${modules[0].module_key}`} replace />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">

      {/* Noise + glow */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${primary}14 0%, transparent 70%)` }} />

      {/* Header */}
      <header className="relative border-b border-white/[0.06] backdrop-blur-xl bg-[#050505]/80 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme.logo_url ? (
              <img src={theme.logo_url} alt={name} className="h-7 w-auto object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black"
                style={{ background: `${primary}25`, color: primary, border: `1px solid ${primary}35` }}>
                {name[0]?.toUpperCase()}
              </div>
            )}
            <span className="font-bold text-sm">{name}</span>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === "admin" && (
              <Link to={`/${theme.slug}/settings`}
                className="text-white/30 hover:text-white/60 transition-colors p-2 rounded-lg hover:bg-white/[0.04]">
                <Settings className="h-4 w-4" />
              </Link>
            )}
            {user ? (
              <button onClick={signOut}
                className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors px-3 py-2 rounded-lg hover:bg-white/[0.04]">
                <LogOut className="h-3.5 w-3.5" /> Sair
              </button>
            ) : (
              <Link to="/login"
                className="text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                style={{ background: `${primary}20`, color: primary, border: `1px solid ${primary}30` }}>
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative max-w-5xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-3xl font-black tracking-tight mb-2">
            {user ? `Olá, ${user.full_name?.split(" ")[0]} 👋` : `Bem-vindo a ${name}`}
          </h1>
          <p className="text-white/30">Selecione um módulo para acessar.</p>
        </div>

        {modules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-4">
              <Bell className="h-7 w-7 text-white/20" />
            </div>
            <p className="text-white/30 text-sm">Nenhum módulo ativo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map(mod => {
              const meta = MODULE_META[mod.module_key] ?? { icon: Bell, gradient: "from-white/20 to-white/10" };
              const Icon = meta.icon;
              return (
                <Link
                  key={mod.module_key}
                  to={user ? `/${theme.slug}/${mod.module_key}` : "/login"}
                  className="group relative rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-6 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                  style={{ "--hover-border": `${primary}30` } as React.CSSProperties}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `${primary}25`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
                >
                  {/* Top accent */}
                  <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${meta.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />

                  <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${meta.gradient} mb-4`}>
                    <Icon className="h-5 w-5 text-black" />
                  </div>

                  <h3 className="text-base font-bold mb-1">{mod.name}</h3>
                  <p className="text-xs text-white/35 leading-relaxed mb-5">{mod.description}</p>

                  <div className="flex items-center gap-1 text-xs font-medium transition-colors"
                    style={{ color: primary }}>
                    Acessar <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-6 text-center">
        <p className="text-[10px] text-white/15">
          Powered by{" "}
          <Link to="/" className="hover:text-white/30 transition-colors">HubSolutions</Link>
        </p>
      </footer>
    </div>
  );
}

export function TenantHubPage() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return <Navigate to="/" replace />;

  return (
    <TenantThemeProvider slug={slug}>
      <HubContent />
    </TenantThemeProvider>
  );
}
