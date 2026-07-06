import { OperationsIntegrityDetailPage } from "@/components/operations/integrity/operations-integrity-detail-page";

type OperationsIntegrityDetailRouteProps = {
  params: Promise<{
    contractId: string;
  }>;
};

export default async function OperationsIntegrityContractDetailPage({
  params,
}: OperationsIntegrityDetailRouteProps) {
  const { contractId } = await params;

  return <OperationsIntegrityDetailPage contractId={contractId} />;
}
