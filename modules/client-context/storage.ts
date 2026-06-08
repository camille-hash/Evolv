import type { ClientContext } from "@/modules/client-context/types";

export const CLIENT_CONTEXT_STORAGE_KEY = "evolv.client-context.v1";

export const emptyClientContext: ClientContext = {
  nome: "",
  telefone: "",
  email: "",
  perfil: "",
  patrimonioAtual: 0,
  metaPatrimonial: 0,
  rendaAtual: 0,
  metaRenda: 0,
  prazoMeta: 120,
  observacoes: "",
};

export function loadClientContext(): ClientContext {
  if (!canUseLocalStorage()) {
    return emptyClientContext;
  }

  const rawValue = window.localStorage.getItem(CLIENT_CONTEXT_STORAGE_KEY);

  if (!rawValue) {
    return emptyClientContext;
  }

  try {
    return normalizeClientContext(JSON.parse(rawValue));
  } catch {
    return emptyClientContext;
  }
}

export function saveClientContext(context: ClientContext) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    CLIENT_CONTEXT_STORAGE_KEY,
    JSON.stringify(normalizeClientContext(context)),
  );
}

export function normalizeClientContext(value: unknown): ClientContext {
  const context = value as Partial<ClientContext>;

  return {
    nome: normalizeText(context.nome),
    telefone: normalizeText(context.telefone),
    email: normalizeText(context.email),
    perfil: normalizeText(context.perfil),
    patrimonioAtual: normalizePositiveNumber(context.patrimonioAtual),
    metaPatrimonial: normalizePositiveNumber(context.metaPatrimonial),
    rendaAtual: normalizePositiveNumber(context.rendaAtual),
    metaRenda: normalizePositiveNumber(context.metaRenda),
    prazoMeta: normalizePositiveInteger(context.prazoMeta),
    observacoes: normalizeText(context.observacoes),
  };
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizePositiveNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
}

function normalizePositiveInteger(value: unknown) {
  const numberValue = normalizePositiveNumber(value);

  return numberValue > 0 ? Math.max(1, Math.trunc(numberValue)) : 120;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

