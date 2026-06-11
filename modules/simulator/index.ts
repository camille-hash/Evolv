export {
  buildAnchoredProposals,
  type AnchoredProposal,
  type AnchoredProposalInput,
  type AnchoredProposalKind,
} from "@/modules/simulator/anchoring";
export {
  ADMINISTRATORS_STORAGE_KEY,
  applyAdministratorToSimulationForm,
  createDefaultSavedAdministratorData,
  createSavedAdministratorData,
  getAdministratorById,
  listAdministrators,
  resetAdministratorsDefaults,
  saveAdministrator,
  updateAdministrator,
  type SimulatorAdministrator,
  type SimulatorAdministratorKind,
  type SimulatorAdministratorParameters,
  type SimulatorSavedAdministratorData,
} from "@/modules/simulator/administrators";
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
export {
  createEmptyCommercialData,
  createResultSnapshot,
  deleteSimulation,
  duplicateSimulation,
  formatSimulationDate,
  loadSavedSimulations,
  saveSimulation,
  type SimulatorCommercialData,
  type SimulatorSavedFormState,
  type SimulatorSavedResultSnapshot,
  type SimulatorSavedSimulation,
} from "@/modules/simulator/storage";
export type { Comparison, Scenario, Simulation } from "@/types/simulator";
