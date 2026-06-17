import type { CrmLead } from "./crm-types";

export type CrmOperationalAging = "fresh" | "attention" | "stale" | "unknown";

export type CrmLeadOperationalAging = {
  aging: CrmOperationalAging;
  daysSinceMovement: number | null;
  label: string;
  summary: string;
};

export const crmOperationalAgingLabels: Record<CrmOperationalAging, string> = {
  attention: "3 a 5 dias sem movimentacao",
  fresh: "0 a 2 dias sem movimentacao",
  stale: "6+ dias sem movimentacao",
  unknown: "Sem data confiavel",
};

export function resolveCrmLeadOperationalAging(
  lead: Pick<CrmLead, "updatedAt">,
  now = new Date(),
): CrmLeadOperationalAging {
  const daysSinceMovement = getDaysSince(lead.updatedAt, now);

  if (daysSinceMovement === null) {
    return buildAging("unknown", null);
  }

  if (daysSinceMovement <= 2) {
    return buildAging("fresh", daysSinceMovement);
  }

  if (daysSinceMovement <= 5) {
    return buildAging("attention", daysSinceMovement);
  }

  return buildAging("stale", daysSinceMovement);
}

function buildAging(
  aging: CrmOperationalAging,
  daysSinceMovement: number | null,
): CrmLeadOperationalAging {
  return {
    aging,
    daysSinceMovement,
    label: crmOperationalAgingLabels[aging],
    summary:
      daysSinceMovement === null
        ? "Tempo sem movimentacao: sem data confiavel."
        : `Tempo sem movimentacao: ${daysSinceMovement} ${
            daysSinceMovement === 1 ? "dia" : "dias"
          }.`,
  };
}

function getDaysSince(value: string, now: Date) {
  const updatedAt = new Date(value);

  if (!Number.isFinite(updatedAt.getTime()) || !Number.isFinite(now.getTime())) {
    return null;
  }

  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const updatedUtc = Date.UTC(
    updatedAt.getUTCFullYear(),
    updatedAt.getUTCMonth(),
    updatedAt.getUTCDate(),
  );
  const differenceInDays = Math.floor(
    (todayUtc - updatedUtc) / 86_400_000,
  );

  return Math.max(0, differenceInDays);
}
