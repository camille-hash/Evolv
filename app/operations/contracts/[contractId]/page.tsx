import { OperationsContractWorkspace } from "@/components/operations/contracts/operations-contract-workspace";

type OperationsContractWorkspaceRouteProps = {
  params: Promise<{
    contractId: string;
  }>;
  searchParams: Promise<{
    clientId?: string;
    origin?: string;
  }>;
};

export default async function OperationsContractWorkspacePage({
  params,
  searchParams,
}: OperationsContractWorkspaceRouteProps) {
  const { contractId } = await params;
  const { clientId, origin } = await searchParams;

  return (
    <OperationsContractWorkspace
      clientId={clientId}
      contractId={contractId}
      origin={origin}
    />
  );
}
