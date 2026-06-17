import type { CrmLead } from "./crm-types";

export type CrmCommercialSignal =
  | "hot"
  | "warm"
  | "cold"
  | "abandoned"
  | "unknown";

export type CrmCommercialSignalFilter = CrmCommercialSignal | "all";

export type CrmLeadCommercialSignal = {
  daysSinceUpdate: number | null;
  label: string;
  signal: CrmCommercialSignal;
  summary: string;
};

export const crmCommercialSignalLabels: Record<CrmCommercialSignal, string> = {
  abandoned: "Abandonado",
  cold: "Frio",
  hot: "Quente",
  unknown: "Sem sinal",
  warm: "Morno",
};

export function resolveCrmLeadCommercialSignal(
  lead: Pick<CrmLead, "updatedAt">,
  now = new Date(),
): CrmLeadCommercialSignal {
  const daysSinceUpdate = getDaysSince(lead.updatedAt, now);

  if (daysSinceUpdate === null) {
    return buildSignal("unknown", null);
  }

  if (daysSinceUpdate <= 7) {
    return buildSignal("hot", daysSinceUpdate);
  }

  if (daysSinceUpdate <= 21) {
    return buildSignal("warm", daysSinceUpdate);
  }

  if (daysSinceUpdate <= 45) {
    return buildSignal("cold", daysSinceUpdate);
  }

  return buildSignal("abandoned", daysSinceUpdate);
}

export function buildCrmCommercialSignalSummary(
  leads: CrmLead[],
  now = new Date(),
) {
  const activeLeads = leads.filter((lead) => lead.status === "ativa");

  return activeLeads.reduce(
    (summary, lead) => {
      const signal = resolveCrmLeadCommercialSignal(lead, now).signal;

      return {
        abandoned:
          summary.abandoned + (signal === "abandoned" ? 1 : 0),
        cold: summary.cold + (signal === "cold" ? 1 : 0),
        hot: summary.hot + (signal === "hot" ? 1 : 0),
      };
    },
    {
      abandoned: 0,
      cold: 0,
      hot: 0,
    },
  );
}

function buildSignal(
  signal: CrmCommercialSignal,
  daysSinceUpdate: number | null,
): CrmLeadCommercialSignal {
  return {
    daysSinceUpdate,
    label: crmCommercialSignalLabels[signal],
    signal,
    summary:
      daysSinceUpdate === null
        ? "Sem data confiavel"
        : `Atualizado ha ${daysSinceUpdate} ${daysSinceUpdate === 1 ? "dia" : "dias"}`,
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
