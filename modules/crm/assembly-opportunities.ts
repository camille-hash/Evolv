export const assemblyOpportunityRuleCode = "ASSEMBLY_D_MINUS_10" as const;
export const assemblyOpportunityTimeZone = "America/Sao_Paulo";

export type AssemblyOpportunityPriority = "critical" | "high" | "medium";

export type AssemblyOpportunity = {
  administratorName: string;
  assemblyDate: string;
  assemblyId: string;
  clientId?: string;
  clientName: string;
  contractId: string;
  contractName: string;
  creditAmount: number;
  daysUntilAssembly: number;
  description: string;
  groupNumber?: string;
  id: string;
  offerId?: string;
  offerStatus?: string;
  priority: AssemblyOpportunityPriority;
  quotaNumber?: string;
  recommendedAction: string;
  ruleCode: typeof assemblyOpportunityRuleCode;
  title: string;
  workspaceHref: string;
};

export type AssemblyOpportunityCandidate = {
  administratorName: string;
  assemblyDate: string;
  assemblyId: string;
  assemblyStatus: string;
  bidResults: string[];
  clientId?: string;
  clientName: string;
  contractId: string;
  contractName: string;
  contractStatus: string;
  creditAmount: number;
  groupNumber?: string;
  offerId?: string;
  offerStatus?: string;
  quotaNumber?: string;
};

const blockingBidResults = new Set([
  "submitted",
  "approved_by_client",
  "rejected_by_client",
  "not_contemplated",
  "contemplated",
  "cancelled",
]);

export function buildAssemblyOpportunities(
  candidates: AssemblyOpportunityCandidate[],
  now = new Date(),
): AssemblyOpportunity[] {
  return candidates
    .map((candidate) => buildAssemblyOpportunity(candidate, now))
    .filter((item): item is AssemblyOpportunity => item !== null)
    .sort(compareAssemblyOpportunities);
}

export function buildAssemblyOpportunity(
  candidate: AssemblyOpportunityCandidate,
  now = new Date(),
): AssemblyOpportunity | null {
  const daysUntilAssembly = calculateDaysUntilAssembly(
    candidate.assemblyDate,
    now,
  );

  if (
    candidate.contractStatus !== "active" ||
    !["scheduled", "postponed"].includes(candidate.assemblyStatus) ||
    daysUntilAssembly === null ||
    daysUntilAssembly < 0 ||
    daysUntilAssembly > 10 ||
    candidate.bidResults.some((result) => blockingBidResults.has(result))
  ) {
    return null;
  }

  return {
    administratorName: candidate.administratorName,
    assemblyDate: candidate.assemblyDate,
    assemblyId: candidate.assemblyId,
    clientId: candidate.clientId,
    clientName: candidate.clientName,
    contractId: candidate.contractId,
    contractName: candidate.contractName,
    creditAmount: candidate.creditAmount,
    daysUntilAssembly,
    description:
      "Nenhuma estratégia de lance foi registrada para esta assembleia.",
    groupNumber: candidate.groupNumber,
    id: `${assemblyOpportunityRuleCode}:${candidate.assemblyId}`,
    offerId: candidate.offerId,
    offerStatus: candidate.offerStatus,
    priority: resolveAssemblyOpportunityPriority(daysUntilAssembly),
    quotaNumber: candidate.quotaNumber,
    recommendedAction: resolveRecommendedAction(candidate.offerStatus),
    ruleCode: assemblyOpportunityRuleCode,
    title:
      daysUntilAssembly === 0
        ? "Assembleia hoje"
        : `Assembleia em ${daysUntilAssembly} dias`,
    workspaceHref: `/operations/contracts/${encodeURIComponent(candidate.contractId)}?origin=my-day`,
  };
}

function resolveRecommendedAction(status?: string) {
  if (status === "draft") return "Continuar oferta.";
  if (status === "generated") return "Enviar ao cliente.";
  if (status === "sent") return "Aguardando cliente.";
  if (status === "approved") return "Registrar envio do lance.";
  return "Preparar estratégia de lance.";
}

export function calculateDaysUntilAssembly(
  assemblyDate: string,
  now = new Date(),
) {
  const assembly = new Date(assemblyDate);

  if (Number.isNaN(assembly.getTime())) {
    return null;
  }

  const todayKey = formatDateKey(now);
  const assemblyKey = formatDateKey(assembly);
  const todayUtc = dateKeyToUtc(todayKey);
  const assemblyUtc = dateKeyToUtc(assemblyKey);

  return Math.round((assemblyUtc - todayUtc) / 86_400_000);
}

export function resolveAssemblyOpportunityPriority(
  daysUntilAssembly: number,
): AssemblyOpportunityPriority {
  if (daysUntilAssembly <= 1) return "critical";
  if (daysUntilAssembly <= 5) return "high";
  return "medium";
}

export function compareAssemblyOpportunities(
  first: AssemblyOpportunity,
  second: AssemblyOpportunity,
) {
  return (
    first.daysUntilAssembly - second.daysUntilAssembly ||
    second.creditAmount - first.creditAmount ||
    first.clientName.localeCompare(second.clientName, "pt-BR") ||
    first.assemblyId.localeCompare(second.assemblyId)
  );
}

function formatDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: assemblyOpportunityTimeZone,
    year: "numeric",
  }).formatToParts(value);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${read("year")}-${read("month")}-${read("day")}`;
}

function dateKeyToUtc(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}
