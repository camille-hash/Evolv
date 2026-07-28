import { OperationsContractWorkspace } from "@/components/operations/contracts/operations-contract-workspace";

type OperationsContractWorkspaceRouteProps = {
  params: Promise<{
    contractId: string;
  }>;
  searchParams: Promise<{
    action?: string;
    assemblyId?: string;
    clientId?: string;
    origin?: string;
  }>;
};

export default async function OperationsContractWorkspacePage({
  params,
  searchParams,
}: OperationsContractWorkspaceRouteProps) {
  const { contractId } = await params;
  const { action, assemblyId, clientId, origin } = await searchParams;

  return (
    <OperationsContractWorkspace
      clientId={clientId}
      contractId={contractId}
      initialAssemblyId={assemblyId}
      prepareBid={action === "prepare-bid"}
      origin={origin}
    />
  );
}
