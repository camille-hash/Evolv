import type { CommercialProposal } from "./types";

export type CommercialProposalLineage = {
  current: CommercialProposal;
  versions: CommercialProposal[];
};

export type CommercialProposalV1Presentation = {
  administrator: string | null;
  adjustment: string | null;
  commercialConditions: string[];
  contemplation: string | null;
  firstAdjustmentInstallment: number | null;
  groupCode: string | null;
  insurance: string | null;
  items: Array<{
    catalogCode: string | null;
    credit: number;
    label: string;
    phaseAmounts: Array<number | null>;
  }>;
  modelCode: string | null;
  product: string | null;
  termMonths: number | null;
  totalCredit: number | null;
  totalPhaseAmounts: Array<number | null>;
};

const presentationPhaseRanges = [[1, 12], [13, 24], [25, 216]] as const;

export function groupCommercialProposalLineages(
  proposals: CommercialProposal[],
): CommercialProposalLineage[] {
  const byRoot = new Map<string, CommercialProposal[]>();

  for (const proposal of proposals) {
    const rootId = proposal.rootProposalId || proposal.id;
    byRoot.set(rootId, [...(byRoot.get(rootId) ?? []), proposal]);
  }

  return [...byRoot.values()]
    .map((versions) => {
      const orderedVersions = [...versions].sort(compareProposalVersions);
      return { current: orderedVersions[0], versions: orderedVersions };
    })
    .sort((first, second) => compareProposalDates(first.current, second.current));
}

export function getCommercialProposalStatusLabel(
  status: CommercialProposal["status"],
) {
  const labels: Record<CommercialProposal["status"], string> = {
    approval_revoked: "Aprovação revogada",
    approved: "Aprovada",
    draft: "Rascunho",
    expired: "Expirada",
    generated: "Aguardando aprovação",
    presented: "Apresentada",
    rejected: "Rejeitada",
    saved: "Salva",
    superseded: "Substituída",
  };
  return labels[status];
}

export function readCommercialProposalProduct(proposal: CommercialProposal) {
  const product = readObject(proposal.savedSnapshot.product);
  return readText(product?.displayName) ?? readText(product?.productKey) ?? "—";
}

export function readCommercialProposalTotalCredit(proposal: CommercialProposal) {
  const strategy = readObject(proposal.savedSnapshot.strategy);
  const totalCredit = readObject(strategy?.totalCredit);
  const cents = readFiniteNumber(totalCredit?.amountCents);
  if (cents !== null) return cents / 100;

  const summaryCents = readFiniteNumber(proposal.summary.totalCreditCents);
  if (summaryCents !== null) return summaryCents / 100;

  return readFiniteNumber(proposal.summary.commercialCredit);
}

export function readCommercialProposalQuotaCount(proposal: CommercialProposal) {
  const strategy = readObject(proposal.savedSnapshot.strategy);
  return (
    readFiniteNumber(strategy?.quotaCount) ??
    readFiniteNumber(proposal.summary.quotaCount)
  );
}

export function isFormalCommercialProposalV1(proposal: CommercialProposal) {
  return proposal.savedSnapshot.schemaVersion === "commercial-proposal/v1";
}

export function projectCommercialProposalV1(
  proposal: CommercialProposal,
): CommercialProposalV1Presentation | null {
  if (!isFormalCommercialProposalV1(proposal)) return null;
  const snapshot = proposal.savedSnapshot;
  const product = readObject(snapshot.product);
  const strategy = readObject(snapshot.strategy);
  const composition = Array.isArray(snapshot.composition) ? snapshot.composition : [];
  const firstItem = readObject(composition[0]);
  const insurance = readObject(firstItem?.insurance);
  const adjustment = readObject(firstItem?.adjustment);
  const contemplation = readObject(firstItem?.contemplation);
  const terms = readObject(snapshot.commercialTerms);
  const conditions = Array.isArray(terms?.conditions)
    ? terms.conditions.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];

  const items = composition.flatMap((value, index) => {
    const item = readObject(value);
    const credit = readObject(item?.credit);
    const creditCents = readFiniteNumber(credit?.amountCents);
    if (!item || creditCents === null) return [];
    return [{
      catalogCode: readText(item.commercialCatalogCode),
      credit: creditCents / 100,
      label: readText(item.displayLabel) ?? `Cota comercial ${index + 1}`,
      phaseAmounts: presentationPhaseRanges.map(([start, end]) =>
        readInstallmentAmountForRange(item.installmentPhases, start, end),
      ),
    }];
  });

  const consolidated = readObject(strategy);
  return {
    administrator: readText(product?.administratorDisplayName),
    adjustment: readText(adjustment?.index),
    commercialConditions: conditions,
    contemplation:
      contemplation?.isGuarantee === false
        ? "A contemplação não é garantida e depende das regras do grupo."
        : null,
    firstAdjustmentInstallment: readFiniteNumber(adjustment?.firstAdjustmentInstallment),
    groupCode: readText(product?.groupCode),
    insurance:
      typeof insurance?.included === "boolean"
        ? insurance.included ? "Incluído" : "Não incluído"
        : null,
    items,
    modelCode: readText(product?.modelCode),
    product: readText(product?.displayName),
    termMonths: readFiniteNumber(product?.termMonths),
    totalCredit: readCommercialProposalTotalCredit(proposal),
    totalPhaseAmounts: presentationPhaseRanges.map(([start, end]) =>
      readInstallmentAmountForRange(consolidated?.consolidatedInstallmentPhases, start, end),
    ),
  };
}

function compareProposalVersions(
  first: CommercialProposal,
  second: CommercialProposal,
) {
  return second.version - first.version || compareProposalDates(first, second);
}

function compareProposalDates(first: CommercialProposal, second: CommercialProposal) {
  return (
    new Date(second.updatedAt || second.createdAt).getTime() -
    new Date(first.updatedAt || first.createdAt).getTime()
  );
}

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readFiniteNumber(value: unknown) {
  const number = typeof value === "string" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
}

function readInstallmentAmountForRange(value: unknown, start: number, end: number) {
  if (!Array.isArray(value)) return null;
  const phase = value.map(readObject).find((item) =>
    item?.startInstallment === start && item?.endInstallment === end,
  );
  const amount = readObject(phase?.installmentAmount);
  const cents = readFiniteNumber(amount?.amountCents);
  return cents === null ? null : cents / 100;
}
