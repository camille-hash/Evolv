import { NextResponse, type NextRequest } from "next/server";
import { listContracts } from "@/modules/contracts/server";
import type { Contract, LeadContractSummary } from "@/modules/contracts/types";

type RouteContext = {
  params: Promise<{
    leadId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const accessToken = readBearerToken(request);
  const { leadId } = await context.params;
  const result = await listContracts(accessToken, { leadId });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    contracts: result.contracts.map(mapLeadContractSummary),
  });
}

function mapLeadContractSummary(contract: Contract): LeadContractSummary {
  return {
    administratorId: contract.administratorId,
    clientId: contract.clientId,
    commissionPlanId: contract.commissionPlanId,
    contractNumber: contract.contractNumber,
    createdAt: contract.createdAt,
    creditAmount: contract.creditAmount,
    group: contract.group,
    id: contract.id,
    installmentAmount: contract.installmentAmount,
    productType: contract.productType,
    quota: contract.quota,
    status: contract.status,
    termMonths: contract.termMonths,
    updatedAt: contract.updatedAt,
  };
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
