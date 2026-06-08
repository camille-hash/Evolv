import {
  recommendationCategoryLabels,
  recommendationPriorityLabels,
  type Recommendation,
} from "@/modules/recommendations";

export function RecommendationsPanel({
  recommendations,
  title = "Proximos Movimentos",
}: {
  recommendations: Recommendation[];
  title?: string;
}) {
  return (
    <section className="executive-surface rounded-md p-5 text-card-foreground sm:p-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Recomendacoes Consultivas
        </p>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      </div>

      <div className="mt-5 grid gap-3">
        {recommendations.length > 0 ? (
          recommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
            />
          ))
        ) : (
          <div className="rounded-md border bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
            Nenhum movimento prioritario identificado neste momento.
          </div>
        )}
      </div>
    </section>
  );
}

function RecommendationCard({
  recommendation,
}: {
  recommendation: Recommendation;
}) {
  return (
    <article className="rounded-md border bg-background/70 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border bg-card px-2.5 py-1 text-xs font-medium text-foreground">
          {recommendationCategoryLabels[recommendation.category]}
        </span>
        <span className="rounded-md border border-brand-gold/35 bg-brand-gold/[0.1] px-2.5 py-1 text-xs font-medium text-brand-ink">
          Prioridade {recommendationPriorityLabels[recommendation.priority]}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {recommendation.text}
      </p>
    </article>
  );
}

