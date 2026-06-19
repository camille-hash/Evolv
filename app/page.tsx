"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppSidebar,
  type PlatformSection,
} from "@/components/layout/app-sidebar";
import { AccessSettingsPage } from "@/components/access/access-settings-page";
import { Button } from "@/components/ui/button";
import {
  DefaultPasswordAlert,
  LoginPage,
  RequiredPasswordChangePage,
} from "@/components/access/login-page";
import { ClientPage } from "@/components/client/client-page";
import { CrmPage } from "@/components/crm/crm-page";
import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard";
import { ClientPresentationPage } from "@/components/presentation/client-presentation-page";
import { FollowUpPage } from "@/components/followup/followup-page";
import { MultiCotasPage } from "@/components/multi-cotas/multi-cotas-page";
import { PortfolioPage } from "@/components/portfolio/portfolio-page";
import { RoadmapPage } from "@/components/roadmap/roadmap-page";
import { StrategiesPage } from "@/components/strategies/strategies-page";
import {
  SimulatorPanel,
  type SimulatorPanelPage,
} from "@/components/simulator/simulator-panel";
import {
  clearCrmLeadProposalContext,
  loadCrmLeadProposalContext,
  saveCrmLeadProposalContext,
  type CrmLead,
  type CrmLeadProposalContext,
} from "@/modules/crm";
import {
  emptyClientContext,
  loadClientContext,
  type ClientContext,
} from "@/modules/client-context";
import {
  canAccessSection,
  clearCurrentUser,
  isSupabaseAuthEnabled,
  loadCurrentUser,
  loadSupabaseCurrentUser,
  signOutFromSupabaseAuth,
  type AccessSection,
  type User,
} from "@/modules/access";

const simulatorPageBySection: Partial<Record<PlatformSection, SimulatorPanelPage>> = {
  wealth: "journey",
  intelligence: "intelligence",
  history: "saved",
};

const inactivityTimeoutMs = 60 * 60 * 1000;
const sessionExpirationWarningMs = 60 * 1000;
const activityEvents = ["click", "mousemove", "scroll", "keydown", "touchstart"];

