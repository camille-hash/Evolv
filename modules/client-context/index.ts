export {
  CLIENT_CONTEXT_STORAGE_KEY,
  CLIENT_CONVERSION_HISTORY_STORAGE_KEY,
  CLIENT_RECORD_STORAGE_KEY,
  convertLeadToClient,
  emptyClientContext,
  loadClientConversionHistory,
  loadClientContext,
  loadCurrentClientRecord,
  normalizeClientContext,
  normalizeClientConversionEvent,
  normalizeClientRecord,
  saveClientContext,
  saveCurrentClientRecord,
} from "@/modules/client-context/storage";
export type {
  ClientCommercialArtifactSummary,
  ClientContext,
  ClientConversionEvent,
  ClientRecord,
  ClientStrategicProfileBridge,
  ConvertLeadToClientInput,
} from "@/modules/client-context/types";

