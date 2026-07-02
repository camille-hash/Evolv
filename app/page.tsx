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
  convertLeadToClient,
  emptyClientContext,
  loadClientContext,
  type ConvertLeadToClientInput,
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
    subtitle: "Cliente persistido, contratos vinculados e leitura operacional",
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
  operations: {
    title: "Operations",
    subtitle: "Workspace operacional para contratos, receita e portfolio",
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
  const canCurrentUserGenerateLeadBoundCommercialSimulation = currentUser
    ? canAccessSection(currentUser.role, "crm")
    : false;
  const canCurrentUserUseSimulationTools = currentUser
    ? canAccessSection(currentUser.role, "presentation")
    : false;
  const canViewLeadBoundCommercialSimulation =
    activeSection === "presentation" &&
    leadProposalContext?.intent === "simulation" &&
    canCurrentUserGenerateLeadBoundCommercialSimulation;
  const canViewConvertedClient =
    activeSection === "client" &&
    Boolean(clientContext.nome.trim()) &&
    Boolean(currentUser && canAccessSection(currentUser.role, "crm"));
  const visibleActiveSection =
    currentUser &&
    (canAccessSection(currentUser.role, activeSection as AccessSection) ||
      canViewLeadBoundCommercialSimulation ||
      canViewConvertedClient)
      ? activeSection
      : "dashboard";
  const currentSimulatorPage = simulatorPageBySection[visibleActiveSection];
  const pageTitle = pageTitles[visibleActiveSection];
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
    if (intent === "simulation") {
      if (canCurrentUserGenerateLeadBoundCommercialSimulation) {
        setActiveSection("presentation");
      }
      return;
    }

    handleNavigate(intent === "multi_cotas" ? "multiCotas" : "presentation");
  }

  function handleClearLeadProposalContext() {
    clearCrmLeadProposalContext();
    setLeadProposalContext(null);
  }

  function handleConvertLeadToClient(input: ConvertLeadToClientInput) {
    const nextClientRecord = convertLeadToClient({
      ...input,
      convertedBy: {
        name: currentUser?.nome || input.convertedBy.name,
        userId: currentUser?.id ?? input.convertedBy.userId,
      },
    });

    setClientContext(nextClientRecord.context);
    setActiveSection("client");
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
            onCreateSimulation={() => handleNavigate("crm")}
          />
        ) : null}

        {visibleActiveSection === "client" ? (
          <ClientPage onClientContextChange={handleClientContextChange} />
        ) : null}

        {visibleActiveSection === "crm" ? (
          <CrmPage
            onConvertToClient={handleConvertLeadToClient}
            onGenerateMultiCotas={
              canCurrentUserUseSimulationTools
                ? (lead) => handleGenerateSimulationFromLead(lead, "multi_cotas")
                : undefined
            }
            onGenerateSimulation={
              canCurrentUserGenerateLeadBoundCommercialSimulation
                ? (lead) => handleGenerateSimulationFromLead(lead, "simulation")
                : undefined
            }
            onGenerateProposal={
              canCurrentUserUseSimulationTools
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
            <LeadBoundSimulationGuidance onOpenCrm={() => handleNavigate("crm")} />
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

        {visibleActiveSection === "history" ? (
          <LeadBoundSimulationGuidance onOpenCrm={() => handleNavigate("crm")} />
        ) : null}

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

function LeadBoundSimulationGuidance({
  onOpenCrm,
}: {
  onOpenCrm: () => void;
}) {
  return (
    <section className="executive-surface rounded-md p-5 text-card-foreground sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Simulacao vinculada ao lead
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-foreground">
        Crie ou selecione um lead antes de simular.
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Toda Simulacao Comercial do EVOLV deve nascer no Dossie de um lead. Se o
        contato nao veio de uma integracao, adicione o lead manualmente no CRM e
        depois acesse a aba Simulacoes para criar a simulacao.
      </p>
      <div className="mt-5">
        <Button onClick={onOpenCrm} type="button">
          Ir para o CRM
        </Button>
      </div>
    </section>
  );
}
