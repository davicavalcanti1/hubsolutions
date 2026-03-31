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
    <div className="flex h-screen bg-[#070707] text-white overflow-hidden">

      {/* Sidebar */}
      <aside className={cn(
        "flex flex-col border-r border-white/[0.06] bg-[#080808] transition-all duration-300 shrink-0",
        open ? "w-60" : "w-16"
      )}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-white/[0.06] gap-3">
          <div className="w-8 h-8 rounded-lg bg-lime-400 flex items-center justify-center shrink-0">
            <Layers className="h-4 w-4 text-black" />
          </div>
          {open && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">HubSolutions</p>
              <p className="text-[10px] text-lime-400 font-medium uppercase tracking-wider">Developer</p>
            </div>
          )}
          <button onClick={() => setOpen(!open)} className="ml-auto text-white/30 hover:text-white/60 transition-colors">
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
                    ? "bg-lime-400/10 text-lime-400 border border-lime-400/20"
                    : "text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
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
        <div className="p-3 border-t border-white/[0.06]">
          <div className={cn("flex items-center gap-3 p-2 rounded-xl", open && "mb-2")}>
            <div className="w-8 h-8 rounded-xl bg-lime-400/20 border border-lime-400/30 flex items-center justify-center text-xs font-bold text-lime-400 shrink-0">
              {user?.full_name?.[0]?.toUpperCase() ?? "D"}
            </div>
            {open && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{user?.full_name}</p>
                <p className="text-[10px] text-white/30 truncate">superadmin</p>
              </div>
            )}
          </div>
          {open && (
            <button
              onClick={signOut}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs text-white/30 hover:text-red-400 hover:bg-red-400/[0.06] transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
