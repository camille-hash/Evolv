"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  DecisionOutputIndexItem,
  DecisionOutputIndexResponse,
} from "@/modules/decision-observatory";

type IndexHttpResult = {
  body: unknown;
  ok: boolean;
  status: number;
  statusText: string;
};

type IndexFilters = {
  confidenceMax: string;
  confidenceMin: string;
  dateFrom: string;
  dateTo: string;
  leadQuery: string;
  modelId: string;
  modelVersion: string;
  pageSize: string;
  period: string;
  scoreMax: string;
  scoreMin: string;
  sortBy: string;
  sortDirection: string;
};

const defaultFilters: IndexFilters = {
  confidenceMax: "",
  confidenceMin: "",
  dateFrom: "",
  dateTo: "",
  leadQuery: "",
  modelId: "",
  modelVersion: "",
  pageSize: "25",
  period: "all",
  scoreMax: "",
  scoreMin: "",
  sortBy: "created_at",
  sortDirection: "desc",
};

export default function DecisionObservatoryIndexPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState("Verificando sessao...");
  const [filters, setFilters] = useState<IndexFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<DecisionOutputIndexResponse | null>(
    null,
  );
  const [lastResult, setLastResult] = useState<IndexHttpResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error || !data.session?.access_token) {
        setAuthStatus("Sessao indisponivel ou expirada.");
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
            : "Sessao indisponivel ou expirada.",
        );
      },
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (accessToken) {
      void loadOutputs(page);
    }
    // The Index reloads when pagination changes or when the session becomes available.
    // Filter changes are applied explicitly by the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, page]);

  async function loadOutputs(nextPage = 1) {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    setLastResult(null);

    const result = await requestJson(
      `/api/decision-observatory/outputs?${buildQueryString(filters, nextPage)}`,
    );

    setLastResult(result);

    if (result.ok && isIndexResponse(result.body)) {
      setResponse(result.body);
    } else {
      setResponse(null);
    }

    setIsLoading(false);
  }

  async function requestJson(path: string): Promise<IndexHttpResult> {
    if (!accessToken) {
      return {
        body: { error: "Sessao indisponivel ou expirada." },
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      };
    }

    const fetchResponse = await fetch(path, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const text = await fetchResponse.text();

    return {
      body: parseJsonBody(text),
      ok: fetchResponse.ok,
      status: fetchResponse.status,
      statusText: fetchResponse.statusText,
    };
  }

  function updateFilter(key: keyof IndexFilters, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function copyOutputId(id: string) {
    await navigator.clipboard.writeText(id).catch(() => undefined);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1600);
  }

  return (
    <main className="min-h-screen bg-background p-5 text-foreground sm:p-8">
      <section className="mx-auto grid max-w-7xl gap-6">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            EVOLV interno
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">
            Decision Observatory
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Decision Output Index para localizar decisoes ja persistidas e abrir
            o Inspector. Esta tela e read-only e nao executa Decision Models.
          </p>
        </header>

        <section className="executive-surface grid gap-4 rounded-md p-5">
          <p className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
            {authStatus}
          </p>

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <FilterInput
              label="Lead / ID"
              onChange={(value) => updateFilter("leadQuery", value)}
              placeholder="UUID do lead"
              value={filters.leadQuery}
            />
            <FilterInput
              label="Modelo"
              onChange={(value) => updateFilter("modelId", value)}
              placeholder="DM-001"
              value={filters.modelId}
            />
            <FilterInput
              label="Versao"
              onChange={(value) => updateFilter("modelVersion", value)}
              placeholder="0.1.0-i1"
              value={filters.modelVersion}
            />
            <FilterSelect
              label="Periodo"
              onChange={(value) => updateFilter("period", value)}
              options={[
                ["all", "Todos"],
                ["today", "Hoje"],
                ["last_7_days", "Ultimos 7 dias"],
                ["last_30_days", "Ultimos 30 dias"],
                ["custom", "Custom"],
              ]}
              value={filters.period}
            />
            <FilterSelect
              label="Ordenar por"
              onChange={(value) => updateFilter("sortBy", value)}
              options={[
                ["created_at", "Data"],
                ["score", "Score"],
                ["confidence", "Confidence"],
              ]}
              value={filters.sortBy}
            />
            <FilterSelect
              label="Direcao"
              onChange={(value) => updateFilter("sortDirection", value)}
              options={[
                ["desc", "Desc"],
                ["asc", "Asc"],
              ]}
              value={filters.sortDirection}
            />
          </div>

          {filters.period === "custom" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <FilterInput
                label="Data inicial"
                onChange={(value) => updateFilter("dateFrom", value)}
                type="datetime-local"
                value={filters.dateFrom}
              />
              <FilterInput
                label="Data final"
                onChange={(value) => updateFilter("dateTo", value)}
                type="datetime-local"
                value={filters.dateTo}
              />
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-5">
            <FilterInput
              label="Score min"
              onChange={(value) => updateFilter("scoreMin", value)}
              placeholder="0"
              type="number"
              value={filters.scoreMin}
            />
            <FilterInput
              label="Score max"
              onChange={(value) => updateFilter("scoreMax", value)}
              placeholder="100"
              type="number"
              value={filters.scoreMax}
            />
            <FilterInput
              label="Confidence min"
              onChange={(value) => updateFilter("confidenceMin", value)}
              placeholder="0"
              type="number"
              value={filters.confidenceMin}
            />
            <FilterInput
              label="Confidence max"
              onChange={(value) => updateFilter("confidenceMax", value)}
              placeholder="100"
              type="number"
              value={filters.confidenceMax}
            />
            <FilterInput
              label="Page size"
              onChange={(value) => updateFilter("pageSize", value)}
              placeholder="25"
              type="number"
              value={filters.pageSize}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!accessToken || isLoading}
              onClick={() => {
                setPage(1);
                void loadOutputs(1);
              }}
              type="button"
            >
              {isLoading ? "Carregando..." : "Aplicar filtros"}
            </Button>
            <Button
              onClick={() => {
                setFilters(defaultFilters);
                setPage(1);
              }}
              type="button"
              variant="secondary"
            >
              Limpar
            </Button>
          </div>
        </section>

        {lastResult && !lastResult.ok ? (
          <p className="rounded-md border border-dashed bg-card px-3 py-3 text-sm text-muted-foreground">
            Nao foi possivel carregar os Decision Outputs. Status{" "}
            {lastResult.status}.
          </p>
        ) : null}

        <DecisionOutputsTable
          copiedId={copiedId}
          isLoading={isLoading}
          items={response?.items ?? []}
          onCopyId={copyOutputId}
        />

        {response ? (
          <PaginationControls
            onPageChange={setPage}
            page={response.pagination.page}
            totalPages={response.pagination.totalPages}
            total={response.pagination.total}
          />
        ) : null}
      </section>
    </main>
  );
}

