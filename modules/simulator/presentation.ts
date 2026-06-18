import type {
  SimulatorCalculationResult,
  SimulatorInput,
  SimulatorScenarioKey,
  SimulatorScenarioResult,
} from "@/modules/simulator/engine";

export type InsuranceOption = "with-insurance" | "without-insurance";
export type BidType = "none" | "embedded" | "cash";

export type SimulatorCommercialPresentationInput = {
  calculation: SimulatorCalculationResult;
  input: SimulatorInput;
  selectedScenarioKey: SimulatorScenarioKey;
  insuranceOption: InsuranceOption;
  bidType: BidType;
  contemplationMonth: number;
};

export type SimulatorCommercialPresentation = {
  contractedCredit: number;
  inccRate: number;
  inccAdjustmentCount: number;
  inccFactor: number;
  updatedCredit: number;
  liquidCredit: number;
  selectedScenario: SimulatorScenarioResult;
  selectedScenarioName: string;
  insuranceLabel: string;
  bidType: BidType;
  bidLabel: string;
  bidAmount: number;
  contemplationMonth: number;
  installmentBeforeContemplation: number;
  installmentAfterContemplation: number;
  installmentAfterContemplationFallback: boolean;
  totalInvestedUntilContemplation: number;
  realInvestment: number;
  estimatedCardSaleValue: number;
  estimatedCardSaleProfit: number;
  estimatedCardSaleGainRate: number;
  leverageMultiple: number;
};

export function buildSimulatorCommercialPresentation({
  calculation,
  input,
  selectedScenarioKey,
  insuranceOption,
  bidType,
  contemplationMonth,
}: SimulatorCommercialPresentationInput): SimulatorCommercialPresentation {
  const selectedScenario = findScenario(calculation, selectedScenarioKey);
  const baseScenario = findScenario(calculation, "full");
  const safeContemplationMonth = clampContemplationMonth(
    contemplationMonth,
    input.termMonths,
  );
  const inccAdjustmentCount = calculateInccAdjustmentCount(
    safeContemplationMonth,
  );
  const inccRate = input.inccRate ?? 0;
  const inccFactor = Math.pow(1 + inccRate, inccAdjustmentCount);
  const updatedCredit = input.credit * inccFactor;
  const baseInstallment = getScenarioInstallment(
    baseScenario,
    insuranceOption,
    inccFactor,
  );
  const installmentBeforeContemplation = getScenarioInstallment(
    selectedScenario,
    insuranceOption,
    inccFactor,
  );
  const totalInvestedUntilContemplation =
    installmentBeforeContemplation * safeContemplationMonth;
  const totalInvestedUntilContemplationBase =
    baseInstallment * safeContemplationMonth;
  const remainingMonths = input.termMonths - safeContemplationMonth;
  const embeddedBidAmount =
    bidType === "embedded" ? updatedCredit * (input.embeddedBidRate ?? 0) : 0;
  const cashBidAmount =
    bidType === "cash" ? updatedCredit * (input.cashBidRate ?? 0) : 0;
  const bidAmount = embeddedBidAmount + cashBidAmount;
  const hasBid = bidType !== "none" && bidAmount > 0;
  const shouldUsePostContemplationFallback =
    (selectedScenarioKey !== "full" || hasBid) && remainingMonths <= 0;
  const installmentAfterContemplation = calculatePostContemplationInstallment({
    baseInstallment,
    baseScenario,
    bidAmount,
    hasBid,
    insuranceOption,
    remainingMonths,
    selectedScenarioKey,
    totalInvestedUntilContemplation,
    totalInvestedUntilContemplationBase,
    updatedCredit,
  });
  const liquidCredit = Math.max(0, updatedCredit - embeddedBidAmount);
  const estimatedCardSaleValue = liquidCredit * (input.cardSaleRate ?? 0);
  const realInvestment = totalInvestedUntilContemplation + cashBidAmount;
  const estimatedCardSaleProfit = estimatedCardSaleValue - realInvestment;

  return {
    contractedCredit: input.credit,
    inccRate,
    inccAdjustmentCount,
    inccFactor,
    updatedCredit,
    liquidCredit,
    selectedScenario,
    selectedScenarioName: selectedScenario.name,
    insuranceLabel:
      insuranceOption === "with-insurance" ? "Com seguro" : "Sem seguro",
    bidType,
    bidLabel: getBidLabel(bidType),
    bidAmount,
    contemplationMonth: safeContemplationMonth,
    installmentBeforeContemplation,
    installmentAfterContemplation,
    installmentAfterContemplationFallback:
      shouldUsePostContemplationFallback,
    totalInvestedUntilContemplation,
    realInvestment,
    estimatedCardSaleValue,
    estimatedCardSaleProfit,
    estimatedCardSaleGainRate: realInvestment > 0
      ? estimatedCardSaleProfit / realInvestment
      : 0,
    leverageMultiple: realInvestment > 0
      ? estimatedCardSaleValue / realInvestment
      : 0,
  };
}

