"use client";

import {
  BarChart3,
  BriefcaseBusiness,
  Brain,
  CalendarClock,
  ClipboardList,
  FolderClock,
  Handshake,
  Landmark,
  Layers3,
  ListChecks,
  LogOut,
  Map,
  Presentation,
  Settings,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  canAccessSection,
  roleLabels,
  type AccessSection,
  type User,
} from "@/modules/access";

export type PlatformSection =
  | "dashboard"
  | "crm"
  | "client"
  | "presentation"
  | "multiCotas"
  | "operations"
  | "portfolio"
  | "strategies"
  | "wealth"
  | "intelligence"
  | "roadmap"
  | "followup"
  | "history"
  | "settings";

const navigationItems: Array<{
  key: PlatformSection;
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}> = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "crm", label: "CRM", icon: Handshake },
  { key: "client", label: "Cliente", icon: UserRound },
  {
    key: "operations",
    href: "/operations",
    label: "Operations",
    icon: ClipboardList,
  },
  { key: "presentation", label: "Simulacao Comercial", icon: Presentation },
  { key: "multiCotas", label: "Multi-Cotas", icon: Layers3 },
  { key: "portfolio", label: "Carteira", icon: BriefcaseBusiness },
  { key: "strategies", label: "Estrategias", icon: ListChecks },
  { key: "wealth", label: "Patrimonio", icon: Landmark },
  { key: "intelligence", label: "Inteligencia", icon: Brain },
  { key: "roadmap", label: "Roadmap", icon: Map },
  { key: "followup", label: "Acompanhamento", icon: CalendarClock },
  { key: "history", label: "Historico", icon: FolderClock },
  { key: "settings", label: "Configuracoes", icon: Settings },
];

export function AppSidebar({
  activeSection,
  currentUser,
  onLogout,
  onNavigate,
}: {
  activeSection: PlatformSection;
  currentUser: User;
  onLogout: () => void;
  onNavigate: (section: PlatformSection) => void;
}) {
  const visibleItems = navigationItems.filter((item) =>
    canAccessSection(currentUser.role, item.key as AccessSection),
  );

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
        <div className="flex items-center gap-3 md:hidden">
          <span className="text-xs font-medium text-muted-foreground">
            {roleLabels[currentUser.role]}
          </span>
          <button
            className="inline-flex items-center text-xs font-medium text-muted-foreground"
            onClick={onLogout}
            type="button"
          >
            <LogOut className="mr-1 h-3.5 w-3.5" aria-hidden />
            Sair
          </button>
        </div>
      </div>

      <div className="mt-6 hidden rounded-md border bg-background/70 p-3 md:block">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {roleLabels[currentUser.role]}
        </p>
        <p className="mt-2 text-sm leading-5 text-foreground">
          {currentUser.nome}
        </p>
        <button
          className="mt-3 inline-flex text-xs font-medium text-muted-foreground transition hover:text-foreground"
          onClick={onLogout}
          type="button"
        >
          <LogOut className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Sair
        </button>
      </div>

      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 md:grid md:gap-1.5 md:overflow-visible md:pb-0">
        {visibleItems.map((item) => {
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
              onClick={() => {
                if (item.href) {
                  window.location.assign(item.href);
                  return;
                }

                onNavigate(item.key);
              }}
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
          Acesso local provisório para uso interno antes da autenticacao real.
        </p>
      </div>
    </aside>
  );
}
