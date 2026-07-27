import { OperationsContractWorkspace } from "@/components/operations/contracts/operations-contract-workspace";

type OperationsContractWorkspaceRouteProps = {
  params: Promise<{
    contractId: string;
  }>;
};

export default async function OperationsContractWorkspacePage({
  params,
}: OperationsContractWorkspaceRouteProps) {
  const { contractId } = await params;

  return <OperationsContractWorkspace contractId={contractId} />;
}
