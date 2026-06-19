"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type SmokeLeadOption = {
  id: string;
  nome: string | null;
  updated_at: string | null;
};

type SmokeHttpResult = {
  body: unknown;
  ok: boolean;
  status: number;
  statusText: string;
};

const smokeLeadColumns = "id,nome,updated_at";

export default function LeadSimulationSmokeTestPage() {
  const supabase = useMemo(createSupabaseBrowserClient, []);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState("Verificando sessao...");
  const [leads, setLeads] = useState<SmokeLeadOption[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isFetchingByLead, setIsFetchingByLead] = useState(false);
  const [isFetchingById, setIsFetchingById] = useState(false);
  const [lastSimulationId, setLastSimulationId] = useState("");
  const [leadLoadResult, setLeadLoadResult] = useState<unknown>(null);
  const [postResult, setPostResult] = useState<unknown>(null);
  const [getByLeadResult, setGetByLeadResult] = useState<unknown>(null);
  const [getByIdResult, setGetByIdResult] = useState<unknown>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error || !data.session?.access_token) {
        setAuthStatus("Sessao Supabase indisponivel. Faca login no EVOLV antes de usar este smoke test.");
        setAccessToken(null);
        return;
      }

      setAccessToken(data.session.access_token);
      setAuthStatus(`Sessao Supabase ativa para ${data.session.user.email ?? data.session.user.id}.`);
    }

    void loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setAccessToken(session?.access_token ?? null);
      setAuthStatus(
        session?.access_token
          ? `Sessao Supabase ativa para ${session.user.email ?? session.user.id}.`
          : "Sessao Supabase indisponivel. Faca login no EVOLV antes de usar este smoke test.",
      );
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (accessToken) {
      void loadLeads();
    }
    // loadLeads is intentionally invoked only when the authenticated session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function loadLeads() {
    if (!accessToken) {
      return;
    }

    setIsLoadingLeads(true);
    setLeadLoadResult(null);

    const { data, error } = await supabase
      .from("crm_leads")
      .select(smokeLeadColumns)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      setLeadLoadResult({
        error,
        ok: false,
        step: "load_leads",
      });
      setIsLoadingLeads(false);
      return;
    }

    const nextLeads = (data ?? []) as SmokeLeadOption[];
    setLeads(nextLeads);
    setSelectedLeadId((current) => current || nextLeads[0]?.id || "");
    setLeadLoadResult({
      count: nextLeads.length,
      ok: true,
      step: "load_leads",
    });
    setIsLoadingLeads(false);
  }

  async function createTestSimulation() {
    if (!accessToken || !selectedLeadId) {
      return;
    }

    setIsCreating(true);
    setPostResult(null);

    const payload = {
      calculationSnapshot: {
        commercialCredit: 180000,
        generatedFor: "103A.37 smoke test",
        updatedCredit: 180000,
      },
      createdBy: "client-must-not-control-created-by",
      leadId: selectedLeadId,
      organizationId: "client-must-not-control-organization",
      presentationSnapshot: {
        headline: "Smoke test lead-centric simulation",
        visibleCredit: 180000,
      },
      simulationType: "commercial",
      source: "api",
      summary: {
        commercialCredit: 180000,
        contemplationMonth: 1,
        inccRate: 0.04,
        monthlyPayment: 2500,
        quotaCount: 1,
        totalCredit: 180000,
        updatedCredit: 180000,
      },
      technicalInput: {
        baseCredit: 180000,
        termMonths: 180,
      },
      title: `Smoke test 103A.37 - ${new Date().toISOString()}`,
    };

    const result = await requestJson("/api/crm/lead-simulations", {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    setPostResult(result);

    const simulationId = readSimulationId(result.body);

    if (simulationId) {
      setLastSimulationId(simulationId);
    }

    setIsCreating(false);
  }

  async function fetchByLead() {
    if (!accessToken || !selectedLeadId) {
      return;
    }

    setIsFetchingByLead(true);
    setGetByLeadResult(null);

    const result = await requestJson(
      `/api/crm/lead-simulations?leadId=${encodeURIComponent(selectedLeadId)}`,
    );

    setGetByLeadResult(result);
    setIsFetchingByLead(false);
  }

  async function fetchBySimulationId() {
    if (!accessToken || !lastSimulationId) {
      return;
    }

    setIsFetchingById(true);
    setGetByIdResult(null);

    const result = await requestJson(
      `/api/crm/lead-simulations?simulationId=${encodeURIComponent(lastSimulationId)}`,
    );

    setGetByIdResult(result);
    setIsFetchingById(false);
  }

  async function requestJson(path: string, init: RequestInit = {}): Promise<SmokeHttpResult> {
    if (!accessToken) {
      return {
        body: { error: "Sessao Supabase indisponivel." },
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      };
    }

    const response = await fetch(path, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const text = await response.text();
    const body = parseJsonBody(text);

    return {
      body,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    };
  }

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId);

  return (
    <main className="min-h-screen bg-background p-5 text-foreground sm:p-8">
      <section className="mx-auto grid max-w-6xl gap-6">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            EVOLV interno
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">
            Smoke test de simulacoes lead-centric
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Pagina temporaria protegida por sessao Supabase para validar POST e
            GET reais de `crm_lead_simulations`. Nao altera CRM, Simulador,
            Multi-Cotas ou Timeline.
          </p>
        </header>

        <section className="executive-surface grid gap-4 rounded-md p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Sessao
            </p>
            <p className="mt-2 text-sm">{authStatus}</p>
          </div>

          {!accessToken ? (
            <p className="rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
              Acesso bloqueado. Entre no EVOLV com Supabase Auth antes de abrir
              esta pagina.
            </p>
          ) : null}
        </section>

        {accessToken ? (
          <>
            <section className="executive-surface grid gap-4 rounded-md p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="grid flex-1 gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Lead existente
                  </span>
                  <select
                    className="h-11 rounded-md border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    onChange={(event) => setSelectedLeadId(event.target.value)}
                    value={selectedLeadId}
                  >
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.nome?.trim() || "Lead sem nome"} - {lead.id}
                      </option>
                    ))}
                  </select>
                </label>

                <Button disabled={isLoadingLeads} onClick={loadLeads} type="button">
                  {isLoadingLeads ? "Carregando..." : "Recarregar leads"}
                </Button>
              </div>

              <p className="text-xs leading-5 text-muted-foreground">
                Selecionado: {selectedLead?.nome?.trim() || "Lead nao selecionado"}
              </p>

              <JsonPanel title="Resultado da carga de leads" value={leadLoadResult} />
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <ActionPanel
                buttonLabel={isCreating ? "Criando..." : "Criar Simulacao Teste"}
                disabled={!selectedLeadId || isCreating}
                onClick={createTestSimulation}
                title="POST real"
              >
                <JsonPanel title="POST /api/crm/lead-simulations" value={postResult} />
              </ActionPanel>

              <ActionPanel
                buttonLabel={isFetchingByLead ? "Buscando..." : "GET por lead"}
                disabled={!selectedLeadId || isFetchingByLead}
                onClick={fetchByLead}
                title="GET por lead"
              >
                <JsonPanel
                  title="GET /api/crm/lead-simulations?leadId"
                  value={getByLeadResult}
                />
              </ActionPanel>

              <ActionPanel
                buttonLabel={isFetchingById ? "Buscando..." : "GET por simulationId"}
                disabled={!lastSimulationId || isFetchingById}
                onClick={fetchBySimulationId}
                title="GET por id"
              >
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Simulation ID
                  </span>
                  <input
                    className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    onChange={(event) => setLastSimulationId(event.target.value)}
                    value={lastSimulationId}
                  />
                </label>
                <JsonPanel
                  title="GET /api/crm/lead-simulations?simulationId"
                  value={getByIdResult}
                />
              </ActionPanel>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}

function ActionPanel({
  buttonLabel,
  children,
  disabled,
  onClick,
  title,
}: {
  buttonLabel: string;
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <section className="executive-surface grid gap-4 rounded-md p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button disabled={disabled} onClick={onClick} type="button">
          {buttonLabel}
        </Button>
      </div>
      {children}
    </section>
  );
}

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {title}
      </p>
      <pre className="max-h-[460px] overflow-auto rounded-md border bg-muted/35 p-3 text-xs leading-5 text-foreground">
        {JSON.stringify(value ?? { status: "aguardando execucao" }, null, 2)}
      </pre>
    </div>
  );
}

function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  return createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
}

function parseJsonBody(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function readSimulationId(value: unknown) {
  if (!isPlainObject(value) || !isPlainObject(value.simulation)) {
    return "";
  }

  return typeof value.simulation.id === "string" ? value.simulation.id : "";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}
