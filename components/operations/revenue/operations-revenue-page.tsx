"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchOperationsRevenue } from "@/modules/operations/revenue-client";
import type {
  OperationsRevenueResponse,
  OperationsRevenueRow,
  OperationsRevenueSummary,
} from "@/modules/operations/revenue-types";
import { OperationalEmptyState } from "../operational-empty-state";
import { OperationsContextLink } from "../operations-context-link";
import { OperationsRevenueList } from "./operations-revenue-list";
import { OperationsRevenueSummary as OperationsRevenueSummaryCards } from "./operations-revenue-summary";

type RevenuePageContext = {
  contractId: string | null;
  entryId: string | null;
  focus: string | null;
  origin: string | null;
  status: string | null;
};

type RevenueQuickFilter =
  | "todas"
  | "hoje"
  | "proximos_7_dias"
  | "proximos_30_dias"
  | "vencidas";

const revenueQuickFilters: Array<{
  description: string;
  id: RevenueQuickFilter;
  label: string;
}> = [
  {
    description: "Exibe todas as receitas previstas e reconhecidas.",
    id: "todas",
    label: "Todas",
  },
  {
    description: "Mostra apenas os recebimentos com vencimento hoje.",
    id: "hoje",
    label: "Hoje",
  },
  {
    description: "Mostra o que vence nos proximos 7 dias.",
    id: "proximos_7_dias",
    label: "Proximos 7 dias",
  },
  {
    description: "Mostra o que vence nos proximos 30 dias.",
    id: "proximos_30_dias",
    label: "Proximos 30 dias",
  },
  {
    description: "Mostra receitas com vencimento anterior a hoje e ainda abertas.",
    id: "vencidas",
    label: "Vencidas",
  },
];

