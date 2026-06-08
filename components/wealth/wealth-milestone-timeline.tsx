import {
  buildMilestoneSteps,
  wealthMilestones,
  type WealthMilestoneStep,
} from "@/modules/wealth";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function WealthMilestoneTimeline({
  currentWealth,
  compact = false,
}: {
  currentWealth: number;
  compact?: boolean;
}) {
  const steps = buildMilestoneSteps({
    currentValue: currentWealth,
    milestones: wealthMilestones,
  });

  return (
    <MilestoneTimeline
      compact={compact}
      steps={steps}
      title="Jornada Patrimonial"
    />
  );
}

function MilestoneTimeline({
  compact,
  steps,
  title,
}: {
  compact: boolean;
  steps: WealthMilestoneStep[];
  title: string;
}) {
  const normalizedSteps = compact ? getCompactSteps(steps) : steps;

  return (
    <section className="executive-surface rounded-md p-5 text-card-foreground sm:p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">
          Marcos patrimoniais definidos para acompanhar a evolucao.
        </p>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-6">
        {normalizedSteps.map((step) => (
          <MilestoneItem key={`${step.value}-${step.state}`} step={step} />
        ))}
      </div>
    </section>
  );
}

function getCompactSteps(steps: WealthMilestoneStep[]) {
  const completedSteps = steps.filter((step) => step.state === "completed");
  const nextStep = steps.find((step) => step.state === "next");
  const compactSteps = [...completedSteps.slice(-2)];

  if (nextStep) {
    compactSteps.push(nextStep);
  }

  return compactSteps.length > 0 ? compactSteps : steps.slice(0, 2);
}

function MilestoneItem({ step }: { step: WealthMilestoneStep }) {
  const statusLabel = getStatusLabel(step);

  return (
    <article
      className={cn(
        "relative rounded-md border bg-background/70 p-4",
        step.state === "completed" && "border-primary/30 bg-primary/[0.035]",
        step.state === "next" && "border-brand-gold bg-brand-gold/[0.12]",
      )}
    >
      <div
        className={cn(
          "mb-4 h-2 w-10 rounded-full bg-muted",
          step.state === "completed" && "bg-primary",
          step.state === "next" && "bg-brand-gold",
        )}
      />
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {statusLabel}
      </p>
      <p className="mt-2 text-lg font-semibold text-foreground">
        {currencyFormatter.format(step.value)}
      </p>
      {step.state === "next" ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Faltam {currencyFormatter.format(step.missingValue)}
        </p>
      ) : null}
    </article>
  );
}

function getStatusLabel(step: WealthMilestoneStep) {
  const labels: Record<WealthMilestoneStep["state"], string> = {
    completed: "Concluido",
    next: "Proximo marco",
    future: "Futuro",
  };

  return labels[step.state];
}
