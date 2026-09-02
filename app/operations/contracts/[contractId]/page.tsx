import { OperationsContractWorkspace } from "@/components/operations/contracts/operations-contract-workspace";

type OperationsContractWorkspaceRouteProps = {
  params: Promise<{
    contractId: string;
  }>;
  searchParams: Promise<{
    action?: string;
    assemblyId?: string;
    clientId?: string;
    leadId?: string;
    origin?: string;
    proposalId?: string;
    tab?: string;
  }>;
};

export default async function OperationsContractWorkspacePage({
  params,
  searchParams,
}: OperationsContractWorkspaceRouteProps) {
  const { contractId } = await params;
  const { action, assemblyId, clientId, leadId, origin, proposalId, tab } = await searchParams;

  return (
    <OperationsContractWorkspace
      clientId={clientId}
      contractId={contractId}
      initialAssemblyId={assemblyId}
      initialTab={tab === "documents" ? "documents" : tab === "timeline" ? "timeline" : "summary"}
      leadId={leadId}
      prepareBid={action === "prepare-bid"}
      origin={origin}
      proposalId={proposalId}
    />
  );
}
