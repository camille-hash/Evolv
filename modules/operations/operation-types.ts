import type {
  BidType,
  InsuranceOption,
  SimulatorCommercialData,
  SimulatorSavedAdministratorData,
  SimulatorSavedFormState,
  SimulatorSavedResultSnapshot,
  SimulatorScenarioKey,
} from "@/modules/simulator";

export type OperationStatus = "active" | "paused" | "completed";

export type OperationType = "consortium" | "custom";

export type OperationSimulationState = {
  formState: SimulatorSavedFormState;
  commercialData: SimulatorCommercialData;
  administratorData: SimulatorSavedAdministratorData;
  selectedScenarioKey: SimulatorScenarioKey;
  insuranceOption: InsuranceOption;
  contemplationMonth: number;
  bidType: BidType;
};

export type OperationSimulationSnapshot = {
  cenario: string;
  contemplacao: number;
  parcela: number;
  posContemplacao: number;
  lucro: number;
  ganho: number;
  alavancagem: number;
};

export type Operation = OperationSimulationState & {
  id: string;
  nome: string;
  administradora: string;
  credito: number;
  tipoOperacao: OperationType;
  status: OperationStatus;
  createdAt: string;
  updatedAt: string;
  snapshot: OperationSimulationSnapshot;
  results: SimulatorSavedResultSnapshot;
  strategyId?: string | null;
};

export type OperationDraft = OperationSimulationState & {
  id?: string | null;
  nome: string;
  tipoOperacao?: OperationType;
  status?: OperationStatus;
  createdAt?: string;
};

export type OperationsSummary = {
  activeOperationsCount: number;
  potentialPatrimony: number;
  totalContractedCredit: number;
};

