"use client";

import {
  BarChart3,
  BriefcaseBusiness,
  Brain,
  FolderClock,
  Landmark,
  ListChecks,
  Map,
  Sparkles,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PlatformSection =
  | "dashboard"
  | "client"
  | "portfolio"
  | "simulations"
  | "strategies"
  | "wealth"
  | "intelligence"
  | "roadmap"
  | "history";

const navigationItems: Array<{
  key: PlatformSection;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}> = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "client", label: "Cliente", icon: UserRound },
  { key: "portfolio", label: "Carteira", icon: BriefcaseBusiness },
  { key: "simulations", label: "Simulacoes", icon: Sparkles },
  { key: "strategies", label: "Estrategias", icon: ListChecks },
  { key: "wealth", label: "Patrimonio", icon: Landmark },
  { key: "intelligence", label: "Inteligencia", icon: Brain },
  { key: "roadmap", label: "Roadmap", icon: Map },
  { key: "history", label: "Historico", icon: FolderClock },
];

export function AppSidebar({
  activeSection,
  onNavigate,
}: {
  activeSection: PlatformSection;
  onNavigate: (section: PlatformSection) => void;
}) {
  return (
    <aside className="border-b bg-card/95 px-4 py-4 md:min-h-screen md:border-b-0 md:border-r md:px-5 md:py-6">
      <div className="flex items-center justify-between gap-4 md:block">
        <div className="flex items-center gap-3">
          <div className="brand-mark" aria-hidden>
            EV
          </div>
          <div>
            <div className="text-lg font-semibold tracking-normal">EVOLV</div>
            <p className="hidden text-xs text-muted-foreground md:block">
              Wealth intelligence
            </p>
          </div>
        </div>
        <div className="md:hidden text-xs font-medium text-muted-foreground">
          Inteligencia Patrimonial
        </div>
      </div>

      <div className="mt-6 hidden rounded-md border bg-background/70 p-3 md:block">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Plataforma
        </p>
        <p className="mt-2 text-sm leading-5 text-foreground">
          Planejamento patrimonial, estrategias e simulacoes consultivas.
        </p>
      </div>

      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 md:grid md:gap-1.5 md:overflow-visible md:pb-0">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-3 rounded-md border px-3 text-sm font-medium transition md:w-full",
                activeSection === item.key
                  ? "border-primary/20 bg-primary text-primary-foreground shadow-sm"
                  : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-background/80 hover:text-foreground",
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

      <div className="mt-8 hidden border-t pt-5 md:block">
        <p className="text-xs leading-5 text-muted-foreground">
          Estrutura preparada para identidade visual, logotipo e favicon EVOLV.
        </p>
      </div>
    </aside>
  );
}
