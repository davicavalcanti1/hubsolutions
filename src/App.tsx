import { lazy, Suspense, Component, type ReactNode } from "react";

// Recarrega a página quando um chunk lazy não é encontrado (stale deploy)
class ChunkErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  componentDidCatch(err: Error) {
    if (err.message.includes("Failed to fetch dynamically imported module") ||
        err.message.includes("Loading chunk") ||
        err.message.includes("Importing a module script failed")) {
      window.location.reload();
    }
  }
  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TenantThemeProvider } from "@/features/tenant/context/TenantThemeContext";
import { Loader2 } from "lucide-react";
import { useParams, Link } from "react-router-dom";

// Lazy-loaded pages — cada rota vira chunk separado
const LandingPage           = lazy(() => import("@/features/landing/LandingPage").then(m => ({ default: m.LandingPage })));
const LoginPage             = lazy(() => import("@/features/auth/pages/LoginPage").then(m => ({ default: m.LoginPage })));
const AcceptInvitePage      = lazy(() => import("@/features/auth/pages/AcceptInvitePage").then(m => ({ default: m.AcceptInvitePage })));
const CompanySettingsPage   = lazy(() => import("@/features/companies/pages/CompanySettingsPage").then(m => ({ default: m.CompanySettingsPage })));
const TenantHubPage         = lazy(() => import("@/features/tenant/pages/TenantHubPage").then(m => ({ default: m.TenantHubPage })));
const OcorrenciasPage       = lazy(() => import("@/features/ocorrencias/pages/OcorrenciasPage").then(m => ({ default: m.OcorrenciasPage })));
const NovaOcorrenciaPage    = lazy(() => import("@/features/ocorrencias/pages/NovaOcorrenciaPage").then(m => ({ default: m.NovaOcorrenciaPage })));
const OcorrenciaDetailPage  = lazy(() => import("@/features/ocorrencias/pages/OcorrenciaDetailPage").then(m => ({ default: m.OcorrenciaDetailPage })));
const OcorrenciasHistoricoPage = lazy(() => import("@/features/ocorrencias/pages/OcorrenciasHistoricoPage").then(m => ({ default: m.OcorrenciasHistoricoPage })));
const EscalaPage            = lazy(() => import("@/features/escala/pages/EscalaPage").then(m => ({ default: m.EscalaPage })));
const DevLayout             = lazy(() => import("@/features/developer/layout/DevLayout").then(m => ({ default: m.DevLayout })));
const DevDashboard          = lazy(() => import("@/features/developer/pages/DevDashboard").then(m => ({ default: m.DevDashboard })));
const TenantsPage           = lazy(() => import("@/features/developer/pages/TenantsPage").then(m => ({ default: m.TenantsPage })));
const TenantDetailPage      = lazy(() => import("@/features/developer/pages/TenantDetailPage").then(m => ({ default: m.TenantDetailPage })));
const FeatureRequestsPage   = lazy(() => import("@/features/developer/pages/FeatureRequestsPage").then(m => ({ default: m.FeatureRequestsPage })));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            5 * 60 * 1000, // 5 min — não refaz query em cada mount
      gcTime:               15 * 60 * 1000, // 15 min em cache
      retry:                1,
      refetchOnWindowFocus: false,          // evita refetch ao voltar para a aba
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function HubRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
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
  if (loading) return <PageLoader />;
  if (user) {
    if (user.role === "superadmin") return <Navigate to="/developer" replace />;
    if (user.company_slug) return <Navigate to={`/${user.company_slug}`} replace />;
    return <Navigate to="/hub" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <ChunkErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/"              element={<LandingPage />} />
        <Route path="/login"         element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />

        {/* Hub redirect */}
        <Route path="/hub"          element={<HubRedirect />} />
        <Route path="/hub/settings" element={<ProtectedRoute><CompanySettingsPage /></ProtectedRoute>} />

        {/* Developer panel */}
        <Route path="/developer" element={<DevRoute><DevLayout /></DevRoute>}>
          <Route index                element={<DevDashboard />} />
          <Route path="tenants"       element={<TenantsPage />} />
          <Route path="tenants/:id"   element={<TenantDetailPage />} />
          <Route path="features"      element={<FeatureRequestsPage />} />
          <Route path="plans"         element={<div className="p-8 text-white/30">Em breve</div>} />
          <Route path="activity"      element={<div className="p-8 text-white/30">Em breve</div>} />
        </Route>

        {/* Tenant slug routes */}
        <Route path="/:slug" element={<SlugLayout />}>
          <Route index                        element={<TenantHubPage />} />
          <Route path="ocorrencias"           element={<ProtectedRoute><OcorrenciasPage /></ProtectedRoute>} />
          <Route path="ocorrencias/nova"      element={<ProtectedRoute><NovaOcorrenciaPage /></ProtectedRoute>} />
          <Route path="ocorrencias/historico" element={<ProtectedRoute><OcorrenciasHistoricoPage /></ProtectedRoute>} />
          <Route path="ocorrencias/:id"       element={<ProtectedRoute><OcorrenciaDetailPage /></ProtectedRoute>} />
          <Route path="escala"                element={<ProtectedRoute><EscalaPage /></ProtectedRoute>} />
          <Route path="controlemidia"         element={<ProtectedRoute><ComingSoon label="Controle de Mídia" /></ProtectedRoute>} />
          <Route path="checkin"               element={<ProtectedRoute><ComingSoon label="Check-in" /></ProtectedRoute>} />
          <Route path="enfermagem"            element={<ProtectedRoute><ComingSoon label="Central de Enfermagem" /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    </ChunkErrorBoundary>
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