function findScenario(
  calculation: SimulatorCalculationResult,
  key: SimulatorScenarioKey,
) {
  const scenario = calculation.scenarios.find((item) => item.key === key);

  if (!scenario) {
    throw new Error(`Simulator scenario not found: ${key}`);
  }

  return scenario;
}

function getScenarioInstallment(
  scenario: SimulatorScenarioResult,
  insuranceOption: InsuranceOption,
  inccFactor: number,
) {
  const baseInstallment = insuranceOption === "with-insurance"
    ? scenario.installmentWithInsurance
    : scenario.installmentWithoutInsurance;

  return baseInstallment * inccFactor;
}

function calculatePostContemplationInstallment({
  baseInstallment,
  baseScenario,
  bidAmount,
  hasBid,
  insuranceOption,
  remainingMonths,
  selectedScenarioKey,
  totalInvestedUntilContemplation,
  totalInvestedUntilContemplationBase,
  updatedCredit,
}: {
  baseInstallment: number;
  baseScenario: SimulatorScenarioResult;
  bidAmount: number;
  hasBid: boolean;
  insuranceOption: InsuranceOption;
  remainingMonths: number;
  selectedScenarioKey: SimulatorScenarioKey;
  totalInvestedUntilContemplation: number;
  totalInvestedUntilContemplationBase: number;
  updatedCredit: number;
}) {
  if (remainingMonths <= 0) {
    return baseInstallment;
  }

  if (hasBid) {
    const remainingCreditBalance = Math.max(0, updatedCredit - bidAmount);
    const postBidBalance =
      remainingCreditBalance +
      baseScenario.administrativeFeeAmount +
      baseScenario.reserveFundAmount;
    const postBidInstallmentWithoutInsurance =
      postBidBalance / remainingMonths;

    return insuranceOption === "with-insurance"
      ? postBidInstallmentWithoutInsurance +
          baseScenario.monthlyInsuranceAmount
      : postBidInstallmentWithoutInsurance;
  }

  if (selectedScenarioKey === "full") {
    return baseInstallment;
  }

  return (
    baseInstallment +
    (totalInvestedUntilContemplationBase -
      totalInvestedUntilContemplation) /
      remainingMonths
  );
}

function clampContemplationMonth(month: number, termMonths: number) {
  return Math.min(Math.max(1, Math.trunc(month)), termMonths);
}

export function calculateInccAdjustmentCount(contemplationMonth: number) {
  return Math.floor((Math.max(1, Math.trunc(contemplationMonth)) - 1) / 12);
}

function getBidLabel(bidType: BidType) {
  const labels: Record<BidType, string> = {
    none: "Sem lance",
    embedded: "Lance embutido",
    cash: "Lance em dinheiro",
  };

  return labels[bidType];
}
