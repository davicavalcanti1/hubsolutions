import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LandingPage }          from "@/features/landing/LandingPage";
import { LoginPage }            from "@/features/auth/pages/LoginPage";
import { SetupPage }            from "@/features/auth/pages/SetupPage";
import { AcceptInvitePage }     from "@/features/auth/pages/AcceptInvitePage";
import { CompanySettingsPage }  from "@/features/companies/pages/CompanySettingsPage";
import { TenantHubPage }             from "@/features/tenant/pages/TenantHubPage";
import { TenantThemeProvider }       from "@/features/tenant/context/TenantThemeContext";
import { OcorrenciasPage }           from "@/features/ocorrencias/pages/OcorrenciasPage";
import { NovaOcorrenciaPage }        from "@/features/ocorrencias/pages/NovaOcorrenciaPage";
import { OcorrenciaDetailPage }      from "@/features/ocorrencias/pages/OcorrenciaDetailPage";
import { OcorrenciasHistoricoPage }  from "@/features/ocorrencias/pages/OcorrenciasHistoricoPage";
import { EscalaPage }                from "@/features/escala/pages/EscalaPage";
import { DevLayout }                 from "@/features/developer/layout/DevLayout";
import { DevDashboard }         from "@/features/developer/pages/DevDashboard";
import { TenantsPage }          from "@/features/developer/pages/TenantsPage";
import { TenantDetailPage }     from "@/features/developer/pages/TenantDetailPage";
import { FeatureRequestsPage }  from "@/features/developer/pages/FeatureRequestsPage";
import { Loader2 } from "lucide-react";
import { useParams, Link } from "react-router-dom";

function ComingSoon({ label }: { label: string }) {
  const { slug } = useParams<{ slug: string }>();
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <p className="text-5xl font-black text-slate-200">Em breve</p>
      <p className="text-slate-500 text-sm">O módulo <span className="text-slate-700">{label}</span> está em desenvolvimento.</p>
      <Link to={`/${slug}`} className="text-sm text-slate-400 hover:text-slate-600 underline">← Voltar ao hub</Link>
    </div>
  );
}

function SlugLayout() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return <Navigate to="/" replace />;
  return (
    <TenantThemeProvider slug={slug}>
      <Outlet />
    </TenantThemeProvider>
  );
}

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Redireciona /hub para o destino correto baseado no role */
function HubRedirect() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "superadmin") return <Navigate to="/developer" replace />;
  if (user.company_slug) return <Navigate to={`/${user.company_slug}`} replace />;
  return <Navigate to="/login" replace />;
}

function DevRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#070707]">
      <Loader2 className="h-6 w-6 animate-spin text-white/30" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "superadmin") return <Navigate to="/hub" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    if (user.role === "superadmin") return <Navigate to="/developer" replace />;
    if (user.company_slug) return <Navigate to={`/${user.company_slug}`} replace />;
    return <Navigate to="/hub" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"              element={<LandingPage />} />
      <Route path="/login"         element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/setup"         element={<SetupPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />

      {/* Authenticated hub — redireciona para /:slug ou /developer */}
      <Route path="/hub"          element={<HubRedirect />} />
      <Route path="/hub/settings" element={<ProtectedRoute><CompanySettingsPage /></ProtectedRoute>} />

      {/* Developer panel */}
      <Route path="/developer" element={<DevRoute><DevLayout /></DevRoute>}>
        <Route index                  element={<DevDashboard />} />
        <Route path="tenants"         element={<TenantsPage />} />
        <Route path="tenants/:id"     element={<TenantDetailPage />} />
        <Route path="features"        element={<FeatureRequestsPage />} />
        <Route path="plans"           element={<div className="p-8 text-white/30">Em breve</div>} />
        <Route path="activity"        element={<div className="p-8 text-white/30">Em breve</div>} />
      </Route>

      {/* Tenant slug routes — all share TenantThemeProvider via SlugLayout */}
      <Route path="/:slug" element={<SlugLayout />}>
        <Route index                       element={<TenantHubPage />} />
        <Route path="ocorrencias"          element={<ProtectedRoute><OcorrenciasPage /></ProtectedRoute>} />
        <Route path="ocorrencias/nova"     element={<ProtectedRoute><NovaOcorrenciaPage /></ProtectedRoute>} />
        <Route path="ocorrencias/historico" element={<ProtectedRoute><OcorrenciasHistoricoPage /></ProtectedRoute>} />
        <Route path="ocorrencias/:id"      element={<ProtectedRoute><OcorrenciaDetailPage /></ProtectedRoute>} />
        <Route path="escala"               element={<ProtectedRoute><EscalaPage /></ProtectedRoute>} />
        <Route path="controlemidia"        element={<ProtectedRoute><ComingSoon label="Controle de Mídia" /></ProtectedRoute>} />
        <Route path="checkin"              element={<ProtectedRoute><ComingSoon label="Check-in" /></ProtectedRoute>} />
        <Route path="enfermagem"           element={<ProtectedRoute><ComingSoon label="Central de Enfermagem" /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
