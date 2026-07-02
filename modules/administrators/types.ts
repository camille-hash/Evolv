export type AdministratorStatus = "active" | "inactive";

export type Administrator = {
  createdAt: string;
  createdBy: string | null;
  id: string;
  metadata: Record<string, unknown>;
  name: string;
  organizationId: string;
  slug: string;
  status: AdministratorStatus;
  updatedAt: string;
  updatedBy: string | null;
};

export type AdministratorCreateInput = {
  metadata?: Record<string, unknown>;
  name: string;
  slug?: string | null;
  status?: AdministratorStatus;
};

export type AdministratorUpdateInput = {
  metadata?: Record<string, unknown>;
  name?: string;
  status?: AdministratorStatus;
};

export type AdministratorListFilters = {
  limit?: number;
  offset?: number;
  search?: string | null;
  status?: AdministratorStatus | null;
};
