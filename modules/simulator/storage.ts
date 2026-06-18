import type { BidType, InsuranceOption } from "@/modules/simulator/presentation";
import type { SimulatorScenarioKey } from "@/modules/simulator/engine";
import type { SimulatorCommercialPresentation } from "@/modules/simulator/presentation";
import {
  createDefaultSavedAdministratorData,
  type SimulatorSavedAdministratorData,
} from "@/modules/simulator/administrators";

export const SIMULATOR_STORAGE_KEY = "evolv.simulations.v1";

export type SimulatorSavedFormState = {
  credit: string;
  administrativeFeePercent: string;
  reserveFundPercent: string;
  termMonths: string;
  monthlyInsurancePercent: string;
  inccPercent: string;
  cardSalePercent: string;
  embeddedBidPercent: string;
  cashBidPercent: string;
};

export type SimulatorSavedResultSnapshot = {
  installmentBeforeContemplation: number;
  installmentAfterContemplation: number;
  estimatedCardSaleValue: number;
  estimatedCardSaleProfit: number;
  estimatedCardSaleGainRate: number;
  leverageMultiple: number;
  contractedCredit: number;
  updatedCredit: number;
  selectedScenarioName: string;
};

export type SimulatorCommercialData = {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  consultantName: string;
  commercialNotes: string;
};

export type SimulatorSavedDraft = {
  name: string;
  formState: SimulatorSavedFormState;
  commercialData: SimulatorCommercialData;
  administratorData: SimulatorSavedAdministratorData;
  selectedScenarioKey: SimulatorScenarioKey;
  insuranceOption: InsuranceOption;
  contemplationMonth: number;
  bidType: BidType;
  sourceSimulationId?: string;
  sourceProposalLabel?: string;
};

export type SimulatorSavedSimulation = SimulatorSavedDraft & {
  id: string;
  createdAt: string;
  updatedAt: string;
  results: SimulatorSavedResultSnapshot;
};

export function loadSavedSimulations(): SimulatorSavedSimulation[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  const rawValue = window.localStorage.getItem(SIMULATOR_STORAGE_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map(normalizeSavedSimulation)
      .filter((simulation): simulation is SimulatorSavedSimulation =>
        Boolean(simulation),
      )
      .sort((first, second) =>
        second.updatedAt.localeCompare(first.updatedAt),
      );
  } catch {
    return [];
  }
}

export function saveSimulation({
  id,
  draft,
  presentation,
}: {
  id?: string | null;
  draft: SimulatorSavedDraft;
  presentation: SimulatorCommercialPresentation;
}) {
  const simulations = loadSavedSimulations();
  const now = new Date().toISOString();
  const existingSimulation = id
    ? simulations.find((simulation) => simulation.id === id)
    : undefined;
  const simulationName = normalizeSimulationName(draft.name, now);
  const savedSimulation: SimulatorSavedSimulation = {
    ...draft,
    name: simulationName,
    id: existingSimulation?.id ?? createSimulationId(),
    createdAt: existingSimulation?.createdAt ?? now,
    updatedAt: now,
    results: createResultSnapshot(presentation),
  };
  const nextSimulations = existingSimulation
    ? simulations.map((simulation) =>
        simulation.id === existingSimulation.id ? savedSimulation : simulation,
      )
    : [savedSimulation, ...simulations];

  persistSimulations(nextSimulations);

  return savedSimulation;
}

export function deleteSimulation(id: string) {
  const simulations = loadSavedSimulations().filter(
    (simulation) => simulation.id !== id,
  );

  persistSimulations(simulations);

  return simulations;
}

export function duplicateSimulation(id: string) {
  const simulations = loadSavedSimulations();
  const sourceSimulation = simulations.find(
    (simulation) => simulation.id === id,
  );

  if (!sourceSimulation) {
    return null;
  }

  const now = new Date().toISOString();
  const duplicatedSimulation: SimulatorSavedSimulation = {
    ...sourceSimulation,
    id: createSimulationId(),
    name: `${sourceSimulation.name} (copia)`,
    createdAt: now,
    updatedAt: now,
  };
  const nextSimulations = [duplicatedSimulation, ...simulations];

  persistSimulations(nextSimulations);

  return duplicatedSimulation;
}

export function createResultSnapshot(
  presentation: SimulatorCommercialPresentation,
): SimulatorSavedResultSnapshot {
  return {
    installmentBeforeContemplation:
      presentation.installmentBeforeContemplation,
    installmentAfterContemplation:
      presentation.installmentAfterContemplation,
    estimatedCardSaleValue: presentation.estimatedCardSaleValue,
    estimatedCardSaleProfit: presentation.estimatedCardSaleProfit,
    estimatedCardSaleGainRate: presentation.estimatedCardSaleGainRate,
    leverageMultiple: presentation.leverageMultiple,
    contractedCredit: presentation.contractedCredit,
    updatedCredit: presentation.updatedCredit,
    selectedScenarioName: presentation.selectedScenarioName,
  };
}

export function createEmptyCommercialData(): SimulatorCommercialData {
  return {
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    consultantName: "",
    commercialNotes: "",
  };
}

function persistSimulations(simulations: SimulatorSavedSimulation[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    SIMULATOR_STORAGE_KEY,
    JSON.stringify(simulations),
  );
}

function normalizeSimulationName(name: string, isoDate: string) {
  const trimmedName = name.trim();

  if (trimmedName) {
    return trimmedName;
  }

  return `Simulacao ${formatSimulationDate(isoDate)}`;
}

export function formatSimulationDate(isoDate: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

function createSimulationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function normalizeSavedSimulation(
  value: unknown,
): SimulatorSavedSimulation | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const simulation = value as Partial<SimulatorSavedSimulation>;

  if (
    !simulation.id ||
    !simulation.name ||
    !simulation.createdAt ||
    !simulation.updatedAt ||
    !simulation.formState ||
    !simulation.results
  ) {
    return null;
  }

  return {
    ...simulation,
    results: normalizeResultSnapshot(simulation.results),
    commercialData: normalizeCommercialData(simulation.commercialData),
    administratorData: normalizeAdministratorData(
      simulation.administratorData,
    ),
  } as SimulatorSavedSimulation;
}

function normalizeResultSnapshot(
  value: Partial<SimulatorSavedResultSnapshot>,
): SimulatorSavedResultSnapshot {
  return {
    ...value,
    updatedCredit: value.updatedCredit ?? value.contractedCredit ?? 0,
  } as SimulatorSavedResultSnapshot;
}

function normalizeCommercialData(
  value: Partial<SimulatorCommercialData> | undefined,
): SimulatorCommercialData {
  return {
    ...createEmptyCommercialData(),
    ...(value ?? {}),
  };
}

function normalizeAdministratorData(
  value: SimulatorSavedAdministratorData | undefined,
): SimulatorSavedAdministratorData {
  return value ?? createDefaultSavedAdministratorData();
}
