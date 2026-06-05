import {
  calculateSimulatorScenarios,
  type SimulatorInput,
  type SimulatorScenarioResult,
} from "@/modules/simulator/engine";

export const simulatorExampleInput: SimulatorInput = {
  credit: 400000,
  administrativeFeeRate: 0.26,
  reserveFundRate: 0.02,
  termMonths: 197,
  monthlyInsuranceRate: 0.0003,
};

const expectedExampleResults = {
  full: {
    adjustedCredit: 400000,
    administrativeFeeAmount: 104000,
    reserveFundAmount: 8000,
    monthlyInsuranceAmount: 153.6,
    outstandingBalance: 512000,
    installmentWithoutInsurance: 2598.98,
    installmentWithInsurance: 2752.58,
  },
  seventy: {
    adjustedCredit: 280000,
    administrativeFeeAmount: 104000,
    reserveFundAmount: 8000,
    monthlyInsuranceAmount: 153.6,
    outstandingBalance: 392000,
    installmentWithoutInsurance: 1989.85,
    installmentWithInsurance: 2143.45,
  },
  half: {
    adjustedCredit: 200000,
    administrativeFeeAmount: 104000,
    reserveFundAmount: 8000,
    monthlyInsuranceAmount: 153.6,
    outstandingBalance: 312000,
    installmentWithoutInsurance: 1583.76,
    installmentWithInsurance: 1737.36,
  },
} satisfies Record<
  SimulatorScenarioResult["key"],
  Partial<SimulatorScenarioResult>
>;

export function validateSimulatorExample() {
  const result = calculateSimulatorScenarios(simulatorExampleInput);

  return result.scenarios.map((scenario) => {
    const expected = expectedExampleResults[scenario.key];
    const checks = Object.entries(expected).map(([field, expectedValue]) => {
      const actualValue = scenario[field as keyof SimulatorScenarioResult];

      return {
        field,
        expected: expectedValue,
        actual: actualValue,
        passed: roundCurrency(Number(actualValue)) === expectedValue,
      };
    });

    return {
      scenario: scenario.name,
      passed: checks.every((check) => check.passed),
      checks,
    };
  });
}

export function isSimulatorExampleValid() {
  return validateSimulatorExample().every((scenario) => scenario.passed);
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
