import {
  consolidatePortfolio,
} from "@/modules/portfolio/portfolio-engine";
import type {
  PortfolioLetter,
  PortfolioProperty,
  PortfolioSnapshot,
} from "@/modules/portfolio/portfolio-types";

export const PORTFOLIO_STORAGE_KEY = "evolv.portfolio.v1";

export const emptyPortfolioSnapshot: PortfolioSnapshot = {
  properties: [],
  letters: [],
};

export function loadPortfolioSnapshot(): PortfolioSnapshot {
  if (!canUseLocalStorage()) {
    return emptyPortfolioSnapshot;
  }

  const rawValue = window.localStorage.getItem(PORTFOLIO_STORAGE_KEY);

  if (!rawValue) {
    return emptyPortfolioSnapshot;
  }

  try {
    return normalizePortfolioSnapshot(JSON.parse(rawValue));
  } catch {
    return emptyPortfolioSnapshot;
  }
}

export function savePortfolioSnapshot(
  snapshot: PortfolioSnapshot,
): PortfolioSnapshot {
  const normalizedSnapshot = normalizePortfolioSnapshot(snapshot);

  if (canUseLocalStorage()) {
    window.localStorage.setItem(
      PORTFOLIO_STORAGE_KEY,
      JSON.stringify(normalizedSnapshot),
    );
  }

  return normalizedSnapshot;
}

export function upsertPortfolioProperty(
  snapshot: PortfolioSnapshot,
  property: PortfolioProperty,
): PortfolioSnapshot {
  const normalizedProperty = normalizePortfolioProperty(property);
  const propertyExists = snapshot.properties.some(
    (currentProperty) => currentProperty.id === normalizedProperty.id,
  );

  return savePortfolioSnapshot({
    ...snapshot,
    properties: propertyExists
      ? snapshot.properties.map((currentProperty) =>
          currentProperty.id === normalizedProperty.id
            ? normalizedProperty
            : currentProperty,
        )
      : [normalizedProperty, ...snapshot.properties],
  });
}

export function deletePortfolioProperty(
  snapshot: PortfolioSnapshot,
  propertyId: string,
): PortfolioSnapshot {
  return savePortfolioSnapshot({
    ...snapshot,
    properties: snapshot.properties.filter(
      (property) => property.id !== propertyId,
    ),
  });
}

export function upsertPortfolioLetter(
  snapshot: PortfolioSnapshot,
  letter: PortfolioLetter,
): PortfolioSnapshot {
  const normalizedLetter = normalizePortfolioLetter(letter);
  const letterExists = snapshot.letters.some(
    (currentLetter) => currentLetter.id === normalizedLetter.id,
  );

  return savePortfolioSnapshot({
    ...snapshot,
    letters: letterExists
      ? snapshot.letters.map((currentLetter) =>
          currentLetter.id === normalizedLetter.id
            ? normalizedLetter
            : currentLetter,
        )
      : [normalizedLetter, ...snapshot.letters],
  });
}

export function deletePortfolioLetter(
  snapshot: PortfolioSnapshot,
  letterId: string,
): PortfolioSnapshot {
  return savePortfolioSnapshot({
    ...snapshot,
    letters: snapshot.letters.filter((letter) => letter.id !== letterId),
  });
}

export function createEmptyPortfolioProperty(): PortfolioProperty {
  return {
    id: createPortfolioId(),
    nome: "",
    valorAtual: 0,
    rendaMensal: 0,
    observacoes: "",
  };
}

export function createEmptyPortfolioLetter(): PortfolioLetter {
  return {
    id: createPortfolioId(),
    administradora: "",
    valorCredito: 0,
    contemplada: false,
    observacoes: "",
  };
}

export function loadPortfolioConsolidation() {
  return consolidatePortfolio(loadPortfolioSnapshot());
}

function normalizePortfolioSnapshot(value: unknown): PortfolioSnapshot {
  const snapshot = value as Partial<PortfolioSnapshot>;

  return {
    properties: Array.isArray(snapshot.properties)
      ? snapshot.properties.map(normalizePortfolioProperty)
      : [],
    letters: Array.isArray(snapshot.letters)
      ? snapshot.letters.map(normalizePortfolioLetter)
      : [],
  };
}

function normalizePortfolioProperty(
  value: Partial<PortfolioProperty>,
): PortfolioProperty {
  return {
    id: normalizeId(value.id),
    nome: normalizeText(value.nome),
    valorAtual: normalizePositiveNumber(value.valorAtual),
    rendaMensal: normalizePositiveNumber(value.rendaMensal),
    observacoes: normalizeText(value.observacoes),
  };
}

function normalizePortfolioLetter(
  value: Partial<PortfolioLetter>,
): PortfolioLetter {
  return {
    id: normalizeId(value.id),
    administradora: normalizeText(value.administradora),
    valorCredito: normalizePositiveNumber(value.valorCredito),
    contemplada: Boolean(value.contemplada),
    observacoes: normalizeText(value.observacoes),
  };
}

function normalizeId(value: unknown) {
  return typeof value === "string" && value.length > 0
    ? value
    : createPortfolioId();
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizePositiveNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
}

function createPortfolioId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `portfolio-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

