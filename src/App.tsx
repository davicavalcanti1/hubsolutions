import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LandingPage }          from "@/features/landing/LandingPage";
import { LoginPage }            from "@/features/auth/pages/LoginPage";
import { RegisterPage }         from "@/features/auth/pages/RegisterPage";
import { AcceptInvitePage }     from "@/features/auth/pages/AcceptInvitePage";
import { HubDashboard }         from "@/features/hub/pages/HubDashboard";
import { CompanySettingsPage }  from "@/features/companies/pages/CompanySettingsPage";
import { TenantHubPage }        from "@/features/tenant/pages/TenantHubPage";
import { DevLayout }            from "@/features/developer/layout/DevLayout";
import { DevDashboard }         from "@/features/developer/pages/DevDashboard";
import { TenantsPage }          from "@/features/developer/pages/TenantsPage";
import { TenantDetailPage }     from "@/features/developer/pages/TenantDetailPage";
import { FeatureRequestsPage }  from "@/features/developer/pages/FeatureRequestsPage";
import { Loader2 } from "lucide-react";

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
  if (user) return <Navigate to="/hub" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"              element={<LandingPage />} />
      <Route path="/login"         element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register"      element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />

      {/* Authenticated hub */}
      <Route path="/hub"          element={<ProtectedRoute><HubDashboard /></ProtectedRoute>} />
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

      {/* Tenant white-label hub — must be LAST */}
      <Route path="/:slug" element={<TenantHubPage />} />

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