function DecisionOutputsTable({
  copiedId,
  isLoading,
  items,
  onCopyId,
}: {
  copiedId: string | null;
  isLoading: boolean;
  items: DecisionOutputIndexItem[];
  onCopyId: (id: string) => void | Promise<void>;
}) {
  if (isLoading) {
    return (
      <p className="rounded-md border border-dashed bg-card px-3 py-3 text-sm text-muted-foreground">
        Carregando Decision Outputs...
      </p>
    );
  }

  if (!items.length) {
    return (
      <p className="rounded-md border border-dashed bg-card px-3 py-3 text-sm text-muted-foreground">
        Nenhum Decision Output encontrado para os filtros selecionados.
      </p>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-background/70 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
            <tr>
              <th className="px-3 py-3">Lead</th>
              <th className="px-3 py-3">Modelo</th>
              <th className="px-3 py-3">Versao</th>
              <th className="px-3 py-3">Decisao</th>
              <th className="px-3 py-3">Score</th>
              <th className="px-3 py-3">Confidence</th>
              <th className="px-3 py-3">Data</th>
              <th className="px-3 py-3">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr className="border-t" key={item.id}>
                <td className="px-3 py-3">
                  <p className="font-medium text-foreground">
                    {item.leadName ?? item.leadId ?? "-"}
                  </p>
                  <p className="mt-1 max-w-[180px] truncate text-xs text-muted-foreground">
                    {item.id}
                  </p>
                </td>
                <td className="px-3 py-3">{item.modelId}</td>
                <td className="px-3 py-3">{item.modelVersion ?? "-"}</td>
                <td className="px-3 py-3">{item.decision ?? "-"}</td>
                <td className="px-3 py-3">
                  {item.score === null ? "-" : item.score}
                </td>
                <td className="px-3 py-3">
                  {item.confidence === null ? "-" : `${item.confidence}`}
                </td>
                <td className="px-3 py-3">{formatDateTime(item.createdAt)}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/internal/decision-inspector?outputId=${item.id}`}>
                        Inspecionar
                      </Link>
                    </Button>
                    <Button
                      onClick={() => void onCopyId(item.id)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      {copiedId === item.id ? "Copiado" : "Copiar ID"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PaginationControls({
  onPageChange,
  page,
  total,
  totalPages,
}: {
  onPageChange: (page: number) => void;
  page: number;
  total: number;
  totalPages: number;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border bg-card p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Pagina {page} de {totalPages} | {total} registros
      </span>
      <div className="flex gap-2">
        <Button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
          variant="secondary"
        >
          Anterior
        </Button>
        <Button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
          variant="secondary"
        >
          Proxima
        </Button>
      </div>
    </div>
  );
}

function FilterInput({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        className="rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select
        className="rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function buildQueryString(filters: IndexFilters, page: number) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, normalizeDateFilterValue(key, value));
    }
  }

  params.set("page", String(page));

  return params.toString();
}

function normalizeDateFilterValue(key: string, value: string) {
  if ((key === "dateFrom" || key === "dateTo") && value) {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }

  return value;
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

function isIndexResponse(value: unknown): value is DecisionOutputIndexResponse {
  return Boolean(
    value &&
      typeof value === "object" &&
      "items" in value &&
      "pagination" in value,
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
