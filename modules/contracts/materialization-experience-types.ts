import type { Contract } from "./types";

export type ProposalMaterializationExperience = {
  actorCanManage: boolean;
  blockers: string[];
  contracts: Contract[];
  currentVersionId: string;
  isCurrentVersion: boolean;
  materializationId: string | null;
  proposalId: string;
  status: string;
};
