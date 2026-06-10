import type { AccessSection, User, UserInput, UserRole } from "./access-types";

export const defaultAdminUser: User = {
  id: "default-admin-bruno",
  nome: "Camille",
  usuario: "admin",
  senha: "123456",
  role: "admin",
  ativo: true,
  mustChangePassword: true,
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

export function isMasterAdmin(user: User): boolean {
  return user.usuario === defaultAdminUser.usuario;
}

export function hasAnotherActiveAdmin(users: User[], userId: string): boolean {
  return users.some(
    (user) => user.id !== userId && user.role === "admin" && user.ativo,
  );
}

export function canDeactivateUser(users: User[], userId: string): boolean {
  const user = users.find((item) => item.id === userId);

  if (!user || isMasterAdmin(user)) {
    return false;
  }

  if (user.role === "admin" && user.ativo) {
    return hasAnotherActiveAdmin(users, user.id);
  }

  return true;
}

export function canDeleteUser(users: User[], userId: string): boolean {
  const user = users.find((item) => item.id === userId);

  if (!user || isMasterAdmin(user)) {
    return false;
  }

  if (user.role === "admin" && user.ativo) {
    return hasAnotherActiveAdmin(users, user.id);
  }

  return true;
}

export function canChangeUserRole(
  users: User[],
  userId: string,
  nextRole: UserRole,
): boolean {
  const user = users.find((item) => item.id === userId);

  if (!user || isMasterAdmin(user)) {
    return false;
  }

  if (user.role === "admin" && nextRole !== "admin" && user.ativo) {
    return hasAnotherActiveAdmin(users, user.id);
  }

  return true;
}

export function createUser(input: UserInput): User {
  const now = new Date().toISOString();

  return {
    ...normalizeUserInput(input),
    id: crypto.randomUUID(),
    ativo: true,
    mustChangePassword: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateUser(user: User, input: UserInput): User {
  if (isMasterAdmin(user)) {
    return user;
  }

  return {
    ...user,
    ...normalizeUserInput(input),
    mustChangePassword:
      input.mustChangePassword ?? shouldRequirePasswordChange(input),
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeUser(value: unknown): User | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<User>;
  const isDefaultAdmin = candidate.usuario === defaultAdminUser.usuario;
  const createdAt =
    typeof candidate.createdAt === "string"
      ? candidate.createdAt
      : new Date().toISOString();

  return {
    id:
      typeof candidate.id === "string" && candidate.id.trim()
        ? candidate.id
        : crypto.randomUUID(),
    nome: isDefaultAdmin
      ? defaultAdminUser.nome
      : typeof candidate.nome === "string"
        ? candidate.nome
        : "",
    usuario: isDefaultAdmin
      ? defaultAdminUser.usuario
      : typeof candidate.usuario === "string"
        ? candidate.usuario
        : "",
    senha: typeof candidate.senha === "string" ? candidate.senha : "",
    role:
      isDefaultAdmin ? defaultAdminUser.role : normalizeRole(candidate.role),
    ativo: isDefaultAdmin
      ? defaultAdminUser.ativo
      : typeof candidate.ativo === "boolean"
        ? candidate.ativo
        : true,
    mustChangePassword:
      typeof candidate.mustChangePassword === "boolean"
        ? candidate.mustChangePassword
        : normalizeRole(candidate.role) === "admin" &&
          candidate.usuario === "admin" &&
          candidate.senha === "123456",
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
    mustChangePassword:
      input.mustChangePassword ?? shouldRequirePasswordChange(input),
  };
}

export function getEmptyUserInput(): UserInput {
  return {
    nome: "",
    usuario: "",
    senha: "",
    role: "sdr",
    ativo: true,
    mustChangePassword: true,
  };
}

function normalizeRole(role: unknown): UserRole {
  return role === "admin" || role === "sdr" ? role : "sdr";
}

function shouldRequirePasswordChange(input: UserInput) {
  return (
    (input.role === "admin" && input.usuario === "admin" && input.senha === "123456") ||
    input.role === "sdr"
  );
}
