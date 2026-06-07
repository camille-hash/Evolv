"use client";

import {
  BarChart3,
  Brain,
  FolderClock,
  Landmark,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PlatformSection =
  | "dashboard"
  | "simulations"
  | "wealth"
  | "intelligence"
  | "history"
  | "settings";

const navigationItems: Array<{
  key: PlatformSection;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}> = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "simulations", label: "Simulacoes", icon: Sparkles },
  { key: "wealth", label: "Patrimonio", icon: Landmark },
  { key: "intelligence", label: "Analise EVOLV", icon: Brain },
  { key: "history", label: "Historico", icon: FolderClock },
  { key: "settings", label: "Configuracoes", icon: Settings },
];

export function AppSidebar({
  activeSection,
  onNavigate,
}: {
  activeSection: PlatformSection;
  onNavigate: (section: PlatformSection) => void;
}) {
  return (
    <aside className="border-b bg-card px-4 py-4 md:min-h-screen md:border-b-0 md:border-r md:px-5 md:py-6">
      <div className="flex items-center justify-between gap-4 md:block">
        <div>
          <div className="text-lg font-semibold tracking-wide">EVOLV</div>
          <p className="mt-1 hidden text-xs text-muted-foreground md:block">
            Intelligence
          </p>
        </div>
        <div className="md:hidden text-xs font-medium text-muted-foreground">
          Plataforma patrimonial
        </div>
      </div>

      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 md:grid md:gap-2 md:overflow-visible md:pb-0">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-3 rounded-md border px-3 text-sm font-medium transition md:w-full",
                activeSection === item.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-background hover:text-foreground",
              )}
              key={item.key}
              onClick={() => onNavigate(item.key)}
              type="button"
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
