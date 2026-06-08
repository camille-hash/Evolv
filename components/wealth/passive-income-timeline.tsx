import {
  buildMilestoneSteps,
  passiveIncomeMilestones,
  type WealthMilestoneStep,
} from "@/modules/wealth";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function PassiveIncomeTimeline({
  compact = false,
  currentPassiveIncome,
}: {
  compact?: boolean;
  currentPassiveIncome: number;
}) {
  const steps = buildMilestoneSteps({
    currentValue: currentPassiveIncome,
    milestones: passiveIncomeMilestones,
  });
  const visibleSteps = compact ? getCompactSteps(steps) : steps;

  return (
    <section className="rounded-md border bg-card p-5 text-card-foreground sm:p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">Jornada de Renda Passiva</h3>
        <p className="text-sm text-muted-foreground">
          Marcos mensais para acompanhar a renda recorrente.
        </p>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {visibleSteps.map((step) => (
          <PassiveIncomeMilestone key={`${step.value}-${step.state}`} step={step} />
        ))}
      </div>
    </section>
  );
}

function PassiveIncomeMilestone({ step }: { step: WealthMilestoneStep }) {
  return (
    <article
      className={cn(
        "rounded-md border bg-background p-4",
        step.state === "completed" && "border-primary/30 bg-primary/[0.03]",
        step.state === "next" && "border-primary bg-primary/[0.06]",
      )}
    >
      <div
        className={cn(
          "mb-4 h-2 w-10 rounded-full bg-muted",
          step.state !== "future" && "bg-primary",
        )}
      />
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {getStatusLabel(step)}
      </p>
      <p className="mt-2 text-lg font-semibold text-foreground">
        {currencyFormatter.format(step.value)}/mes
      </p>
      {step.state === "next" ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Faltam {currencyFormatter.format(step.missingValue)}/mes
        </p>
      ) : null}
    </article>
  );
}

function getCompactSteps(steps: WealthMilestoneStep[]) {
  const completedSteps = steps.filter((step) => step.state === "completed");
  const nextStep = steps.find((step) => step.state === "next");
  const compactSteps = [...completedSteps.slice(-1)];

  if (nextStep) {
    compactSteps.push(nextStep);
  }

  return compactSteps.length > 0 ? compactSteps : steps.slice(0, 2);
}

function getStatusLabel(step: WealthMilestoneStep) {
  const labels: Record<WealthMilestoneStep["state"], string> = {
    completed: "Concluido",
    next: "Proximo marco",
    future: "Futuro",
  };

  return labels[step.state];
}
