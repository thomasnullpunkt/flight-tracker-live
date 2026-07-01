import React from "react";
import { Link, useLocation } from "wouter";
import { Map, LayoutDashboard, Plane, AlertTriangle } from "lucide-react";
import { useGetFlightStats } from "@workspace/api-client-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: stats } = useGetFlightStats({
    query: { refetchInterval: 15000 }
  });

  const emergencyCount = stats?.emergency_count || 0;

  const links = [
    { href: "/", label: "Live Map", icon: Map },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/flights", label: "All Flights", icon: Plane },
    { 
      href: "/emergencies", 
      label: "Emergencies", 
      icon: AlertTriangle,
      badge: emergencyCount > 0 ? emergencyCount : null,
      urgent: emergencyCount > 0
    },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground selection:bg-primary selection:text-primary-foreground font-mono">
      <aside className="w-16 md:w-56 flex-shrink-0 border-r border-border bg-card flex flex-col justify-between z-20">
        <div>
          <div className="h-14 flex items-center justify-center md:justify-start px-4 border-b border-border">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Plane className="w-5 h-5 -rotate-45" />
            </div>
            <span className="ml-3 font-bold tracking-tight text-primary hidden md:block">
              RADAR.SYS
            </span>
          </div>
          
          <nav className="p-2 space-y-1 mt-4">
            {links.map((link) => {
              const active = location === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center justify-center md:justify-start px-3 py-3 md:py-2 rounded-md transition-colors group relative ${
                    active 
                      ? link.urgent ? "bg-destructive/20 text-destructive" : "bg-primary/10 text-primary" 
                      : link.urgent ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                  title={link.label}
                >
                  <Icon className={`w-5 h-5 ${link.urgent && active ? "pulse-red rounded-full" : ""}`} />
                  <span className="ml-3 hidden md:block text-sm font-medium">
                    {link.label}
                  </span>
                  
                  {link.badge !== null && link.badge !== undefined && (
                    <span className={`absolute top-2 right-2 md:static md:ml-auto flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-sm ${
                      link.urgent ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border hidden md:block">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
            SYSTEM ONLINE
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-background relative z-10">
        {children}
      </main>
    </div>
  );
}