const pageTitles: Record<PlatformSection, { title: string; subtitle: string }> = {
  dashboard: {
    title: "EVOLV Intelligence",
    subtitle: "Planejamento patrimonial, estrategias de crescimento e evolucao de patrimonio",
  },
  client: {
    title: "Cliente atual",
    subtitle: "Contexto comercial e patrimonial persistido neste navegador",
  },
  crm: {
    title: "CRM",
    subtitle: "Funil comercial local para prospeccao, vendas e administracao",
  },
  presentation: {
    title: "Simulacao Comercial",
    subtitle: "Ambiente principal para apresentacao consultiva e operacao ao vivo",
  },
  multiCotas: {
    title: "Multi-Cotas",
    subtitle: "Simulacao de multiplas cartas com contemplacoes escalonadas",
  },
  portfolio: {
    title: "Carteira patrimonial",
    subtitle: "Imoveis, cartas e consolidacao da posicao atual",
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
  roadmap: {
    title: "Roadmap patrimonial",
    subtitle: "Plano visual entre cliente, operacoes e metas",
  },
  followup: {
    title: "Acompanhamento",
    subtitle: "Eventos, prazos e retornos comerciais do cliente",
  },
  history: {
    title: "Historico",
    subtitle: "Simulacoes salvas neste navegador",
  },
  settings: {
    title: "Configuracoes",
    subtitle: "Acesso local, usuarios da equipe e perfis operacionais",
  },
};

export default function Home() {
  const [activeSection, setActiveSection] =
    useState<PlatformSection>("dashboard");
  const [clientContext, setClientContext] =
    useState<ClientContext>(emptyClientContext);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [leadProposalContext, setLeadProposalContext] =
    useState<CrmLeadProposalContext | null>(null);
  const [accessReady, setAccessReady] = useState(false);
  const [isSessionExpirationWarningOpen, setIsSessionExpirationWarningOpen] =
    useState(false);
  const inactivityTimeoutRef = useRef<number | null>(null);
  const logoutTimeoutRef = useRef<number | null>(null);
  const visibleActiveSection =
    currentUser &&
    canAccessSection(currentUser.role, activeSection as AccessSection)
      ? activeSection
      : "dashboard";
  const currentSimulatorPage = simulatorPageBySection[visibleActiveSection];
  const pageTitle = pageTitles[visibleActiveSection];
  const canCurrentUserGenerateLeadSimulation = currentUser
    ? canAccessSection(currentUser.role, "presentation")
    : false;
  const handleClientContextChange = useCallback((context: ClientContext) => {
    setClientContext(context);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      async function loadAccessState() {
        const storedUser = isSupabaseAuthEnabled()
          ? await loadSupabaseCurrentUser()
          : loadCurrentUser();

        setCurrentUser(storedUser);
        setClientContext(loadClientContext());
        setLeadProposalContext(loadCrmLeadProposalContext());
        setAccessReady(true);
      }

      void loadAccessState();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const clearInactivityTimeout = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      window.clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  }, []);

  const clearLogoutTimeout = useCallback(() => {
    if (logoutTimeoutRef.current) {
      window.clearTimeout(logoutTimeoutRef.current);
      logoutTimeoutRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(() => {
    clearInactivityTimeout();
    clearLogoutTimeout();
    if (isSupabaseAuthEnabled()) {
      void signOutFromSupabaseAuth();
    }
    clearCurrentUser();
    setCurrentUser(null);
    setActiveSection("dashboard");
    setIsSessionExpirationWarningOpen(false);
  }, [clearInactivityTimeout, clearLogoutTimeout]);

  useEffect(() => {
    if (!currentUser || currentUser.mustChangePassword || isSessionExpirationWarningOpen) {
      clearInactivityTimeout();
      return;
    }

    function resetInactivityTimer() {
      clearInactivityTimeout();
      inactivityTimeoutRef.current = window.setTimeout(() => {
        setIsSessionExpirationWarningOpen(true);
      }, inactivityTimeoutMs);
    }

    resetInactivityTimer();

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetInactivityTimer, {
        passive: true,
      });
    });

    return () => {
      clearInactivityTimeout();
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetInactivityTimer);
      });
    };
  }, [
    clearInactivityTimeout,
    currentUser,
    isSessionExpirationWarningOpen,
  ]);

  useEffect(() => {
    if (!isSessionExpirationWarningOpen) {
      clearLogoutTimeout();
      return;
    }

    logoutTimeoutRef.current = window.setTimeout(() => {
      handleLogout();
    }, sessionExpirationWarningMs);

    return clearLogoutTimeout;
  }, [clearLogoutTimeout, handleLogout, isSessionExpirationWarningOpen]);

  function handleContinueSession() {
    setIsSessionExpirationWarningOpen(false);
  }

  function handleNavigate(section: PlatformSection) {
    if (
      currentUser &&
      canAccessSection(currentUser.role, section as AccessSection)
    ) {
      setActiveSection(section);
    }
  }

  function handleGenerateSimulationFromLead(
    lead: CrmLead,
    intent: "simulation" | "proposal" | "multi_cotas",
  ) {
    const nextContext = saveCrmLeadProposalContext({
      intent,
      leadId: lead.id,
      leadName: lead.nome,
      leadDesiredCredit: lead.valorPretendido,
    });

    setLeadProposalContext(nextContext);
    handleNavigate(intent === "multi_cotas" ? "multiCotas" : "presentation");
  }

  function handleClearLeadProposalContext() {
    clearCrmLeadProposalContext();
    setLeadProposalContext(null);
  }

  if (!accessReady) {
    return null;
  }

  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} />;
  }

  if (currentUser.mustChangePassword) {
    return (
      <RequiredPasswordChangePage
        onPasswordChanged={setCurrentUser}
        user={currentUser}
      />
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[280px_1fr]">
      <AppSidebar
        activeSection={visibleActiveSection}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />

      <main className="min-w-0 p-5 sm:p-7 lg:p-8">
        <DefaultPasswordAlert user={currentUser} />

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

        {visibleActiveSection === "dashboard" ? (
          <ExecutiveDashboard
            clientContext={clientContext}
            onCreateSimulation={() => handleNavigate("presentation")}
          />
        ) : null}

        {visibleActiveSection === "client" ? (
          <ClientPage onClientContextChange={handleClientContextChange} />
        ) : null}

        {visibleActiveSection === "crm" ? (
          <CrmPage
            onGenerateMultiCotas={
              canCurrentUserGenerateLeadSimulation
                ? (lead) => handleGenerateSimulationFromLead(lead, "multi_cotas")
                : undefined
            }
            onGenerateSimulation={
              canCurrentUserGenerateLeadSimulation
                ? (lead) => handleGenerateSimulationFromLead(lead, "simulation")
                : undefined
            }
            onGenerateProposal={
              canCurrentUserGenerateLeadSimulation
                ? (lead) => handleGenerateSimulationFromLead(lead, "proposal")
                : undefined
            }
          />
        ) : null}

        {visibleActiveSection === "presentation" ? (
          leadProposalContext && leadProposalContext.intent !== "multi_cotas" ? (
            <SimulatorPanel
              activePage="simulation"
              leadProposalContext={leadProposalContext}
              onClearLeadProposalContext={handleClearLeadProposalContext}
            />
          ) : (
            <ClientPresentationPage />
          )
        ) : null}

        {visibleActiveSection === "multiCotas" ? (
          <MultiCotasPage
            leadProposalContext={
              leadProposalContext?.intent === "multi_cotas"
                ? leadProposalContext
                : null
            }
            onClearLeadProposalContext={handleClearLeadProposalContext}
          />
        ) : null}

        {visibleActiveSection === "portfolio" ? <PortfolioPage /> : null}

        {visibleActiveSection === "strategies" ? <StrategiesPage /> : null}

        {visibleActiveSection === "roadmap" ? <RoadmapPage /> : null}

        {visibleActiveSection === "followup" ? <FollowUpPage /> : null}

        {visibleActiveSection === "settings" ? <AccessSettingsPage /> : null}

        {currentSimulatorPage ? (
          <SimulatorPanel
            activePage={currentSimulatorPage}
            onOpenSimulation={() => handleNavigate("presentation")}
          />
        ) : null}
      </main>

      {isSessionExpirationWarningOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-5 backdrop-blur-sm"
          role="dialog"
        >
          <section className="executive-surface w-full max-w-md rounded-md p-6 text-card-foreground shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Sessao inativa
            </p>
            <h2 className="mt-3 text-xl font-semibold text-foreground">
              Sua sessao expirara em 60 segundos por inatividade.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Continue a sessao se ainda estiver usando o EVOLV nesta maquina.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button onClick={handleContinueSession} type="button">
                Continuar sessao
              </Button>
              <Button onClick={handleLogout} type="button" variant="secondary">
                Encerrar agora
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
