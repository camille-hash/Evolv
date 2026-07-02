import type { OperationalInsight } from "@/modules/operations/intelligence-types";
import { OperationalEmptyState } from "../operational-empty-state";
import { OperationsInsightCard } from "./operations-insight-card";

type OperationsIntelligencePanelProps = {
  insights: OperationalInsight[];
};

export function OperationsIntelligencePanel({
  insights,
}: OperationsIntelligencePanelProps) {
  return (
    <section>
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Inteligencia operacional
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950">
          Leituras executivas priorizadas
        </h2>
      </div>

      {insights.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {insights.map((insight) => (
            <OperationsInsightCard insight={insight} key={insight.id} />
          ))}
        </div>
      ) : (
        <OperationalEmptyState
          description="Nenhuma leitura operacional foi gerada pelas regras atuais."
          title="Sem insights operacionais"
        />
      )}
    </section>
  );
}
