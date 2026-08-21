export type ProposalMaterializationFacts = {
  currentVersionId: string;
  proposalId: string;
  simulationId: string | null;
  snapshotAuthority: string;
  snapshotSchemaVersion: string;
  status: string;
};

export function buildProposalMaterializationBlockers(facts: ProposalMaterializationFacts) {
  const blockers: string[] = [];
  if (facts.proposalId !== facts.currentVersionId) blockers.push("Apenas a versao corrente pode ser materializada.");
  if (facts.status !== "approved") blockers.push("A proposta precisa estar aprovada.");
  if (!facts.simulationId) blockers.push("A proposta nao possui simulacao de origem.");
  if (facts.snapshotSchemaVersion !== "commercial-proposal/v1") blockers.push("O snapshot da proposta nao e V1.");
  if (!(["server_derived", "server_verified"] as string[]).includes(facts.snapshotAuthority)) blockers.push("A autoridade do snapshot nao permite materializacao.");
  return blockers;
}
