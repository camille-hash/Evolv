export {
  calculateSimulatorScenarios,
  type SimulatorCalculationResult,
  type SimulatorInput,
  type SimulatorScenarioKey,
  type SimulatorScenarioResult,
} from "@/modules/simulator/engine";
export {
  buildSimulatorCommercialPresentation,
  type BidType,
  type InsuranceOption,
  type SimulatorCommercialPresentation,
  type SimulatorCommercialPresentationInput,
} from "@/modules/simulator/presentation";
export {
  isSimulatorExampleValid,
  simulatorExampleInput,
  validateSimulatorExample,
} from "@/modules/simulator/validation";
export type { Comparison, Scenario, Simulation } from "@/types/simulator";
