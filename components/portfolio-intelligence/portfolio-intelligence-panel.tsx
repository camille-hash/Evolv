import {
  portfolioConcentrationLabels,
  portfolioExpansionPotentialLabels,
  type PortfolioIntelligence,
} from "@/modules/portfolio-intelligence";

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  style: "percent",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export function PortfolioIntelligencePanel({
  intelligence,
  title = "Diagnostico Patrimonial",
}: {
  intelligence: PortfolioIntelligence;
  title?: string;
}) {
  return (
    <section className="executive-surface rounded-md p-5 text-card-foreground sm:p-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Saude Patrimonial
        </p>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PortfolioIntelligenceMetric
          label="EVOLV Score"
          value={`${intelligence.evolvScore}/100`}
        />
        <PortfolioIntelligenceMetric
          label="Concentracao"
          value={portfolioConcentrationLabels[intelligence.concentracao]}
        />
        <PortfolioIntelligenceMetric
          label="Eficiencia"
          value={percentFormatter.format(intelligence.eficienciaPatrimonial)}
        />
        <PortfolioIntelligenceMetric
          label="Potencial de Expansao"
          value={
            portfolioExpansionPotentialLabels[intelligence.potencialExpansao]
          }
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PortfolioIntelligenceDetail
          label="Patrimonio total"
          value={currencyFormatter.format(intelligence.patrimonioTotal)}
        />
        <PortfolioIntelligenceDetail
          label="% em imoveis"
          value={percentFormatter.format(intelligence.percentualImoveis)}
        />
        <PortfolioIntelligenceDetail
          label="% em cartas"
          value={percentFormatter.format(intelligence.percentualCartas)}
        />
        <PortfolioIntelligenceDetail
          label="Renda passiva anualizada"
          value={currencyFormatter.format(
            intelligence.rendaPassivaAnualizada,
          )}
        />
        <PortfolioIntelligenceDetail
          label="Cartas contempladas"
          value={String(intelligence.cartasContempladas)}
        />
        <PortfolioIntelligenceDetail
          label="Cartas nao contempladas"
          value={String(intelligence.cartasNaoContempladas)}
        />
      </div>
    </section>
  );
}

function PortfolioIntelligenceMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-md border bg-background/70 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </article>
  );
}

function PortfolioIntelligenceDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-background/60 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}

