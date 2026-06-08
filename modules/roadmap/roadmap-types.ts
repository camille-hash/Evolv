import type { ClientContext } from "@/modules/client-context";
import type { Operation } from "@/modules/operations";
import type { Strategy } from "@/modules/strategies";
import type { WealthEvolutionInput } from "@/modules/wealth";

export type RoadmapStepStatus = "completed" | "active" | "planned";

export type RoadmapStepKind = "today" | "operation" | "goal";

export type RoadmapStep = {
  id: string;
  kind: RoadmapStepKind;
  nome: string;
  credito: number;
  administradora: string;
  objetivo: string;
  status: RoadmapStepStatus;
};

export type RoadmapFinalGoal = {
  metaPatrimonial: number;
  metaRenda: number;
  prazo: number;
};

export type StrategicRoadmap = {
  steps: RoadmapStep[];
  finalGoal: RoadmapFinalGoal;
  nextStep: RoadmapStep | null;
  activeStrategyName: string;
};

export type StrategicRoadmapInput = {
  clientContext: ClientContext;
  operations: Operation[];
  activeStrategy: Strategy | null;
  wealthInput: WealthEvolutionInput;
};

