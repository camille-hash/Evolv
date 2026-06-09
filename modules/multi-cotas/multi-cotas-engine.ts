import type {
  MultiCotasCardInput,
  MultiCotasInput,
  MultiCotasResult,
} from "@/modules/multi-cotas/multi-cotas-types";

export const MIN_MULTI_COTAS_CARDS = 2;
export const MAX_MULTI_COTAS_CARDS = 30;

export const defaultMultiCotasInput: MultiCotasInput = normalizeMultiCotasInput({
  cardCount: 5,
  baseCardValue: 200000,
  termMonths: 197,
  annualInccPercent: 6,
  monthlyIdleAppreciationPercent: 0.8,
  consolidationMonth: 63,
  cards: [
    createMultiCotasCard(1, 200000, 13, 197),
    createMultiCotasCard(2, 200000, 26, 197),
    createMultiCotasCard(3, 200000, 27, 197),
    createMultiCotasCard(4, 200000, 48, 197),
    createMultiCotasCard(5, 200000, 63, 197),
  ],
});

export function calculateMultiCotas(input: MultiCotasInput): MultiCotasResult {
  const normalizedInput = normalizeMultiCotasInput(input);
  const annualInccRate = normalizedInput.annualInccPercent / 100;
  const monthlyIdleAppreciationRate =
    normalizedInput.monthlyIdleAppreciationPercent / 100;
  const cards = normalizedInput.cards.map((card) => {
    const inccAdjustmentCount = calculateMultiCotasInccAdjustmentCount(
      card.contemplationMonth,
    );
    const updatedCredit =
      card.originalValue * Math.pow(1 + annualInccRate, inccAdjustmentCount);
    const idleMonths = Math.max(
      0,
      card.withdrawalMonth - card.contemplationMonth,
    );
    const futureValue =
      updatedCredit * Math.pow(1 + monthlyIdleAppreciationRate, idleMonths);

    return {
      ...card,
      inccAdjustmentCount,
      updatedCredit,
      idleMonths,
      futureValue,
      inccGain: updatedCredit - card.originalValue,
      idleAppreciationGain: futureValue - updatedCredit,
    };
  });
  const summary = cards.reduce(
    (totals, card) => ({
      totalOriginalContracted:
        totals.totalOriginalContracted + card.originalValue,
      totalUpdatedCredit: totals.totalUpdatedCredit + card.updatedCredit,
      totalFutureValue: totals.totalFutureValue + card.futureValue,
      totalInccGain: totals.totalInccGain + card.inccGain,
      totalIdleAppreciationGain:
        totals.totalIdleAppreciationGain + card.idleAppreciationGain,
      cardCount: cards.length,
    }),
    {
      totalOriginalContracted: 0,
      totalUpdatedCredit: 0,
      totalFutureValue: 0,
      totalInccGain: 0,
      totalIdleAppreciationGain: 0,
      cardCount: cards.length,
    },
  );

  return {
    cards,
    summary,
  };
}

export function normalizeMultiCotasInput(
  input: MultiCotasInput,
): MultiCotasInput {
  const cardCount = clampInteger(
    input.cardCount,
    MIN_MULTI_COTAS_CARDS,
    MAX_MULTI_COTAS_CARDS,
  );
  const termMonths = Math.max(1, Math.trunc(input.termMonths || 1));
  const baseCardValue = Math.max(0, input.baseCardValue || 0);
  const existingCards = Array.isArray(input.cards) ? input.cards : [];
  const cards = Array.from({ length: cardCount }, (_, index) => {
    const position = index + 1;
    const existingCard = existingCards[index];

    return normalizeMultiCotasCard({
      id: existingCard?.id ?? createMultiCotasCardId(position),
      position,
      originalValue: existingCard?.originalValue ?? baseCardValue,
      contemplationMonth:
        existingCard?.contemplationMonth ?? Math.min(termMonths, position * 12),
      withdrawalMonth: existingCard?.withdrawalMonth ?? termMonths,
    }, termMonths);
  });

  return {
    cardCount,
    baseCardValue,
    termMonths,
    annualInccPercent: Math.max(0, input.annualInccPercent || 0),
    monthlyIdleAppreciationPercent: Math.max(
      0,
      input.monthlyIdleAppreciationPercent || 0,
    ),
    consolidationMonth: clampInteger(input.consolidationMonth, 1, termMonths),
    cards,
  };
}

export function calculateMultiCotasInccAdjustmentCount(
  contemplationMonth: number,
) {
  return Math.floor((Math.max(1, Math.trunc(contemplationMonth)) - 1) / 12);
}

export function createMultiCotasCard(
  position: number,
  originalValue: number,
  contemplationMonth: number,
  withdrawalMonth: number,
): MultiCotasCardInput {
  return {
    id: createMultiCotasCardId(position),
    position,
    originalValue,
    contemplationMonth,
    withdrawalMonth,
  };
}

function normalizeMultiCotasCard(
  card: MultiCotasCardInput,
  termMonths: number,
): MultiCotasCardInput {
  const contemplationMonth = clampInteger(card.contemplationMonth, 1, termMonths);
  const withdrawalMonth = clampInteger(
    card.withdrawalMonth || termMonths,
    contemplationMonth,
    termMonths,
  );

  return {
    ...card,
    originalValue: Math.max(0, card.originalValue || 0),
    contemplationMonth,
    withdrawalMonth,
  };
}

function clampInteger(value: number, min: number, max: number) {
  return Math.min(Math.max(min, Math.trunc(value || min)), max);
}

function createMultiCotasCardId(position: number) {
  return `multi-cotas-card-${position}`;
}
