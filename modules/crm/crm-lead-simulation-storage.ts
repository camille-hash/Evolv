import type { SimulatorSavedSimulation } from "@/modules/simulator";

const CRM_LEAD_SIMULATIONS_STORAGE_KEY = "evolv.crm.lead-simulations.v1";

export type CrmLeadSimulationStatus =
  | "apresentada"
  | "descartada"
  | "escolhida";

export type CrmLeadSimulationRecord = {
  id: string;
  leadId: string;
  simulationId: string;
  simulationName: string;
  simulationDate: string;
  credit: number;
  installment: number;
  scenario: string;
  administrator: string;
  notes: string;
  status: CrmLeadSimulationStatus;
  createdAt: string;
};

export function loadCrmLeadSimulations(
  leadId?: string,
): CrmLeadSimulationRecord[] {
  return loadLeadSimulationCollection()
    .filter((record) => !leadId || record.leadId === leadId)
    .sort(sortByCreatedAtAsc);
}

export function addCrmLeadSimulation(input: {
  leadId: string;
  notes: string;
  simulation: SimulatorSavedSimulation;
  status: CrmLeadSimulationStatus;
}) {
  const records = loadLeadSimulationCollection();
  const nextRecord: CrmLeadSimulationRecord = {
    id: createRecordId(),
    leadId: input.leadId,
    simulationId: input.simulation.id,
    simulationName: input.simulation.name,
    simulationDate: input.simulation.updatedAt,
    credit: input.simulation.results.updatedCredit,
    installment: input.simulation.results.installmentBeforeContemplation,
    scenario: input.simulation.results.selectedScenarioName,
    administrator:
      input.simulation.administratorData.selectedAdministratorName ||
      "Administradora nao informada",
    notes: input.notes.trim(),
    status: input.status,
    createdAt: new Date().toISOString(),
  };
  const nextRecords = normalizeChosenSimulation([
    nextRecord,
    ...records,
  ], input.leadId);

  saveLeadSimulationCollection(nextRecords);

  return loadCrmLeadSimulations(input.leadId);
}

export function updateCrmLeadSimulationStatus(input: {
  leadId: string;
  recordId: string;
  status: CrmLeadSimulationStatus;
}) {
  const records = loadLeadSimulationCollection().map((record) =>
    record.id === input.recordId && record.leadId === input.leadId
      ? { ...record, status: input.status }
      : record,
  );
  const nextRecords = normalizeChosenSimulation(records, input.leadId);

  saveLeadSimulationCollection(nextRecords);

  return loadCrmLeadSimulations(input.leadId);
}

function normalizeChosenSimulation(
  records: CrmLeadSimulationRecord[],
  leadId: string,
) {
  const chosenRecord = records.find(
    (record) => record.leadId === leadId && record.status === "escolhida",
  );

  if (!chosenRecord) {
    return records;
  }

  return records.map((record) =>
    record.leadId === leadId &&
    record.id !== chosenRecord.id &&
    record.status === "escolhida"
      ? { ...record, status: "apresentada" as const }
      : record,
  );
}

function loadLeadSimulationCollection() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(
      CRM_LEAD_SIMULATIONS_STORAGE_KEY,
    );

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map(normalizeLeadSimulationRecord)
      .filter((record): record is CrmLeadSimulationRecord => Boolean(record));
  } catch {
    return [];
  }
}

function saveLeadSimulationCollection(records: CrmLeadSimulationRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    CRM_LEAD_SIMULATIONS_STORAGE_KEY,
    JSON.stringify(records),
  );
}

function normalizeLeadSimulationRecord(
  value: unknown,
): CrmLeadSimulationRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<CrmLeadSimulationRecord>;

  if (
    !candidate.leadId ||
    !candidate.simulationId ||
    !candidate.simulationName ||
    !candidate.createdAt
  ) {
    return null;
  }

  return {
    id: candidate.id ?? createRecordId(),
    leadId: candidate.leadId,
    simulationId: candidate.simulationId,
    simulationName: candidate.simulationName,
    simulationDate: candidate.simulationDate ?? candidate.createdAt,
    credit: normalizeNumber(candidate.credit),
    installment: normalizeNumber(candidate.installment),
    scenario: candidate.scenario ?? "Cenario nao informado",
    administrator: candidate.administrator ?? "Administradora nao informada",
    notes: candidate.notes ?? "",
    status: normalizeLeadSimulationStatus(candidate.status),
    createdAt: candidate.createdAt,
  };
}

function normalizeLeadSimulationStatus(
  status: CrmLeadSimulationStatus | undefined,
): CrmLeadSimulationStatus {
  return status === "descartada" || status === "escolhida"
    ? status
    : "apresentada";
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function sortByCreatedAtAsc(
  left: { createdAt: string },
  right: { createdAt: string },
) {
  return (
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}

function createRecordId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
