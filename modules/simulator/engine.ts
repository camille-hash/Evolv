export type SimulatorInput = {
  credit: number;
  administrativeFeeRate: number;
  reserveFundRate: number;
  termMonths: number;
  monthlyInsuranceRate: number;
  inccRate?: number;
  cardSaleRate?: number;
  embeddedBidRate?: number;
  cashBidRate?: number;
};

export type SimulatorScenarioKey = "full" | "seventy" | "half";

export type SimulatorScenarioResult = {
  key: SimulatorScenarioKey;
  name: string;
  factor: number;
  adjustedCredit: number;
  administrativeFeeAmount: number;
  reserveFundAmount: number;
  monthlyInsuranceAmount: number;
  outstandingBalance: number;
  installmentWithoutInsurance: number;
  installmentWithInsurance: number;
};

export type SimulatorCalculationResult = {
  scenarios: SimulatorScenarioResult[];
};

const SCENARIOS: Array<{
  key: SimulatorScenarioKey;
  name: string;
  factor: number;
}> = [
  { key: "full", name: "Parcela cheia", factor: 1 },
  { key: "seventy", name: "Parcela 70%", factor: 0.7 },
  { key: "half", name: "Meia parcela", factor: 0.5 },
];

export function calculateSimulatorScenarios(
  input: SimulatorInput,
): SimulatorCalculationResult {
  validateSimulatorInput(input);

  const administrativeFeeAmount = input.credit * input.administrativeFeeRate;
  const reserveFundAmount = input.credit * input.reserveFundRate;
  const monthlyInsuranceAmount =
    (input.credit + administrativeFeeAmount + reserveFundAmount) *
    input.monthlyInsuranceRate;

  return {
    scenarios: SCENARIOS.map((scenario) => {
      const adjustedCredit = input.credit * scenario.factor;
      const outstandingBalance =
        adjustedCredit + administrativeFeeAmount + reserveFundAmount;
      const installmentWithoutInsurance =
        outstandingBalance / input.termMonths;

      return {
        ...scenario,
        adjustedCredit,
        administrativeFeeAmount,
        reserveFundAmount,
        monthlyInsuranceAmount,
        outstandingBalance,
        installmentWithoutInsurance,
        installmentWithInsurance:
          installmentWithoutInsurance + monthlyInsuranceAmount,
      };
    }),
  };
}

function validateSimulatorInput(input: SimulatorInput) {
  if (input.credit <= 0) {
    throw new Error("Credit must be greater than zero.");
  }

  if (input.administrativeFeeRate < 0) {
    throw new Error("Administrative fee rate cannot be negative.");
  }

  if (input.reserveFundRate < 0) {
    throw new Error("Reserve fund rate cannot be negative.");
  }

  if (!Number.isInteger(input.termMonths) || input.termMonths <= 0) {
    throw new Error("Term must be a positive integer in months.");
  }

  if (input.monthlyInsuranceRate < 0) {
    throw new Error("Monthly insurance rate cannot be negative.");
  }
}
