import {
  defaultMultiCotasInput,
  normalizeMultiCotasInput,
} from "@/modules/multi-cotas/multi-cotas-engine";
import type { MultiCotasInput } from "@/modules/multi-cotas/multi-cotas-types";

export const MULTI_COTAS_STORAGE_KEY = "evolv.multi-cotas.v1";

export function loadMultiCotasInput(): MultiCotasInput {
  if (!canUseLocalStorage()) {
    return defaultMultiCotasInput;
  }

  const rawValue = window.localStorage.getItem(MULTI_COTAS_STORAGE_KEY);

  if (!rawValue) {
    return defaultMultiCotasInput;
  }

  try {
    return normalizeMultiCotasInput(JSON.parse(rawValue) as MultiCotasInput);
  } catch {
    return defaultMultiCotasInput;
  }
}

export function saveMultiCotasInput(input: MultiCotasInput) {
  const normalizedInput = normalizeMultiCotasInput(input);

  if (canUseLocalStorage()) {
    window.localStorage.setItem(
      MULTI_COTAS_STORAGE_KEY,
      JSON.stringify(normalizedInput),
    );
  }

  return normalizedInput;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}
