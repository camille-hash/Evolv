export {
  approveCommercialProposal,
  createCommercialProposal as createLeadCommercialProposal,
  expireCommercialProposal,
  getCommercialProposalById as getLeadCommercialProposalById,
  listCommercialProposalsByLeadId as listLeadCommercialProposalsByLeadId,
  markCommercialProposalAsPresented,
  rejectCommercialProposal,
  reviseCommercialProposal,
  revokeCommercialProposalApproval,
} from "../../commercial-proposals/server.ts";
export type {
  CreateCommercialProposalResult as CreateLeadCommercialProposalResult,
  GetCommercialProposalResult as GetLeadCommercialProposalResult,
  ListCommercialProposalsResult as ListLeadCommercialProposalsResult,
} from "../../commercial-proposals/server.ts";
