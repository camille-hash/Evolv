"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchOperationsRevenue } from "@/modules/operations/revenue-client";
import type {
  OperationsRevenueQuery,
  OperationsRevenueResponse,
  OperationsRevenueSortField,
  OperationsRevenueSortOrder,
  OperationsRevenueStatus,
} from "@/modules/operations/revenue-types";
import { OperationalEmptyState } from "../operational-empty-state";
import { OperationsContextLink } from "../operations-context-link";
import { OperationsRevenueEmptyState } from "./operations-revenue-empty-state";
import { OperationsRevenueList } from "./operations-revenue-list";
import { OperationsRevenueSummary as OperationsRevenueSummaryCards } from "./operations-revenue-summary";

type RevenuePageContext = {
  contractId: string | null;
  entryId: string | null;
  focus: string | null;
  origin: string | null;
  status: string | null;
};

type RevenueFilterForm = {
  administratorId: string;
  clientId: string;
  competency: string;
  contract: string;
  dueFrom: string;
  dueTo: string;
  maxAmount: string;
  minAmount: string;
  order: OperationsRevenueSortOrder;
  pageSize: string;
  search: string;
  sort: OperationsRevenueSortField;
  status: string;
};

const defaultFilterForm: RevenueFilterForm = {
  administratorId: "",
  clientId: "",
  competency: "",
  contract: "",
  dueFrom: "",
  dueTo: "",
  maxAmount: "",
  minAmount: "",
  order: "asc",
  pageSize: "25",
  search: "",
  sort: "vencimento",
  status: "",
};

