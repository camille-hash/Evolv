import {
  canDeactivateUser,
  canDeleteUser,
  canChangeUserRole,
  createUser,
  defaultAccessUsers,
  isMasterAdmin,
  normalizeUser,
  updateUser,
} from "./access-engine";
import type { User, UserInput } from "./access-types";

const USERS_STORAGE_KEY = "evolv.users.v1";
const CURRENT_USER_STORAGE_KEY = "evolv.current-user.v1";
const LOGIN_ATTEMPTS_STORAGE_KEY = "evolv.login-attempts.v1";
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_DURATION_MS = 15 * 60 * 1000;

export type LoginAttemptBlockStatus = {
  blocked: boolean;
  remainingMinutes: number;
};

export function loadUsers(): User[] {
  if (typeof window === "undefined") {
    return [];
  }

  const users = readStoredUsers();

  if (!users.length) {
    saveUsers(defaultAccessUsers);
    return defaultAccessUsers;
  }

  return users;
}

export function saveUsers(users: User[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export function authenticateUser(usuario: string, senha: string): User | null {
  const normalizedUsuario = usuario.trim();
  const normalizedSenha = senha.trim();

  return (
    loadUsers().find(
      (user) =>
        user.ativo &&
        user.usuario === normalizedUsuario &&
        user.senha === normalizedSenha,
    ) ?? null
  );
}

export function getLoginAttemptBlockStatus(
  identifier: string,
): LoginAttemptBlockStatus {
  const attempts = readLoginAttempts();
  const attempt = attempts[normalizeLoginIdentifier(identifier)];
  const now = Date.now();

  if (!attempt?.blockedUntil || attempt.blockedUntil <= now) {
    return { blocked: false, remainingMinutes: 0 };
  }

  return {
    blocked: true,
    remainingMinutes: Math.max(1, Math.ceil((attempt.blockedUntil - now) / 60000)),
  };
}

export function registerFailedLoginAttempt(
  identifier: string,
): LoginAttemptBlockStatus {
  const attempts = readLoginAttempts();
  const key = normalizeLoginIdentifier(identifier);
  const now = Date.now();
  const currentAttempt = attempts[key];

  if (currentAttempt?.blockedUntil && currentAttempt.blockedUntil > now) {
    return getLoginAttemptBlockStatus(identifier);
  }

  const failedAttempts = (currentAttempt?.failedAttempts ?? 0) + 1;
  const blockedUntil =
    failedAttempts >= MAX_LOGIN_ATTEMPTS
      ? now + LOGIN_BLOCK_DURATION_MS
      : undefined;

  attempts[key] = {
    blockedUntil,
    failedAttempts,
    updatedAt: now,
  };
  saveLoginAttempts(attempts);

  return getLoginAttemptBlockStatus(identifier);
}

export function clearLoginAttempts(identifier: string) {
  if (typeof window === "undefined") {
    return;
  }

  const attempts = readLoginAttempts();
  delete attempts[normalizeLoginIdentifier(identifier)];
  saveLoginAttempts(attempts);
}

export function loadCurrentUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);

  const currentUserId = window.sessionStorage.getItem(CURRENT_USER_STORAGE_KEY);

  if (!currentUserId) {
    loadUsers();
    return null;
  }

  return loadUsers().find((user) => user.id === currentUserId && user.ativo) ?? null;
}

export function saveCurrentUser(user: User) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  window.sessionStorage.setItem(CURRENT_USER_STORAGE_KEY, user.id);
}

export function changeUserPassword(userId: string, senha: string): User | null {
  const nextPassword = senha.trim();

  if (!nextPassword) {
    return null;
  }

  const users = loadUsers();
  const nextUsers = users.map((user) =>
    user.id === userId
      ? {
          ...user,
          senha: nextPassword,
          mustChangePassword: false,
          updatedAt: new Date().toISOString(),
        }
      : user,
  );

  saveUsers(nextUsers);

  const nextUser = loadUsers().find((user) => user.id === userId) ?? null;

  if (nextUser) {
    saveCurrentUser(nextUser);
  }

  return nextUser;
}

export function clearCurrentUser() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
}

export function saveAccessUser(input: UserInput, userId?: string): User[] {
  const users = loadUsers();
  const existingUser = userId
    ? users.find((user) => user.id === userId)
    : undefined;

  if (
    existingUser &&
    !canChangeUserRole(users, existingUser.id, input.role)
  ) {
    return users;
  }

  const nextUser = existingUser
    ? updateUser(existingUser, input)
    : createUser({ ...input, ativo: true, mustChangePassword: true });
  const nextUsers = existingUser
    ? users.map((user) => (user.id === existingUser.id ? nextUser : user))
    : [...users, nextUser];

  saveUsers(nextUsers);

  return loadUsers();
}

export function toggleUserActive(userId: string): User[] {
  const users = loadUsers();

  if (!canDeactivateUser(users, userId)) {
    return users;
  }

  const nextUsers = users.map((user) =>
    user.id === userId
      ? { ...user, ativo: !user.ativo, updatedAt: new Date().toISOString() }
      : user,
  );

  saveUsers(nextUsers);

  return loadUsers();
}

export function resetUserPassword(userId: string, senha: string): User[] {
  const nextPassword = senha.trim() || "123456";
  const users = loadUsers();
  const targetUser = users.find((user) => user.id === userId);

  if (!targetUser || isMasterAdmin(targetUser)) {
    return users;
  }

  const nextUsers = users.map((user) =>
    user.id === userId
      ? {
          ...user,
          senha: nextPassword,
          mustChangePassword: true,
          updatedAt: new Date().toISOString(),
        }
      : user,
  );

  saveUsers(nextUsers);

  return loadUsers();
}

export function deleteAccessUser(userId: string): User[] {
  const users = loadUsers();

  if (!canDeleteUser(users, userId)) {
    return users;
  }

  const nextUsers = users.filter((user) => user.id !== userId);

  saveUsers(nextUsers);

  return loadUsers();
}

function readStoredUsers(): User[] {
  try {
    const rawValue = window.localStorage.getItem(USERS_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map(normalizeUser)
      .filter((user): user is User => Boolean(user));
  } catch {
    return [];
  }
}

type LoginAttemptRecord = {
  blockedUntil?: number;
  failedAttempts: number;
  updatedAt: number;
};

function readLoginAttempts(): Record<string, LoginAttemptRecord> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(LOGIN_ATTEMPTS_STORAGE_KEY);

    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue);

    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      return {};
    }

    return Object.entries(parsedValue).reduce<Record<string, LoginAttemptRecord>>(
      (attempts, [key, value]) => {
        if (!value || typeof value !== "object") {
          return attempts;
        }

        const candidate = value as Partial<LoginAttemptRecord>;

        if (
          typeof candidate.failedAttempts !== "number" ||
          typeof candidate.updatedAt !== "number"
        ) {
          return attempts;
        }

        attempts[key] = {
          blockedUntil:
            typeof candidate.blockedUntil === "number"
              ? candidate.blockedUntil
              : undefined,
          failedAttempts: candidate.failedAttempts,
          updatedAt: candidate.updatedAt,
        };

        return attempts;
      },
      {},
    );
  } catch {
    return {};
  }
}

function saveLoginAttempts(attempts: Record<string, LoginAttemptRecord>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOGIN_ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts));
}

function normalizeLoginIdentifier(identifier: string) {
  return identifier.trim().toLowerCase() || "__empty__";
}
