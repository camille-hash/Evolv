import type { ContractBidComposition } from "./contract-timeline-types";

export function calculateBidSnapshot(input: {
  cashAmount: number;
  creditBaseAmount: number;
  embeddedAmount: number;
}) {
  const totalAmount = round(input.cashAmount + input.embeddedAmount, 2);
  return {
    cashPercentage: percentage(input.cashAmount, input.creditBaseAmount),
    embeddedPercentage: percentage(
      input.embeddedAmount,
      input.creditBaseAmount,
    ),
    totalAmount,
    totalPercentage: percentage(totalAmount, input.creditBaseAmount),
  };
}

export function isValidBidComposition(input: {
  cashAmount: number;
  composition: ContractBidComposition;
  embeddedAmount: number;
}) {
  if (input.cashAmount < 0 || input.embeddedAmount < 0) return false;
  if (input.composition === "cash") {
    return input.cashAmount > 0 && input.embeddedAmount === 0;
  }
  if (input.composition === "embedded") {
    return input.embeddedAmount > 0 && input.cashAmount === 0;
  }
  return input.cashAmount > 0 && input.embeddedAmount > 0;
}

function percentage(value: number, base: number) {
  return base > 0 ? round((value / base) * 100, 4) : null;
}

function round(value: number, decimals: number) {
  const multiplier = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}