export function OperationsRevenuePage() {
  const searchParams = useSearchParams();
  const pageContext = useMemo(
    () => readRevenuePageContext(searchParams),
    [searchParams],
  );
  const [revenueResponse, setRevenueResponse] =
    useState<OperationsRevenueResponse | null>(null);
  const [query, setQuery] = useState<OperationsRevenueQuery>({
    order: "asc",
    page: 1,
    pageSize: 25,
    sort: "vencimento",
  });
  const [filterForm, setFilterForm] =
    useState<RevenueFilterForm>(defaultFilterForm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestQuery = useMemo(
    () => buildRevenueRequestQuery(pageContext, query),
    [pageContext, query],
  );

  useEffect(() => {
    let isActive = true;

    void (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const loadedRevenue = await fetchOperationsRevenue(requestQuery);

        if (isActive) {
          setRevenueResponse(loadedRevenue);
        }
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Nao foi possivel carregar os recebimentos operacionais.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [requestQuery]);

  async function loadRevenue(nextQuery = requestQuery) {
    setError(null);

    try {
      const loadedRevenue = await fetchOperationsRevenue(nextQuery);
      setRevenueResponse(loadedRevenue);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Nao foi possivel carregar os recebimentos operacionais.",
      );
    }
  }

  if (isLoading) {
    return (
      <OperationalEmptyState
        description="Carregando recebimentos operacionais..."
        title="Receita"
      />
    );
  }

  if (error) {
    return <OperationalEmptyState description={error} title="Erro operacional" />;
  }

  const response = revenueResponse;
  const entries = response?.entries ?? [];
  const summary = response?.summary ?? {
    divergentEntries: 0,
    expectedRevenue: 0,
    pendingRevenue: 0,
    recognizedPercentage: 0,
    recognizedRevenue: 0,
    totalEntries: 0,
  };
  const dailyPanel = response?.dailyPanel ?? {
    criticalEntries: [],
    dueToday: { count: 0, totalAmount: 0 },
    dueTomorrow: { count: 0, totalAmount: 0 },
    expectedToday: { totalAmount: 0 },
    overdue: { count: 0, totalAmount: 0 },
    receivedToday: { count: 0, totalAmount: 0 },
  };
  const pagination = response?.pagination ?? {
    page: 1,
    pageSize: 25,
    totalItems: 0,
    totalPages: 1,
  };
  const filters = response?.filters ?? {
    administrators: [],
    clients: [],
    statuses: [],
  };
  const isContextDrilldown = Boolean(pageContext.entryId || pageContext.contractId);

  return (
    <div className="grid gap-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Recebimentos operacionais
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Receita</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          Pesquise recebimentos, refine por filtros operacionais e acompanhe o
          que precisa entrar ou ja foi reconhecido.
        </p>
      </section>

      {pageContext.origin === "mesa" ? (
        <RevenueContextBanner
          matchingCount={pagination.totalItems}
          pageContext={pageContext}
        />
      ) : null}

      <section className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <DailyMetricCard
            label="Vencidos"
            count={dailyPanel.overdue.count}
            tone="attention"
            value={dailyPanel.overdue.totalAmount}
          />
          <DailyMetricCard
            label="Vencem hoje"
            count={dailyPanel.dueToday.count}
            tone="neutral"
            value={dailyPanel.dueToday.totalAmount}
          />
          <DailyMetricCard
            label="Vencem amanha"
            count={dailyPanel.dueTomorrow.count}
            tone="neutral"
            value={dailyPanel.dueTomorrow.totalAmount}
          />
          <DailyMetricCard
            label="Recebidos hoje"
            count={dailyPanel.receivedToday.count}
            tone="success"
            value={dailyPanel.receivedToday.totalAmount}
          />
          <DailyMetricCard
            label="Previsto hoje"
            count={null}
            tone="neutral"
            value={dailyPanel.expectedToday.totalAmount}
          />
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Pendencias criticas
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">
                O que merece atencao imediata
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Esta lista prioriza recebimentos em aberto com maior atraso e
                maior impacto financeiro.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Ate 10 itens prioritarios por consulta.
            </div>
          </div>

          {dailyPanel.criticalEntries.length ? (
            <div className="mt-4 grid gap-3">
              {dailyPanel.criticalEntries.map((entry) => (
                <article
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                  key={entry.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-950">
                          {entry.clientName}
                        </h3>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                          {resolveCriticalStatusLabel(entry.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {entry.contractNumber
                          ? `Contrato ${entry.contractNumber}`
                          : "Contrato sem numero"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {entry.administratorName}
                      </p>
                    </div>
                    <div className="grid gap-1 text-right">
                      <p className="text-sm font-semibold text-slate-950">
                        {formatCurrency(entry.expectedAmount)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Vence em {formatDate(entry.dueDate) ?? "sem data"}
                      </p>
                      <p className="text-xs text-amber-800">
                        {entry.daysOverdue > 0
                          ? `${entry.daysOverdue} dia(s) de atraso`
                          : "Vence hoje ou amanha"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <OperationsContextLink
                      href={`/operations/revenue?entryId=${encodeURIComponent(entry.id)}`}
                    >
                      Ver recebimento
                    </OperationsContextLink>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Nenhuma pendencia critica encontrada no recorte atual.
            </div>
          )}
        </section>
      </section>

      <OperationsRevenueSummaryCards summary={summary} />

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Pesquisa operacional
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">
              Localize recebimentos com rapidez
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Busque por cliente, contrato, administradora ou plano e refine a
              consulta por periodo, valor e situacao.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {pagination.totalItems} recebimento(s) encontrados nesta consulta.
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1.6fr_auto]">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Buscar
            </span>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              onChange={(event) =>
                setFilterForm((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              placeholder="Cliente, contrato, administradora ou plano"
              type="text"
              value={filterForm.search}
            />
          </label>
          <div className="flex items-end">
            <button
              className="w-full rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 md:w-auto"
              onClick={() => setQuery(buildRevenueQueryFromForm(filterForm))}
              type="button"
            >
              Pesquisar
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            label="Situacao"
            onChange={(value) =>
              setFilterForm((current) => ({ ...current, status: value }))
            }
            options={[
              { label: "Todas", value: "" },
              ...filters.statuses.map((status) => ({
                label: status.label,
                value: status.value,
              })),
            ]}
            value={filterForm.status}
          />
          <FilterSelect
            label="Administradora"
            onChange={(value) =>
              setFilterForm((current) => ({
                ...current,
                administratorId: value,
              }))
            }
            options={[
              { label: "Todas", value: "" },
              ...filters.administrators.map((administrator) => ({
                label: administrator.label,
                value: administrator.id,
              })),
            ]}
            value={filterForm.administratorId}
          />
          <FilterSelect
            label="Cliente"
            onChange={(value) =>
              setFilterForm((current) => ({ ...current, clientId: value }))
            }
            options={[
              { label: "Todos", value: "" },
              ...filters.clients.map((client) => ({
                label: client.label,
                value: client.id,
              })),
            ]}
            value={filterForm.clientId}
          />
          <FilterInput
            label="Contrato"
            onChange={(value) =>
              setFilterForm((current) => ({ ...current, contract: value }))
            }
            placeholder="Numero ou identificador"
            value={filterForm.contract}
          />
          <FilterInput
            label="Competencia"
            onChange={(value) =>
              setFilterForm((current) => ({ ...current, competency: value }))
            }
            type="month"
            value={filterForm.competency}
          />
          <FilterInput
            label="Vencimento de"
            onChange={(value) =>
              setFilterForm((current) => ({ ...current, dueFrom: value }))
            }
            type="date"
            value={filterForm.dueFrom}
          />
          <FilterInput
            label="Vencimento ate"
            onChange={(value) =>
              setFilterForm((current) => ({ ...current, dueTo: value }))
            }
            type="date"
            value={filterForm.dueTo}
          />
          <FilterInput
            label="Valor minimo"
            onChange={(value) =>
              setFilterForm((current) => ({ ...current, minAmount: value }))
            }
            placeholder="Ex.: 1000"
            type="number"
            value={filterForm.minAmount}
          />
          <FilterInput
            label="Valor maximo"
            onChange={(value) =>
              setFilterForm((current) => ({ ...current, maxAmount: value }))
            }
            placeholder="Ex.: 15000"
            type="number"
            value={filterForm.maxAmount}
          />
          <FilterSelect
            label="Ordenar por"
            onChange={(value) =>
              setFilterForm((current) => ({
                ...current,
                sort: value as OperationsRevenueSortField,
              }))
            }
            options={[
              { label: "Vencimento", value: "vencimento" },
              { label: "Cliente", value: "cliente" },
              { label: "Contrato", value: "contrato" },
              { label: "Valor", value: "valor" },
              { label: "Situacao", value: "status" },
            ]}
            value={filterForm.sort}
          />
          <FilterSelect
            label="Ordem"
            onChange={(value) =>
              setFilterForm((current) => ({
                ...current,
                order: value as OperationsRevenueSortOrder,
              }))
            }
            options={[
              { label: "Crescente", value: "asc" },
              { label: "Decrescente", value: "desc" },
            ]}
            value={filterForm.order}
          />
          <FilterSelect
            label="Itens por pagina"
            onChange={(value) =>
              setFilterForm((current) => ({ ...current, pageSize: value }))
            }
            options={[
              { label: "10", value: "10" },
              { label: "25", value: "25" },
              { label: "50", value: "50" },
              { label: "100", value: "100" },
            ]}
            value={filterForm.pageSize}
          />
        </div>

        <div className="flex flex-wrap justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-sm text-slate-600">
            A consulta abaixo usa filtros, ordenacao e paginação no servidor.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              onClick={() => {
                setFilterForm(defaultFilterForm);
                setQuery({
                  order: "asc",
                  page: 1,
                  pageSize: 25,
                  sort: "vencimento",
                });
              }}
              type="button"
            >
              Limpar filtros
            </button>
            <button
              className="rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={() => setQuery(buildRevenueQueryFromForm(filterForm))}
              type="button"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      </section>

      {entries.length === 0 ? (
        isContextDrilldown ? (
          <OperationalEmptyState
            title="Receita nao encontrada neste contexto"
            description="A Mesa de Trabalho apontou para uma receita especifica, mas ela nao apareceu na leitura operacional atual."
          />
        ) : (
          <OperationsRevenueEmptyState
            description="Tente outro termo de busca ou ajuste os filtros operacionais."
            title="Nenhum recebimento encontrado."
          />
        )
      ) : (
        <>
          <OperationsRevenueList
            entries={entries}
            onRefresh={() => loadRevenue(requestQuery)}
          />

          <RevenuePagination
            currentPage={pagination.page}
            onChangePage={(page) =>
              setQuery((current) => ({
                ...current,
                page,
              }))
            }
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
          />
        </>
      )}
    </div>
  );
}

function RevenueContextBanner({
  matchingCount,
  pageContext,
}: {
  matchingCount: number;
  pageContext: RevenuePageContext;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Contexto da Mesa de Trabalho
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">
            {resolveRevenueContextTitle(pageContext)}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {resolveRevenueContextDescription(pageContext, matchingCount)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OperationsContextLink href="/operations">
            Voltar para a mesa
          </OperationsContextLink>
          <OperationsContextLink href="/operations/revenue">
            Ver todas as receitas
          </OperationsContextLink>
        </div>
      </div>
    </section>
  );
}

function RevenuePagination({
  currentPage,
  onChangePage,
  totalItems,
  totalPages,
}: {
  currentPage: number;
  onChangePage: (page: number) => void;
  totalItems: number;
  totalPages: number;
}) {
  if (totalItems <= 0) {
    return null;
  }

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm text-slate-600">
        Pagina {currentPage} de {totalPages} | {totalItems} recebimento(s)
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={currentPage <= 1}
          onClick={() => onChangePage(currentPage - 1)}
          type="button"
        >
          Pagina anterior
        </button>
        <button
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={currentPage >= totalPages}
          onClick={() => onChangePage(currentPage + 1)}
          type="button"
        >
          Proxima pagina
        </button>
      </div>
    </section>
  );
}

function DailyMetricCard({
  count,
  label,
  tone,
  value,
}: {
  count: number | null;
  label: string;
  tone: "attention" | "neutral" | "success";
  value: number;
}) {
  const toneClassName =
    tone === "attention"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-slate-200 bg-white text-slate-900";

  return (
    <article className={`rounded-xl border p-5 shadow-sm ${toneClassName}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-80">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold">{formatCurrency(value)}</p>
      <p className="mt-2 text-sm opacity-80">
        {count === null ? "Valor total do dia." : `${count} recebimento(s).`}
      </p>
    </article>
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
  type?: "date" | "month" | "number" | "text";
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <input
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step={type === "number" ? "0.01" : undefined}
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
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <select
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={`${label}-${option.value || "all"}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function readRevenuePageContext(
  searchParams: ReturnType<typeof useSearchParams>,
): RevenuePageContext {
  return {
    contractId: searchParams.get("contractId"),
    entryId: searchParams.get("entryId"),
    focus: searchParams.get("foco"),
    origin: searchParams.get("origem"),
    status: searchParams.get("status"),
  };
}

function buildRevenueRequestQuery(
  pageContext: RevenuePageContext,
  query: OperationsRevenueQuery,
): OperationsRevenueQuery {
  return {
    ...query,
    contractId: pageContext.contractId ?? query.contractId ?? null,
    entryId: pageContext.entryId ?? query.entryId ?? null,
    status:
      normalizeRevenueStatus(pageContext.status) ??
      query.status ??
      null,
  };
}

function buildRevenueQueryFromForm(form: RevenueFilterForm): OperationsRevenueQuery {
  return {
    administratorId: form.administratorId || null,
    clientId: form.clientId || null,
    competency: form.competency || null,
    contract: form.contract || null,
    dueFrom: form.dueFrom || null,
    dueTo: form.dueTo || null,
    maxAmount: parseOptionalNumber(form.maxAmount),
    minAmount: parseOptionalNumber(form.minAmount),
    order: form.order,
    page: 1,
    pageSize: parseOptionalInteger(form.pageSize) ?? 25,
    search: form.search || null,
    sort: form.sort,
    status: normalizeRevenueStatus(form.status),
  };
}

function resolveRevenueContextTitle(pageContext: RevenuePageContext) {
  if (pageContext.focus === "receita_divergente") {
    return "Receita com divergencia operacional";
  }

  if (pageContext.focus === "receita_aguardando") {
    return "Receita aguardando evolucao";
  }

  return "Receitas filtradas por contexto";
}

function resolveRevenueContextDescription(
  pageContext: RevenuePageContext,
  matchingCount: number,
) {
  if (pageContext.entryId && matchingCount === 1) {
    return "Voce ja caiu na receita certa. Revise a linha abaixo e siga a proxima acao indicada.";
  }

  if ((pageContext.entryId || pageContext.contractId) && matchingCount === 0) {
    return "A receita apontada pela Mesa nao apareceu nesta leitura. Vale conferir se ela foi reconhecida, cancelada ou saiu da visao atual.";
  }

  if (pageContext.contractId) {
    return "A lista foi aberta ja recortada para o contrato relacionado a este trabalho.";
  }

  if (pageContext.status) {
    return `A lista foi aberta ja filtrada pelo status ${pageContext.status}.`;
  }

  return "A lista foi aberta com um recorte especifico para reduzir busca manual.";
}

function normalizeRevenueStatus(value: string | null | undefined) {
  if (
    value === "attention" ||
    value === "cancelled" ||
    value === "expected" ||
    value === "pending" ||
    value === "recognized"
  ) {
    return value as OperationsRevenueStatus;
  }

  return null;
}

function resolveCriticalStatusLabel(status: OperationsRevenueStatus) {
  if (status === "attention") {
    return "Com problema";
  }

  if (status === "pending") {
    return "Parcial";
  }

  if (status === "expected") {
    return "Prevista";
  }

  if (status === "cancelled") {
    return "Cancelada";
  }

  return "Reconhecida";
}

function formatDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInteger(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
