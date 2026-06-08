"use client";

import { useState } from "react";
import {
  SimulatorPanel,
  type SimulatorPanelPage,
} from "@/components/simulator/simulator-panel";
import { cn } from "@/lib/utils";

type SimulationWorkspaceSection = "operation" | "technical" | "administrators";

const workspaceSections: Array<{
  key: SimulationWorkspaceSection;
  label: string;
  description: string;
  page: SimulatorPanelPage;
}> = [
  {
    key: "operation",
    label: "Operacao",
    description: "Apresentacao consultiva e controles principais.",
    page: "simulation",
  },
  {
    key: "technical",
    label: "Dados Tecnicos",
    description: "Parametros operacionais da simulacao ativa.",
    page: "technical",
  },
  {
    key: "administrators",
    label: "Administradoras",
    description: "Selecao e parametros padrao por administradora.",
    page: "administrators",
  },
];

export function SimulationWorkspace({
  onOpenSimulation,
}: {
  onOpenSimulation?: () => void;
}) {
  const [activeSection, setActiveSection] =
    useState<SimulationWorkspaceSection>("operation");
  const activeWorkspaceSection = workspaceSections.find(
    (section) => section.key === activeSection,
  ) ?? workspaceSections[0];

  return (
    <section className="grid gap-6">
      <section className="executive-surface rounded-md p-5 text-card-foreground sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Simulacoes
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              Workspace de operacoes
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Ambiente preparado para organizar a operacao atual e futuras
              operacoes patrimoniais do cliente.
            </p>
          </div>

          <div className="rounded-md border bg-background/70 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Operacao ativa
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              Operacao 1
            </p>
          </div>
        </div>

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {workspaceSections.map((section) => (
            <button
              className={cn(
                "inline-flex min-h-11 shrink-0 flex-col justify-center rounded-md border px-4 py-2 text-left transition",
                activeSection === section.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:border-primary/40 hover:bg-accent",
              )}
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              type="button"
            >
              <span className="text-sm font-semibold">{section.label}</span>
              <span
                className={cn(
                  "mt-1 text-xs",
                  activeSection === section.key
                    ? "text-primary-foreground/72"
                    : "text-muted-foreground",
                )}
              >
                {section.description}
              </span>
            </button>
          ))}
        </nav>
      </section>

      <SimulatorPanel
        activePage={activeWorkspaceSection.page}
        onOpenSimulation={onOpenSimulation}
      />
    </section>
  );
}