export function OperationsRevenuePage() {
  const searchParams = useSearchParams();
  const [revenueResponse, setRevenueResponse] =
    useState<OperationsRevenueResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] =
    useState<RevenueQuickFilter>("proximos_30_dias");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadRevenue() {
      setIsLoading(true);
      setError(null);

      try {
        const loadedRevenue = await fetchOperationsRevenue();

        if (isActive) {
          setRevenueResponse(loadedRevenue);
        }
      } catch (error) {
        if (isActive) {
          setError(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar as receitas operacionais.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadRevenue();

    return () => {
      isActive = false;
    };
  }, []);

  const pageContext = readRevenuePageContext(searchParams);
  const allEntries = revenueResponse?.entries ?? [];
  const contextEntries = filterRevenueByContext(allEntries, pageContext);
  const visibleEntries = useMemo(
    () =>
      filterRevenueByDueDate(
        applyQuickFilter(contextEntries, quickFilter),
        startDate,
        endDate,
      ),
    [contextEntries, endDate, quickFilter, startDate],
  );
  const summary = summarizeRevenue(visibleEntries);
  const hasDateRange = Boolean(startDate || endDate);

  if (isLoading) {
    return (
      <OperationalEmptyState
        description="Carregando receitas operacionais..."
        title="Receita"
      />
    );
  }

  if (error) {
    return <OperationalEmptyState description={error} title="Erro operacional" />;
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Recebimentos operacionais
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Receita
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          Veja o que vence primeiro, quanto precisa entrar em cada data e o que
          ja foi reconhecido.
        </p>
      </section>

      {pageContext.origin === "mesa" ? (
        <RevenueContextBanner
          matchingCount={visibleEntries.length}
          pageContext={pageContext}
        />
      ) : null}

      <OperationsRevenueSummaryCards summary={summary} />

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Filtros rapidos
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">
              Recebimentos por vencimento
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              A lista abaixo sempre fica em ordem crescente de vencimento e pode
              ser refinada por periodo.
            </p>
          </div>
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Marcacao de recebimento entra na proxima entrega.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {revenueQuickFilters.map((filter) => {
            const isActive = quickFilter === filter.id;

            return (
              <button
                className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                }`}
                key={filter.id}
                onClick={() => setQuickFilter(filter.id)}
                title={filter.description}
                type="button"
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Data inicial
            </span>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Data final
            </span>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              value={endDate}
            />
          </label>
          <div className="flex items-end">
            <button
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setQuickFilter("todas");
              }}
              type="button"
            >
              Limpar filtros
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {hasDateRange
            ? "O intervalo informado refina a lista acima do filtro rapido selecionado."
            : "Sem intervalo manual. O filtro rapido selecionado define o recorte atual."}
        </div>
      </section>

      {(pageContext.entryId || pageContext.contractId) && visibleEntries.length === 0 ? (
        <OperationalEmptyState
          title="Receita nao encontrada neste contexto"
          description="A Mesa de Trabalho apontou para uma receita especifica, mas ela nao apareceu na leitura operacional atual."
        />
      ) : (
        <OperationsRevenueList entries={visibleEntries} />
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

function filterRevenueByContext(
  entries: OperationsRevenueRow[],
  pageContext: RevenuePageContext,
) {
  if (pageContext.entryId) {
    return entries.filter((entry) => entry.id === pageContext.entryId);
  }

  if (pageContext.contractId) {
    return entries.filter((entry) => entry.contractId === pageContext.contractId);
  }

  if (pageContext.status) {
    return entries.filter((entry) => entry.status === pageContext.status);
  }

  return entries;
}

function summarizeRevenue(
  entries: OperationsRevenueRow[],
): OperationsRevenueSummary {
  return entries.reduce<OperationsRevenueSummary>(
    (summary, entry) => {
      summary.totalEntries += 1;
      summary.expectedRevenue += entry.expectedAmount;
      summary.recognizedRevenue += entry.recognizedAmount;

      if (entry.status === "attention") {
        summary.divergentEntries += 1;
      }

      if (entry.status === "expected" || entry.status === "pending") {
        summary.pendingRevenue += entry.expectedAmount;
      }

      return summary;
    },
    {
      divergentEntries: 0,
      expectedRevenue: 0,
      pendingRevenue: 0,
      recognizedPercentage: calculateRecognizedPercentage(entries),
      recognizedRevenue: 0,
      totalEntries: 0,
    },
  );
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
    return "Voce ja caiu na receita certa. Revise o cartao abaixo e siga a proxima acao indicada.";
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

function calculateRecognizedPercentage(entries: OperationsRevenueRow[]) {
  const expectedTotal = entries.reduce(
    (total, entry) => total + entry.expectedAmount,
    0,
  );
  const recognizedTotal = entries.reduce(
    (total, entry) => total + entry.recognizedAmount,
    0,
  );

  if (expectedTotal <= 0) {
    return 0;
  }

  return Math.round((recognizedTotal / expectedTotal) * 100);
}

function applyQuickFilter(
  entries: OperationsRevenueRow[],
  quickFilter: RevenueQuickFilter,
) {
  if (quickFilter === "todas") {
    return entries;
  }

  const todayKey = toDateKey(new Date());

  return entries.filter((entry) => {
    const dueDateKey = normalizeDateKey(entry.dueDate);

    if (!dueDateKey) {
      return false;
    }

    const diffInDays = getDayDifference(todayKey, dueDateKey);

    if (quickFilter === "hoje") {
      return diffInDays === 0;
    }

    if (quickFilter === "proximos_7_dias") {
      return diffInDays >= 0 && diffInDays <= 7;
    }

    if (quickFilter === "proximos_30_dias") {
      return diffInDays >= 0 && diffInDays <= 30;
    }

    if (quickFilter === "vencidas") {
      return diffInDays < 0 && entry.status !== "recognized";
    }

    return true;
  });
}

function filterRevenueByDueDate(
  entries: OperationsRevenueRow[],
  startDate: string,
  endDate: string,
) {
  if (!startDate && !endDate) {
    return entries;
  }

  return entries.filter((entry) => {
    const dueDateKey = normalizeDateKey(entry.dueDate);

    if (!dueDateKey) {
      return false;
    }

    if (startDate && dueDateKey < startDate) {
      return false;
    }

    if (endDate && dueDateKey > endDate) {
      return false;
    }

    return true;
  });
}

function normalizeDateKey(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toDateKey(parsed);
}

function toDateKey(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function getDayDifference(startKey: string, endKey: string) {
  const start = new Date(`${startKey}T00:00:00`);
  const end = new Date(`${endKey}T00:00:00`);

  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}
