import type {
  AdministratorCreateInput,
  AdministratorListFilters,
  AdministratorStatus,
  AdministratorUpdateInput,
} from "./types";

export const administratorStatuses: AdministratorStatus[] = [
  "active",
  "inactive",
];

export function isAdministratorStatus(
  value: unknown,
): value is AdministratorStatus {
  return (
    typeof value === "string" &&
    administratorStatuses.includes(value as AdministratorStatus)
  );
}

export function parseAdministratorCreateInput(value: unknown) {
  if (!isRecord(value)) {
    return invalid("Informe os dados da administradora.");
  }

  const name = normalizeText(value.name);

  if (!name) {
    return invalid("Nome da administradora e obrigatorio.");
  }

  const input: AdministratorCreateInput = {
    name,
    slug:
      "slug" in value && value.slug !== null && value.slug !== undefined
        ? normalizeSlug(value.slug)
        : null,
  };

  if ("slug" in value && input.slug === "") {
    return invalid("Slug da administradora invalido.");
  }

  if ("status" in value) {
    if (!isAdministratorStatus(value.status)) {
      return invalid("Status da administradora invalido.");
    }

    input.status = value.status;
  }

  if ("metadata" in value) {
    if (!isRecord(value.metadata)) {
      return invalid("Metadata da administradora invalida.");
    }

    input.metadata = value.metadata;
  }

  return {
    input,
    ok: true as const,
  };
}

export function parseAdministratorUpdateInput(value: unknown) {
  if (!isRecord(value)) {
    return invalid("Informe os dados da administradora.");
  }

  const input: AdministratorUpdateInput = {};

  if ("name" in value) {
    const name = normalizeText(value.name);

    if (!name) {
      return invalid("Nome da administradora e obrigatorio.");
    }

    input.name = name;
  }

  if ("status" in value) {
    if (!isAdministratorStatus(value.status)) {
      return invalid("Status da administradora invalido.");
    }

    input.status = value.status;
  }

  if ("metadata" in value) {
    if (!isRecord(value.metadata)) {
      return invalid("Metadata da administradora invalida.");
    }

    input.metadata = value.metadata;
  }

  return {
    input,
    ok: true as const,
  };
}

export function parseAdministratorListFilters(params: URLSearchParams) {
  const status = params.get("status");
  const limit = params.get("limit");
  const offset = params.get("offset");
  const filters: AdministratorListFilters = {
    search: normalizeNullableText(params.get("search")),
  };

  if (status) {
    if (!isAdministratorStatus(status)) {
      return invalid("Status da administradora invalido.");
    }

    filters.status = status;
  }

  if (limit) {
    const parsedLimit = Number(limit);

    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
      return invalid("Limite invalido.");
    }

    filters.limit = Math.min(parsedLimit, 100);
  }

  if (offset) {
    const parsedOffset = Number(offset);

    if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
      return invalid("Offset invalido.");
    }

    filters.offset = parsedOffset;
  }

  return {
    filters,
    ok: true as const,
  };
}

export function createAdministratorSlug(name: string) {
  return normalizeSlug(name) || "administradora";
}

export function normalizeSlug(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeNullableText(value: unknown) {
  const normalized = normalizeText(value);

  return normalized || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function invalid(error: string) {
  return {
    error,
    ok: false as const,
    status: 400,
  };
}
