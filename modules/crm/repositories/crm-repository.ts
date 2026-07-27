import type { CrmLead } from "../crm-types";

export type CrmRepositoryErrorCode =
  | "CRM_PROFILE_INACTIVE"
  | "CRM_PROFILE_NOT_FOUND"
  | "CRM_PROFILE_ORGANIZATION_MISSING";

export class CrmRepositoryError extends Error {
  constructor(
    public readonly code: CrmRepositoryErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CrmRepositoryError";
  }
}

export type CrmRepository = {
  createLead(lead: CrmLead): Promise<CrmLead>;
  getById(id: string): Promise<CrmLead | null>;
  list(): Promise<CrmLead[]>;
  updateLead(id: string, patch: Partial<CrmLead>): Promise<CrmLead | null>;
};
