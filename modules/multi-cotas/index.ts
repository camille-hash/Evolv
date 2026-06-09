export {
  calculateMultiCotas,
  calculateMultiCotasInccAdjustmentCount,
  createMultiCotasCard,
  defaultMultiCotasInput,
  MAX_MULTI_COTAS_CARDS,
  MIN_MULTI_COTAS_CARDS,
  normalizeMultiCotasInput,
} from "@/modules/multi-cotas/multi-cotas-engine";
export {
  loadMultiCotasInput,
  MULTI_COTAS_STORAGE_KEY,
  saveMultiCotasInput,
} from "@/modules/multi-cotas/multi-cotas-storage";
export type {
  MultiCotasCardInput,
  MultiCotasCardResult,
  MultiCotasInput,
  MultiCotasResult,
  MultiCotasSummary,
} from "@/modules/multi-cotas/multi-cotas-types";
