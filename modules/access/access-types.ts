export type UserRole = "admin" | "sdr";

export type AccessSection =
  | "dashboard"
  | "crm"
  | "client"
  | "presentation"
  | "multiCotas"
  | "portfolio"
  | "strategies"
  | "wealth"
  | "intelligence"
  | "roadmap"
  | "followup"
  | "history"
  | "settings";

export type User = {
  id: string;
  nome: string;
  usuario: string;
  senha: string;
  role: UserRole;
  ativo: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserInput = {
  nome: string;
  usuario: string;
  senha: string;
  role: UserRole;
  ativo: boolean;
  mustChangePassword?: boolean;
};
