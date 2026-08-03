export type CommercialProposalProjectionRecord<TProposal> = {
  proposal?: TProposal | null;
  proposalId?: string | null;
  savedAt?: string | null;
  status: string;
  variant: string;
};

export type CommercialProposalProjection<TProposal> = {
  isCustomized: boolean;
  proposal: TProposal;
  proposalId: string | null;
  savedAt: string | null;
  sourceProposal: TProposal;
};

export function resolveCommercialProposalProjection<
  TProposal extends { kind: string },
>(
  sourceProposal: TProposal,
  record: CommercialProposalProjectionRecord<TProposal> | null | undefined,
): CommercialProposalProjection<TProposal> {
  if (
    record?.status === "success" &&
    record.variant === "customized" &&
    record.proposal?.kind === sourceProposal.kind
  ) {
    return {
      isCustomized: true,
      proposal: record.proposal,
      proposalId: record.proposalId ?? null,
      savedAt: record.savedAt ?? null,
      sourceProposal,
    };
  }

  return {
    isCustomized: false,
    proposal: sourceProposal,
    proposalId: null,
    savedAt: null,
    sourceProposal,
  };
}
