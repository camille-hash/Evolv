"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DecisionOutputInspection } from "@/modules/decision-observatory";

type InspectorHttpResult = {
  body: unknown;
  ok: boolean;
  status: number;
  statusText: string;
};

export default function DecisionInspectorPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState("Verificando sessao...");
  const [decisionOutputId, setDecisionOutputId] = useState(() =>
    readInitialDecisionOutputId(),
  );
  const [inspection, setInspection] = useState<DecisionOutputInspection | null>(
    null,
  );
  const [lastResult, setLastResult] = useState<InspectorHttpResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error || !data.session?.access_token) {
        setAuthStatus(
          "Sessao Supabase indisponivel. Faca login no EVOLV antes de usar o Inspector.",
        );
        setAccessToken(null);
        return;
      }

      setAccessToken(data.session.access_token);
      setAuthStatus(
        `Sessao Supabase ativa para ${data.session.user.email ?? data.session.user.id}.`,
      );
    }

    void loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) {
          return;
        }

        setAccessToken(session?.access_token ?? null);
        setAuthStatus(
          session?.access_token
            ? `Sessao Supabase ativa para ${session.user.email ?? session.user.id}.`
            : "Sessao Supabase indisponivel. Faca login no EVOLV antes de usar o Inspector.",
        );
      },
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function inspectDecisionOutput() {
    if (!accessToken || !decisionOutputId.trim()) {
      return;
    }

    setIsLoading(true);
    setInspection(null);
    setLastResult(null);

    const result = await requestJson(
      `/api/decision-observatory/outputs/${encodeURIComponent(
        decisionOutputId.trim(),
      )}`,
    );

    setLastResult(result);

    if (result.ok && isInspectionPayload(result.body)) {
      setInspection(result.body.inspection);
    }

    setIsLoading(false);
  }

  async function requestJson(path: string): Promise<InspectorHttpResult> {
    if (!accessToken) {
      return {
        body: { error: "Sessao Supabase indisponivel." },
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      };
    }

    const response = await fetch(path, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const text = await response.text();

    return {
      body: parseJsonBody(text),
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    };
  }

  return (
    <main className="min-h-screen bg-background p-5 text-foreground sm:p-8">
      <section className="mx-auto grid max-w-6xl gap-6">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            EVOLV interno
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">
            Decision Inspector
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Observabilidade read-only para inspecionar Decision Outputs ja
            persistidos. Esta tela nao executa modelos, nao recalcula score e
            nao escreve no banco.
          </p>
        </header>

        <section className="executive-surface grid gap-4 rounded-md p-5">
          <p className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
            {authStatus}
          </p>

          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="grid gap-2 text-sm font-medium">
              Decision Output ID
              <input
                className="rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                onChange={(event) => setDecisionOutputId(event.target.value)}
                placeholder="Cole o UUID do decision_model_outputs.id"
                value={decisionOutputId}
              />
            </label>

            <Button
              disabled={!accessToken || !decisionOutputId.trim() || isLoading}
              onClick={inspectDecisionOutput}
              type="button"
            >
              {isLoading ? "Carregando..." : "Inspecionar"}
            </Button>
          </div>

          {lastResult && !lastResult.ok ? (
            <p className="rounded-md border border-dashed bg-card px-3 py-3 text-sm text-muted-foreground">
              Nao foi possivel carregar o Decision Output. Status{" "}
              {lastResult.status}.
            </p>
          ) : null}
        </section>

        {inspection ? <InspectionDetails inspection={inspection} /> : null}

        {lastResult ? (
          <JsonPanel title="Resposta da API" value={lastResult} />
        ) : null}
      </section>
    </main>
  );
}

function InspectionDetails({
  inspection,
}: {
  inspection: DecisionOutputInspection;
}) {
  return (
    <section className="grid gap-5">
      <div className="grid gap-4 rounded-md border bg-card p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Modelo executado
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              {inspection.modelId} - {inspection.modelName}
            </h2>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            v{inspection.modelVersion}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <InspectorMetric label="Decisao" value={inspection.decision} />
          <InspectorMetric
            label="Score"
            value={
              inspection.attentionScore === null
                ? "Nao informado"
                : String(inspection.attentionScore)
            }
          />
          <InspectorMetric label="Confidence" value={inspection.confidence} />
          <InspectorMetric
            label="Generated at"
            value={formatDateTime(inspection.generatedAt)}
          />
        </div>

        <InspectorMetric
          label="Recommended action"
          value={inspection.recommendedAction}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Rationale" value={inspection.rationale} />
        <JsonPanel
          title="Decision Context resumido"
          value={
            inspection.decisionContextSummary ?? {
              message:
                "Resumo indisponivel no output persistido para este registro.",
            }
          }
        />
        <JsonPanel title="Evidence trace" value={inspection.evidenceTrace} />
        <JsonPanel
          title="Score contributors"
          value={inspection.scoreContributors}
        />
        <JsonPanel title="Metadata" value={inspection.metadata} />
        <JsonPanel title="Output persistido completo" value={inspection.output} />
      </div>

      <JsonPanel
        defaultOpen={false}
        title="Linha completa persistida"
        value={inspection.persistedOutput}
      />
    </section>
  );
}

function InspectorMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/70 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}

function JsonPanel({
  defaultOpen = true,
  title,
  value,
}: {
  defaultOpen?: boolean;
  title: string;
  value: unknown;
}) {
  return (
    <details
      className="rounded-md border bg-card p-4 text-sm"
      open={defaultOpen}
    >
      <summary className="cursor-pointer text-sm font-semibold text-foreground">
        {title}
      </summary>
      <pre className="mt-3 max-h-[460px] overflow-auto rounded-md bg-background p-3 text-xs leading-5 text-muted-foreground">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase environment is not configured.");
  }

  return createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
}

function readInitialDecisionOutputId() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    new URLSearchParams(window.location.search).get("outputId")?.trim() ?? ""
  );
}

function isInspectionPayload(
  value: unknown,
): value is { inspection: DecisionOutputInspection } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "inspection" in value &&
      (value as { inspection?: unknown }).inspection,
  );
}

function parseJsonBody(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
