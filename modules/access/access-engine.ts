import type { AccessSection, User, UserInput, UserRole } from "./access-types";

export const defaultAdminUser: User = {
  id: "default-admin-bruno",
  nome: "Bruno",
  usuario: "admin",
  senha: "123456",
  role: "admin",
  ativo: true,
  createdAt: "2026-06-10T00:00:00.000Z",
  updatedAt: "2026-06-10T00:00:00.000Z",
};

export const roleLabels: Record<UserRole, string> = {
  admin: "Administrador",
  sdr: "SDR",
};

const adminSections: AccessSection[] = [
  "dashboard",
  "crm",
  "client",
  "presentation",
  "multiCotas",
  "portfolio",
  "strategies",
  "wealth",
  "intelligence",
  "roadmap",
  "followup",
  "history",
  "settings",
];

const sdrSections: AccessSection[] = ["dashboard", "crm"];

export function getAllowedSections(role: UserRole): AccessSection[] {
  return role === "admin" ? adminSections : sdrSections;
}

export function canAccessSection(
  role: UserRole,
  section: AccessSection,
): boolean {
  return getAllowedSections(role).includes(section);
}

export function isUsingDefaultAdminPassword(user: User): boolean {
  return user.usuario === defaultAdminUser.usuario && user.senha === "123456";
}

export function createUser(input: UserInput): User {
  const now = new Date().toISOString();

  return {
    ...normalizeUserInput(input),
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateUser(user: User, input: UserInput): User {
  return {
    ...user,
    ...normalizeUserInput(input),
    role: user.role === "admin" ? "admin" : "sdr",
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeUser(value: unknown): User | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<User>;
  const createdAt =
    typeof candidate.createdAt === "string"
      ? candidate.createdAt
      : new Date().toISOString();

  return {
    id:
      typeof candidate.id === "string" && candidate.id.trim()
        ? candidate.id
        : crypto.randomUUID(),
    nome: typeof candidate.nome === "string" ? candidate.nome : "",
    usuario: typeof candidate.usuario === "string" ? candidate.usuario : "",
    senha: typeof candidate.senha === "string" ? candidate.senha : "",
    role: normalizeRole(candidate.role),
    ativo: typeof candidate.ativo === "boolean" ? candidate.ativo : true,
    createdAt,
    updatedAt:
      typeof candidate.updatedAt === "string" ? candidate.updatedAt : createdAt,
  };
}

export function normalizeUserInput(input: UserInput): UserInput {
  return {
    nome: input.nome.trim(),
    usuario: input.usuario.trim(),
    senha: input.senha.trim(),
    role: normalizeRole(input.role),
    ativo: input.ativo,
  };
}

export function getEmptyUserInput(): UserInput {
  return {
    nome: "",
    usuario: "",
    senha: "",
    role: "sdr",
    ativo: true,
  };
}

function normalizeRole(role: unknown): UserRole {
  return role === "admin" || role === "sdr" ? role : "sdr";
}

