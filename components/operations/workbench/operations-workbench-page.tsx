"use client";

import { useEffect, useState } from "react";
import { OperationalEmptyState } from "../operational-empty-state";
import { OperationsTimelinePanel } from "../timeline/operations-timeline-panel";
import { fetchOperationsWorkbench } from "@/modules/operations/workbench/client";
import type {
  OperationsWorkbenchResponse,
  WorkbenchBucket,
} from "@/modules/operations/workbench/types";
import { WorkCard } from "./work-card";

export function OperationsWorkbenchPage() {
  const [response, setResponse] = useState<OperationsWorkbenchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadWorkbench() {
      setIsLoading(true);
      setError(null);

      try {
        const loadedWorkbench = await fetchOperationsWorkbench();

        if (isActive) {
          setResponse(loadedWorkbench);
        }
      } catch (error) {
        if (isActive) {
          setError(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar a mesa de trabalho.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadWorkbench();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return (
      <OperationalEmptyState
        title="Mesa de Trabalho"
        description="Organizando os itens que pedem ação agora..."
      />
    );
  }

  if (error) {
    return <OperationalEmptyState title="Erro operacional" description={error} />;
  }

  const buckets = response?.buckets ?? [];

  return (
    <div className="grid gap-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Mesa de Trabalho
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          O que precisa da sua atenção agora?
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          Aqui ficam apenas os trabalhos do dia que pedem decisão, acompanhamento
          ou resolução objetiva.
        </p>
      </section>

      {buckets.map((bucket) => (
        <WorkbenchSection bucket={bucket} key={bucket.id} />
      ))}

      <OperationsTimelinePanel />
    </div>
  );
}

function WorkbenchSection({ bucket }: { bucket: WorkbenchBucket }) {
  return (
    <section className="grid gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-950">{bucket.title}</h2>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {bucket.items.length}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {bucket.description}
        </p>
      </div>

      {bucket.items.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {bucket.items.map((item) => (
            <WorkCard item={item} key={item.id} />
          ))}
        </div>
      ) : (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white/80 p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-950">
            {bucket.emptyTitle}
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {bucket.emptyDescription}
          </p>
        </section>
      )}
    </section>
  );
}
