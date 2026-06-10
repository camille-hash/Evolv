import {
  createUser,
  defaultAdminUser,
  normalizeUser,
  updateUser,
} from "./access-engine";
import type { User, UserInput } from "./access-types";

const USERS_STORAGE_KEY = "evolv.users.v1";
const CURRENT_USER_STORAGE_KEY = "evolv.current-user.v1";

export function loadUsers(): User[] {
  if (typeof window === "undefined") {
    return [];
  }

  const users = readStoredUsers();

  if (!users.length) {
    saveUsers([defaultAdminUser]);
    return [defaultAdminUser];
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

export function loadCurrentUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  const currentUserId = window.localStorage.getItem(CURRENT_USER_STORAGE_KEY);

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

  window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, user.id);
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

  window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
}

export function saveAccessUser(input: UserInput, userId?: string): User[] {
  const users = loadUsers();
  const existingUser = userId
    ? users.find((user) => user.id === userId)
    : undefined;
  const nextUser = existingUser
    ? updateUser(existingUser, input)
    : createUser({ ...input, role: "sdr" });
  const nextUsers = existingUser
    ? users.map((user) => (user.id === existingUser.id ? nextUser : user))
    : [...users, nextUser];

  saveUsers(nextUsers);

  return loadUsers();
}

export function toggleUserActive(userId: string): User[] {
  const users = loadUsers();
  const nextUsers = users.map((user) =>
    user.id === userId && user.role === "sdr"
      ? { ...user, ativo: !user.ativo, updatedAt: new Date().toISOString() }
      : user,
  );

  saveUsers(nextUsers);

  return loadUsers();
}

export function resetUserPassword(userId: string, senha: string): User[] {
  const nextPassword = senha.trim();

  if (!nextPassword) {
    return loadUsers();
  }

  const users = loadUsers();
  const nextUsers = users.map((user) =>
    user.id === userId && user.role === "sdr"
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
