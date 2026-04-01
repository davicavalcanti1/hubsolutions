import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Building2, Star, CreditCard, LogOut,
  ChevronRight, Layers, Menu, X, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/developer",          label: "Visão Geral",       icon: LayoutDashboard },
  { href: "/developer/tenants",  label: "Empresas",          icon: Building2       },
  { href: "/developer/features", label: "Feature Requests",  icon: Star            },
  { href: "/developer/plans",    label: "Planos",            icon: CreditCard      },
  { href: "/developer/activity", label: "Atividade",         icon: Activity        },
];

export function DevLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(true);

  function isActive(href: string) {
    return href === "/developer"
      ? location.pathname === "/developer"
      : location.pathname.startsWith(href);
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* Sidebar */}
      <aside className={cn(
        "flex flex-col border-r border-border bg-card transition-all duration-300 shrink-0 shadow-sm",
        open ? "w-60" : "w-16"
      )}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-border gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Layers className="h-4 w-4 text-primary-foreground" />
          </div>
          {open && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-foreground">HubSolutions</p>
              <p className="text-[10px] text-primary font-medium uppercase tracking-wider">Developer</p>
            </div>
          )}
          <button onClick={() => setOpen(!open)} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                title={!open ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {open && <span className="flex-1 truncate">{item.label}</span>}
                {open && active && <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-border">
          <div className={cn("flex items-center gap-3 p-2 rounded-xl", open && "mb-2")}>
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {user?.full_name?.[0]?.toUpperCase() ?? "D"}
            </div>
            {open && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-foreground">{user?.full_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">superadmin</p>
              </div>
            )}
          </div>
          {open && (
            <button
              onClick={signOut}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/[0.06] transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <Outlet />
      </main>
    </div>
  );
}
