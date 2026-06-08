import type {
  RoadmapFinalGoal,
  RoadmapStep,
  StrategicRoadmap,
  StrategicRoadmapInput,
} from "@/modules/roadmap/roadmap-types";

export function buildStrategicRoadmap({
  activeStrategy,
  clientContext,
  operations,
  wealthInput,
}: StrategicRoadmapInput): StrategicRoadmap {
  const finalGoal = buildFinalGoal({ clientContext, wealthInput });
  const strategyObjective =
    activeStrategy?.objective || "Evolucao patrimonial do cliente";
  const operationSteps = operations.map(
    (operation, index): RoadmapStep => ({
      id: operation.id,
      kind: "operation",
      nome: operation.nome,
      credito: operation.credito,
      administradora: operation.administradora,
      objetivo: strategyObjective,
      status: index === 0 ? "active" : "planned",
    }),
  );
  const steps: RoadmapStep[] = [
    {
      id: "today",
      kind: "today",
      nome: "Hoje",
      credito: 0,
      administradora: "",
      objetivo: clientContext.nome
        ? `Ponto de partida de ${clientContext.nome}`
        : "Ponto de partida patrimonial",
      status: "completed",
    },
    ...operationSteps,
    {
      id: "final-goal",
      kind: "goal",
      nome: "Meta Patrimonial",
      credito: finalGoal.metaPatrimonial,
      administradora: "",
      objetivo: "Destino final da jornada patrimonial",
      status: "planned",
    },
  ];

  return {
    steps,
    finalGoal,
    nextStep:
      operationSteps.find((step) => step.status === "active") ??
      steps.find((step) => step.status === "planned") ??
      null,
    activeStrategyName: activeStrategy?.name ?? "Nenhuma estrategia ativa",
  };
}

function buildFinalGoal({
  clientContext,
  wealthInput,
}: Pick<StrategicRoadmapInput, "clientContext" | "wealthInput">): RoadmapFinalGoal {
  return {
    metaPatrimonial:
      clientContext.metaPatrimonial > 0
        ? clientContext.metaPatrimonial
        : wealthInput.targetWealth,
    metaRenda:
      clientContext.metaRenda > 0
        ? clientContext.metaRenda
        : wealthInput.targetPassiveIncome,
    prazo:
      clientContext.prazoMeta > 0
        ? clientContext.prazoMeta
        : wealthInput.wealthGoalTermMonths,
  };
}

