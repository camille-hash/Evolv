"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AppSidebar,
  type PlatformSection,
} from "@/components/layout/app-sidebar";
import { ClientPage } from "@/components/client/client-page";
import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard";
import { StrategiesPage } from "@/components/strategies/strategies-page";
import {
  SimulatorPanel,
  type SimulatorPanelPage,
} from "@/components/simulator/simulator-panel";
import {
  emptyClientContext,
  loadClientContext,
  type ClientContext,
} from "@/modules/client-context";

const simulatorPageBySection: Partial<Record<PlatformSection, SimulatorPanelPage>> = {
  simulations: "simulation",
  wealth: "journey",
  intelligence: "intelligence",
  history: "saved",
  settings: "technical",
};

const pageTitles: Record<PlatformSection, { title: string; subtitle: string }> = {
  dashboard: {
    title: "EVOLV Intelligence",
    subtitle: "Planejamento patrimonial, estrategias de crescimento e evolucao de patrimonio",
  },
  client: {
    title: "Cliente atual",
    subtitle: "Contexto comercial e patrimonial persistido neste navegador",
  },
  simulations: {
    title: "Simulacoes estrategicas",
    subtitle: "Apresentacao consultiva para cenarios patrimoniais",
  },
  strategies: {
    title: "Estrategias patrimoniais",
    subtitle: "Planos de evolucao para diferentes objetivos patrimoniais",
  },
  wealth: {
    title: "Evolucao patrimonial",
    subtitle: "Metas, jornada e proximos marcos do cliente",
  },
  intelligence: {
    title: "Analise EVOLV",
    subtitle: "Resumo executivo, insights e pontos de atencao",
  },
  history: {
    title: "Historico",
    subtitle: "Simulacoes salvas neste navegador",
  },
  settings: {
    title: "Governanca da Plataforma",
    subtitle: "Parametros tecnicos e administradoras",
  },
};

export default function Home() {
  const [activeSection, setActiveSection] =
    useState<PlatformSection>("dashboard");
  const [clientContext, setClientContext] =
    useState<ClientContext>(emptyClientContext);
  const currentSimulatorPage = simulatorPageBySection[activeSection];
  const pageTitle = pageTitles[activeSection];
  const handleClientContextChange = useCallback((context: ClientContext) => {
    setClientContext(context);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setClientContext(loadClientContext());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[280px_1fr]">
      <AppSidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
      />

      <main className="min-w-0 p-5 sm:p-7 lg:p-8">
        <section className="mb-7 max-w-4xl">
          <p className="text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground">
            EVOLV
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground">
            {pageTitle.title}
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            {pageTitle.subtitle}
          </p>
        </section>

        {activeSection === "dashboard" ? (
          <ExecutiveDashboard
            clientContext={clientContext}
            onCreateSimulation={() => setActiveSection("simulations")}
          />
        ) : null}

        {activeSection === "client" ? (
          <ClientPage onClientContextChange={handleClientContextChange} />
        ) : null}

        {activeSection === "strategies" ? <StrategiesPage /> : null}

        {currentSimulatorPage ? (
          <SimulatorPanel
            activePage={currentSimulatorPage}
            onOpenSimulation={() => setActiveSection("simulations")}
          />
        ) : null}
      </main>
    </div>
  );
}
