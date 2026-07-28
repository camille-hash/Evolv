export function calculateContractBidOfferSnapshot(input: {
  cashAmount: number;
  creditBaseAmount: number;
  embeddedAmount: number;
}) {
  const totalAmount = round(input.cashAmount + input.embeddedAmount, 2);
  const percentage = (amount: number) =>
    input.creditBaseAmount > 0
      ? round((amount / input.creditBaseAmount) * 100, 4)
      : undefined;

  return {
    cashPercentage: percentage(input.cashAmount),
    embeddedPercentage: percentage(input.embeddedAmount),
    estimatedNetCredit: round(
      input.creditBaseAmount - input.embeddedAmount,
      2,
    ),
    totalAmount,
    totalPercentage: percentage(totalAmount),
  };
}

export function buildContractBidOfferFileName(input: {
  assemblyLabel: string;
  clientName: string;
  version: number;
}) {
  return `estrategia-lance-${safe(input.clientName)}-${safe(input.assemblyLabel)}-v${input.version}.pdf`;
}

export function buildContractBidOfferStoragePath(input: {
  assemblyId: string;
  contractId: string;
  fileName: string;
  offerId: string;
  organizationId: string;
  version: number;
}) {
  return [
    input.organizationId,
    input.contractId,
    input.assemblyId,
    input.offerId,
    `v${input.version}`,
    input.fileName,
  ].join("/");
}

export function isValidContractBidOfferTransition(
  current: string,
  next: string,
) {
  return (
    (current === "generated" && next === "sent") ||
    (current === "sent" && ["approved", "rejected"].includes(next)) ||
    (current === "approved" && next === "submitted") ||
    (["draft", "generated", "sent"].includes(current) &&
      ["cancelled", "expired"].includes(next))
  );
}

function safe(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "nao-informado"
  );
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
