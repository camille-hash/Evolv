export type CrmLeadNoteType =
  | "strategic_context"
  | "latest_movement"
  | "history"
  | "initial_context";

export type CrmLeadNote = {
  authorProfileId: string | null;
  content: string;
  createdAt: string;
  deletedAt: string | null;
  deletedByProfileId: string | null;
  id: string;
  isInternal: boolean;
  leadId: string;
  metadata: Record<string, unknown>;
  noteType: CrmLeadNoteType;
  organizationId: string;
  updatedAt: string;
  updatedByProfileId: string | null;
};

export type CreateCrmLeadNoteInput = {
  authorProfileId?: string | null;
  content: string;
  leadId: string;
  metadata?: Record<string, unknown>;
  noteType?: CrmLeadNoteType;
  organizationId?: string;
};
