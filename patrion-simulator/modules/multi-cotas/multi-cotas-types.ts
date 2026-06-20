export type MultiCotasCardInput = {
  id: string;
  position: number;
  originalValue: number;
  contemplationMonth: number;
  withdrawalMonth: number;
};

export type MultiCotasInput = {
  cardCount: number;
  baseCardValue: number;
  termMonths: number;
  sharedContemplationMonth: number;
  annualInccPercent: number;
  monthlyIdleAppreciationPercent: number;
  consolidationMonth: number;
  cards: MultiCotasCardInput[];
};

export type MultiCotasCardResult = MultiCotasCardInput & {
  inccAdjustmentCount: number;
  updatedCredit: number;
  commercialCredit: number;
  idleMonths: number;
  futureValue: number;
  inccGain: number;
  idleAppreciationGain: number;
  estimatedGain: number;
  estimatedGainRate: number;
};

export type MultiCotasSummary = {
  totalOriginalContracted: number;
  totalUpdatedCredit: number;
  totalFutureValue: number;
  totalInccGain: number;
  totalIdleAppreciationGain: number;
  cardCount: number;
};

export type MultiCotasResult = {
  cards: MultiCotasCardResult[];
  summary: MultiCotasSummary;
};
