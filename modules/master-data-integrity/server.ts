import { PostgrestClient } from "@supabase/postgrest-js";
import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type {
  IntegrityIssue,
  MasterDataIntegrityContractRecord,
  MasterDataIntegrityContractsResponse,
  MasterDataIntegrityContractsResult,
} from "./types";

type IntegrityProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type ContractRow = {
  administrator_id: string | null;
  client_id: string | null;
  commission_plan_id: string | null;
  contract_number: string | null;
  credit_amount: number | string | null;
  id: string;
  organization_id: string | null;
  status: string | null;
};

type ClientRow = {
  id: string;
  name: string | null;
  organization_id: string | null;
};

type AdministratorRow = {
  id: string;
  name: string | null;
  organization_id: string | null;
};

type CommissionPlanRow = {
  administrator_id: string | null;
  id: string;
  name: string | null;
  organization_id: string | null;
  status: string | null;
};

type CommissionPlanScheduleItemRow = {
  commission_plan_id: string | null;
  id: string;
  organization_id: string | null;
};

type SnapshotRow = {
  contract_id: string | null;
  id: string;
  organization_id: string | null;
  superseded_at: string | null;
};

type SnapshotItemRow = {
  id: string;
  organization_id: string | null;
  snapshot_id: string | null;
};

type ScheduleRow = {
  contract_id: string | null;
  id: string;
  organization_id: string | null;
  snapshot_id: string | null;
  snapshot_item_id: string | null;
};

type ExpectedRevenueRow = {
  commission_schedule_item_id: string | null;
  contract_id: string | null;
  id: string;
  organization_id: string | null;
  snapshot_id: string | null;
  snapshot_item_id: string | null;
};

type RequestContext = {
  profile: IntegrityProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "master" | "sdr";
  };
  supabase: ReturnType<typeof createServerIntegritySupabaseClient>;
  user: SupabaseUser;
};

type AnyOrgReadClient = {
  from(table: "commission_plans"): {
    select(columns: string): {
      in(column: string, values: string[]): PromiseLike<{
        data: CommissionPlanRow[] | null;
        error: unknown;
      }>;
    };
  };
};

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

const contractColumns = [
  "id",
  "organization_id",
  "contract_number",
  "status",
  "client_id",
  "administrator_id",
  "commission_plan_id",
  "credit_amount",
].join(",");

const commissionPlanColumns = [
  "id",
  "organization_id",
  "administrator_id",
  "name",
  "status",
].join(",");

export async function listMasterDataIntegrityContracts(
  accessToken: string | null,
): Promise<MasterDataIntegrityContractsResult> {
  const context = await resolveIntegrityRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const organizationId = context.profile.organization_id;
  const contractsResult = await loadContracts(context);

  if (!contractsResult.ok) {
    return contractsResult;
  }

  const contracts = contractsResult.contracts;
  const contractsById = new Map(contracts.map((contract) => [contract.id, contract]));
  const contractIds = contracts.map((contract) => contract.id);
  const clientIds = uniqueValues(contracts.map((contract) => contract.client_id));
  const administratorIds = uniqueValues(
    contracts.map((contract) => contract.administrator_id),
  );
  const clientsResult = await loadClients(context, clientIds);

  if (!clientsResult.ok) {
    return clientsResult;
  }

  const administratorsResult = await loadAdministrators(
    context,
    administratorIds,
  );

  if (!administratorsResult.ok) {
    return administratorsResult;
  }

  const commissionPlanIds = uniqueValues(
    contracts.map((contract) => contract.commission_plan_id),
  );
  const sameOrgPlansResult = await loadCommissionPlansForOrganization(
    context,
    commissionPlanIds,
  );

  if (!sameOrgPlansResult.ok) {
    return sameOrgPlansResult;
  }

  const anyOrgPlansResult = await loadCommissionPlansAnyOrganization(
    commissionPlanIds,
  );
  const planScheduleItemsResult = await loadCommissionPlanScheduleItems(
    context,
    commissionPlanIds,
  );

  if (!planScheduleItemsResult.ok) {
    return planScheduleItemsResult;
  }

  const snapshotsResult = await loadSnapshots(context, contractIds);

  if (!snapshotsResult.ok) {
    return snapshotsResult;
  }

  const snapshots = snapshotsResult.snapshots;
  const snapshotsById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
  const snapshotsByContractId = groupBy(snapshots, (snapshot) => snapshot.contract_id);
  const snapshotIds = snapshots.map((snapshot) => snapshot.id);
  const snapshotItemsResult = await loadSnapshotItems(context, snapshotIds);

  if (!snapshotItemsResult.ok) {
    return snapshotItemsResult;
  }

  const snapshotItems = snapshotItemsResult.snapshotItems;
  const snapshotItemsById = new Map(
    snapshotItems.map((snapshotItem) => [snapshotItem.id, snapshotItem]),
  );
  const snapshotItemsBySnapshotId = groupBy(
    snapshotItems,
    (snapshotItem) => snapshotItem.snapshot_id,
  );
  const scheduleResult = await loadScheduleItems(context, contractIds);

  if (!scheduleResult.ok) {
    return scheduleResult;
  }

  const scheduleItems = scheduleResult.scheduleItems;
  const scheduleItemsById = new Map(
    scheduleItems.map((scheduleItem) => [scheduleItem.id, scheduleItem]),
  );
  const scheduleItemsByContractId = groupBy(
    scheduleItems,
    (scheduleItem) => scheduleItem.contract_id,
  );
  const expectedRevenueResult = await loadExpectedRevenueEntries(context);

  if (!expectedRevenueResult.ok) {
    return expectedRevenueResult;
  }

  const expectedRevenueEntries = expectedRevenueResult.expectedRevenueEntries;
  const expectedRevenueByContractId = groupBy(
    expectedRevenueEntries,
    (entry) => entry.contract_id,
  );
  const clientsById = new Map(
    clientsResult.clients.map((client) => [
      client.id,
      normalizeNullableText(client.name),
    ]),
  );
  const administratorsById = new Map(
    administratorsResult.administrators.map((administrator) => [
      administrator.id,
      normalizeNullableText(administrator.name),
    ]),
  );
  const sameOrgPlansById = new Map(
    sameOrgPlansResult.commissionPlans.map((plan) => [plan.id, plan]),
  );
  const anyOrgPlansById = new Map(
    anyOrgPlansResult.commissionPlans.map((plan) => [plan.id, plan]),
  );
  const planScheduleCounts = new Map<string, number>();

  for (const item of planScheduleItemsResult.scheduleItems) {
    if (!item.commission_plan_id) {
      continue;
    }

    planScheduleCounts.set(
      item.commission_plan_id,
      (planScheduleCounts.get(item.commission_plan_id) ?? 0) + 1,
    );
  }

  const issues: IntegrityIssue[] = [];
  const issuesByContractId = new Map<string, IntegrityIssue[]>();

  for (const contract of contracts) {
    const planId = contract.commission_plan_id;
    const sameOrgPlan = planId ? sameOrgPlansById.get(planId) ?? null : null;
    const anyOrgPlan = planId ? anyOrgPlansById.get(planId) ?? null : null;
    const planFound = Boolean(sameOrgPlan || anyOrgPlan);
    const scheduleItems = planId ? planScheduleCounts.get(planId) ?? 0 : 0;

    if (planId && !planFound && anyOrgPlansResult.lookupAvailable) {
      pushContractIssue(
        issues,
        issuesByContractId,
        contract.id,
        createIssue({
          code: "MDR-001",
          description:
            "O contrato referencia um plano de comissao que nao foi encontrado.",
          entityId: contract.id,
          entityType: "contract",
          metadata: {
            commissionPlanId: planId,
            contractNumber: contract.contract_number,
          },
          recommendation:
            "Validar o campo commission_plan_id do contrato e restaurar ou corrigir o plano referenciado.",
          severity: "error",
          title: "Plano inexistente",
        }),
      );
    }

    if (planId && anyOrgPlan && anyOrgPlan.organization_id !== organizationId) {
      pushContractIssue(
        issues,
        issuesByContractId,
        contract.id,
        createIssue({
          code: "MDR-003",
          description:
            "O contrato referencia um plano de comissao pertencente a outra organizacao.",
          entityId: contract.id,
          entityType: "contract",
          metadata: {
            commissionPlanId: planId,
            contractOrganizationId: organizationId,
            planOrganizationId: anyOrgPlan.organization_id,
          },
          recommendation:
            "Corrigir o commission_plan_id do contrato para um plano da mesma organizacao.",
          severity: "error",
          title: "Plano de outra organizacao",
        }),
      );
    }

    if (sameOrgPlan && scheduleItems === 0) {
      pushContractIssue(
        issues,
        issuesByContractId,
        contract.id,
        createIssue({
          code: "MDR-002",
          description:
            "O plano vinculado ao contrato nao possui itens de regua cadastrados.",
          entityId: contract.id,
          entityType: "contract",
          metadata: {
            commissionPlanId: sameOrgPlan.id,
            planName: sameOrgPlan.name,
          },
          recommendation:
            "Cadastrar ao menos um commission_plan_schedule_item antes de depender do Commission Engine para esse contrato.",
          severity: "error",
          title: "Plano sem schedule_items",
        }),
      );
    }

    if (
      sameOrgPlan &&
      contract.administrator_id &&
      sameOrgPlan.administrator_id &&
      contract.administrator_id !== sameOrgPlan.administrator_id
    ) {
      pushContractIssue(
        issues,
        issuesByContractId,
        contract.id,
        createIssue({
          code: "MDR-004",
          description:
            "A administradora do contrato diverge da administradora configurada no plano de comissao.",
          entityId: contract.id,
          entityType: "contract",
          metadata: {
            contractAdministratorId: contract.administrator_id,
            commissionPlanId: sameOrgPlan.id,
            planAdministratorId: sameOrgPlan.administrator_id,
          },
          recommendation:
            "Reconciliar o contrato e o plano para a mesma administradora antes de processar receita.",
          severity: "error",
          title: "Administrador divergente",
        }),
      );
    }

    if (sameOrgPlan?.status === "inactive") {
      pushContractIssue(
        issues,
        issuesByContractId,
        contract.id,
        createIssue({
          code: "MDR-005",
          description:
            "O contrato referencia um plano de comissao inativo.",
          entityId: contract.id,
          entityType: "contract",
          metadata: {
            commissionPlanId: sameOrgPlan.id,
            planName: sameOrgPlan.name,
            planStatus: sameOrgPlan.status,
          },
          recommendation:
            "Confirmar se o contrato deve continuar apontando para esse plano legado ou ser reancorado para um plano operacional ativo.",
          severity: "warning",
          title: "Plano inactive",
        }),
      );
    }

    if (contract.status !== "active") {
      continue;
    }

    const contractSnapshots = snapshotsByContractId.get(contract.id) ?? [];
    const contractScheduleItems = scheduleItemsByContractId.get(contract.id) ?? [];
    const contractExpectedRevenue =
      expectedRevenueByContractId.get(contract.id) ?? [];

    if (contractSnapshots.length === 0) {
      pushContractIssue(
        issues,
        issuesByContractId,
        contract.id,
        createIssue({
          code: "MDR-006",
          description:
            "Contrato ativo ainda nao possui snapshot de comissao.",
          entityId: contract.id,
          entityType: "contract",
          metadata: {
            contractNumber: contract.contract_number,
            status: contract.status,
          },
          recommendation:
            "Executar a geracao de snapshot do Commission Engine ou corrigir o dado que impede sua criacao.",
          severity: "error",
          title: "Contrato active sem snapshot",
        }),
      );
    }

    if (contractScheduleItems.length === 0) {
      pushContractIssue(
        issues,
        issuesByContractId,
        contract.id,
        createIssue({
          code: "MDR-007",
          description:
            "Contrato ativo nao possui agenda de comissao gerada.",
          entityId: contract.id,
          entityType: "contract",
          metadata: {
            contractNumber: contract.contract_number,
            snapshotCount: contractSnapshots.length,
          },
          recommendation:
            "Garantir que o snapshot tenha itens suficientes para gerar contract_commission_schedule_items.",
          severity: "error",
          title: "Contrato active sem schedule",
        }),
      );
    }

    if (contractSnapshots.length > 0 && contractExpectedRevenue.length === 0) {
      pushContractIssue(
        issues,
        issuesByContractId,
        contract.id,
        createIssue({
          code: "MDR-008",
          description:
            "Contrato ativo tem snapshot de comissao, mas nao possui expected_revenue_entries.",
          entityId: contract.id,
          entityType: "contract",
          metadata: {
            contractNumber: contract.contract_number,
            snapshotCount: contractSnapshots.length,
            scheduleCount: contractScheduleItems.length,
          },
          recommendation:
            "Validar a ativacao do schedule por evento operacional e reprocessar o contrato quando houver agenda compatível.",
          severity: "error",
          title: "Contrato active sem expected revenue",
        }),
      );
    }
  }

  for (const snapshot of snapshots) {
    const items = snapshotItemsBySnapshotId.get(snapshot.id) ?? [];

    if (items.length > 0) {
      continue;
    }

    const contractId = snapshot.contract_id ?? "";
    const issue = createIssue({
      code: "MDR-010",
      description:
        "Snapshot de comissao foi criado sem itens associados.",
      entityId: snapshot.id,
      entityType: "contract_commission_snapshot",
      metadata: {
        contractId,
      },
      recommendation:
        "Revisar a origem do plano associado ao snapshot antes de reprocessar a agenda.",
      severity: "error",
      title: "Snapshot sem itens",
    });

    issues.push(issue);

    if (contractId && contractsById.has(contractId)) {
      attachIssueToContract(issuesByContractId, contractId, issue);
    }
  }

  for (const entry of expectedRevenueEntries) {
    const scheduleItem = entry.commission_schedule_item_id
      ? scheduleItemsById.get(entry.commission_schedule_item_id) ?? null
      : null;
    const snapshot = entry.snapshot_id
      ? snapshotsById.get(entry.snapshot_id) ?? null
      : null;
    const snapshotItem = entry.snapshot_item_id
      ? snapshotItemsById.get(entry.snapshot_item_id) ?? null
      : null;
    const contract = entry.contract_id
      ? contractsById.get(entry.contract_id) ?? null
      : null;
    const isOrphan =
      !contract ||
      !scheduleItem ||
      !snapshot ||
      !snapshotItem ||
      scheduleItem.contract_id !== entry.contract_id ||
      scheduleItem.snapshot_id !== entry.snapshot_id ||
      scheduleItem.snapshot_item_id !== entry.snapshot_item_id ||
      snapshot.contract_id !== entry.contract_id ||
      snapshotItem.snapshot_id !== entry.snapshot_id;

    if (!isOrphan) {
      continue;
    }

    const issue = createIssue({
      code: "MDR-009",
      description:
        "A expected_revenue_entry referencia entidades ausentes ou inconsistentes.",
      entityId: entry.id,
      entityType: "expected_revenue_entry",
      metadata: {
        commissionScheduleItemId: entry.commission_schedule_item_id,
        contractId: entry.contract_id,
        hasContract: Boolean(contract),
        hasScheduleItem: Boolean(scheduleItem),
        hasSnapshot: Boolean(snapshot),
        hasSnapshotItem: Boolean(snapshotItem),
        snapshotId: entry.snapshot_id,
        snapshotItemId: entry.snapshot_item_id,
      },
      recommendation:
        "Reconciliar ou cancelar a expected_revenue_entry antes de confiar no reconhecimento de receita desse contrato.",
      severity: "error",
      title: "Expected revenue orfa",
    });

    issues.push(issue);

    if (entry.contract_id && contractsById.has(entry.contract_id)) {
      attachIssueToContract(issuesByContractId, entry.contract_id, issue);
    }
  }

  const snapshotItemsCountByContractId = new Map<string, number>();

  for (const snapshot of snapshots) {
    const contractId = snapshot.contract_id;

    if (!contractId) {
      continue;
    }

    snapshotItemsCountByContractId.set(
      contractId,
      (snapshotItemsCountByContractId.get(contractId) ?? 0) +
        (snapshotItemsBySnapshotId.get(snapshot.id) ?? []).length,
    );
  }

  const contractRecords: MasterDataIntegrityContractRecord[] = contracts.map(
    (contract) => {
      const plan =
        (contract.commission_plan_id
          ? sameOrgPlansById.get(contract.commission_plan_id) ??
            anyOrgPlansById.get(contract.commission_plan_id) ??
            null
          : null);

      return {
        administratorId: contract.administrator_id,
        administratorName: contract.administrator_id
          ? administratorsById.get(contract.administrator_id) ?? null
          : null,
        clientId: contract.client_id,
        clientName: contract.client_id
          ? clientsById.get(contract.client_id) ?? null
          : null,
        commissionPlanId: contract.commission_plan_id,
        commissionPlanName: plan ? normalizeNullableText(plan.name) : null,
        commissionPlanStatus: plan ? normalizeNullableText(plan.status) : null,
        contractCommissionScheduleItemsCount:
          (scheduleItemsByContractId.get(contract.id) ?? []).length,
        contractId: contract.id,
        contractNumber: normalizeNullableText(contract.contract_number),
        creditAmount: normalizeNumber(contract.credit_amount) ?? 0,
        expectedRevenueEntriesCount:
          (expectedRevenueByContractId.get(contract.id) ?? []).length,
        hasSnapshot: (snapshotsByContractId.get(contract.id) ?? []).length > 0,
        issues: issuesByContractId.get(contract.id) ?? [],
        planScheduleItemsCount: contract.commission_plan_id
          ? planScheduleCounts.get(contract.commission_plan_id) ?? 0
          : 0,
        snapshotCount: (snapshotsByContractId.get(contract.id) ?? []).length,
        snapshotItemsCount: snapshotItemsCountByContractId.get(contract.id) ?? 0,
        status: normalizeNullableText(contract.status) ?? "unknown",
      };
    },
  );
  const response: MasterDataIntegrityContractsResponse = {
    contracts: contractRecords,
    issues,
    summary: {
      contractsWithIssues: contractRecords.filter(
        (contract) => contract.issues.length > 0,
      ).length,
      errors: issues.filter((issue) => issue.severity === "error").length,
      scannedAt: new Date().toISOString(),
      totalContracts: contracts.length,
      totalIssues: issues.length,
      warnings: issues.filter((issue) => issue.severity === "warning").length,
    },
  };

  return {
    ok: true,
    response,
  };
}

async function loadContracts(context: RequestContext) {
  const { data, error } = await context.supabase
    .from("contracts")
    .select(contractColumns)
    .eq("organization_id", context.profile.organization_id)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      error: "Nao foi possivel carregar contratos para o diagnostico.",
      ok: false as const,
      status: 500,
    };
  }

  return {
    contracts: ((data ?? []) as unknown as ContractRow[]).filter(
      (contract) => contract.organization_id === context.profile.organization_id,
    ),
    ok: true as const,
  };
}

async function loadClients(context: RequestContext, clientIds: string[]) {
  if (!clientIds.length) {
    return {
      clients: [] as ClientRow[],
      ok: true as const,
    };
  }

  const { data, error } = await context.supabase
    .from("clients")
    .select("id, organization_id, name")
    .eq("organization_id", context.profile.organization_id)
    .in("id", clientIds);

  if (error) {
    return {
      error: "Nao foi possivel carregar clientes para o diagnostico.",
      ok: false as const,
      status: 500,
    };
  }

  return {
    clients: ((data ?? []) as unknown as ClientRow[]).filter(
      (client) => client.organization_id === context.profile.organization_id,
    ),
    ok: true as const,
  };
}

async function loadAdministrators(
  context: RequestContext,
  administratorIds: string[],
) {
  if (!administratorIds.length) {
    return {
      administrators: [] as AdministratorRow[],
      ok: true as const,
    };
  }

  const { data, error } = await context.supabase
    .from("administrators")
    .select("id, organization_id, name")
    .eq("organization_id", context.profile.organization_id)
    .in("id", administratorIds);

  if (error) {
    return {
      error: "Nao foi possivel carregar administradoras para o diagnostico.",
      ok: false as const,
      status: 500,
    };
  }

  return {
    administrators: ((data ?? []) as unknown as AdministratorRow[]).filter(
      (administrator) =>
        administrator.organization_id === context.profile.organization_id,
    ),
    ok: true as const,
  };
}

async function loadCommissionPlansForOrganization(
  context: RequestContext,
  commissionPlanIds: string[],
) {
  if (!commissionPlanIds.length) {
    return {
      commissionPlans: [] as CommissionPlanRow[],
      ok: true as const,
    };
  }

  const { data, error } = await context.supabase
    .from("commission_plans")
    .select(commissionPlanColumns)
    .eq("organization_id", context.profile.organization_id)
    .in("id", commissionPlanIds);

  if (error) {
    return {
      error: "Nao foi possivel carregar planos de comissao para o diagnostico.",
      ok: false as const,
      status: 500,
    };
  }

  return {
    commissionPlans: ((data ?? []) as unknown as CommissionPlanRow[]).filter(
      (plan) => plan.organization_id === context.profile.organization_id,
    ),
    ok: true as const,
  };
}

async function loadCommissionPlansAnyOrganization(commissionPlanIds: string[]) {
  if (!commissionPlanIds.length) {
    return {
      commissionPlans: [] as CommissionPlanRow[],
      lookupAvailable: false as const,
      ok: true as const,
    };
  }

  const supabase = createServerIntegrityAdminClient();

  if (!supabase) {
    return {
      commissionPlans: [] as CommissionPlanRow[],
      lookupAvailable: false as const,
      ok: true as const,
    };
  }

  const { data, error } = await supabase
    .from("commission_plans")
    .select(commissionPlanColumns)
    .in("id", commissionPlanIds);

  if (error) {
    return {
      commissionPlans: [] as CommissionPlanRow[],
      lookupAvailable: false as const,
      ok: true as const,
    };
  }

  return {
    commissionPlans: (data ?? []) as CommissionPlanRow[],
    lookupAvailable: true as const,
    ok: true as const,
  };
}

async function loadCommissionPlanScheduleItems(
  context: RequestContext,
  commissionPlanIds: string[],
) {
  if (!commissionPlanIds.length) {
    return {
      ok: true as const,
      scheduleItems: [] as CommissionPlanScheduleItemRow[],
    };
  }

  const { data, error } = await context.supabase
    .from("commission_plan_schedule_items")
    .select("id, organization_id, commission_plan_id")
    .eq("organization_id", context.profile.organization_id)
    .in("commission_plan_id", commissionPlanIds);

  if (error) {
    return {
      error: "Nao foi possivel carregar a regua dos planos para o diagnostico.",
      ok: false as const,
      status: 500,
    };
  }

  return {
    ok: true as const,
    scheduleItems: ((data ?? []) as CommissionPlanScheduleItemRow[]).filter(
      (item) => item.organization_id === context.profile.organization_id,
    ),
  };
}

async function loadSnapshots(context: RequestContext, contractIds: string[]) {
  if (!contractIds.length) {
    return {
      ok: true as const,
      snapshots: [] as SnapshotRow[],
    };
  }

  const { data, error } = await context.supabase
    .from("contract_commission_snapshots")
    .select("id, organization_id, contract_id, superseded_at")
    .eq("organization_id", context.profile.organization_id)
    .in("contract_id", contractIds)
    .is("superseded_at", null);

  if (error) {
    return {
      error: "Nao foi possivel carregar snapshots de comissao para o diagnostico.",
      ok: false as const,
      status: 500,
    };
  }

  return {
    ok: true as const,
    snapshots: ((data ?? []) as SnapshotRow[]).filter(
      (snapshot) => snapshot.organization_id === context.profile.organization_id,
    ),
  };
}

async function loadSnapshotItems(context: RequestContext, snapshotIds: string[]) {
  if (!snapshotIds.length) {
    return {
      ok: true as const,
      snapshotItems: [] as SnapshotItemRow[],
    };
  }

  const { data, error } = await context.supabase
    .from("contract_commission_snapshot_items")
    .select("id, organization_id, snapshot_id")
    .eq("organization_id", context.profile.organization_id)
    .in("snapshot_id", snapshotIds);

  if (error) {
    return {
      error:
        "Nao foi possivel carregar itens de snapshot de comissao para o diagnostico.",
      ok: false as const,
      status: 500,
    };
  }

  return {
    ok: true as const,
    snapshotItems: ((data ?? []) as SnapshotItemRow[]).filter(
      (snapshotItem) =>
        snapshotItem.organization_id === context.profile.organization_id,
    ),
  };
}

async function loadScheduleItems(context: RequestContext, contractIds: string[]) {
  if (!contractIds.length) {
    return {
      ok: true as const,
      scheduleItems: [] as ScheduleRow[],
    };
  }

  const { data, error } = await context.supabase
    .from("contract_commission_schedule_items")
    .select("id, organization_id, contract_id, snapshot_id, snapshot_item_id")
    .eq("organization_id", context.profile.organization_id)
    .in("contract_id", contractIds);

  if (error) {
    return {
      error: "Nao foi possivel carregar agenda de comissao para o diagnostico.",
      ok: false as const,
      status: 500,
    };
  }

  return {
    ok: true as const,
    scheduleItems: ((data ?? []) as ScheduleRow[]).filter(
      (scheduleItem) =>
        scheduleItem.organization_id === context.profile.organization_id,
    ),
  };
}

async function loadExpectedRevenueEntries(context: RequestContext) {
  const { data, error } = await context.supabase
    .from("expected_revenue_entries")
    .select(
      [
        "id",
        "organization_id",
        "contract_id",
        "commission_schedule_item_id",
        "snapshot_id",
        "snapshot_item_id",
      ].join(","),
    )
    .eq("organization_id", context.profile.organization_id);

  if (error) {
    return {
      error:
        "Nao foi possivel carregar expected_revenue_entries para o diagnostico.",
      ok: false as const,
      status: 500,
    };
  }

  return {
    expectedRevenueEntries:
      ((data ?? []) as unknown as ExpectedRevenueRow[]).filter(
      (entry) => entry.organization_id === context.profile.organization_id,
      ),
    ok: true as const,
  };
}

function createServerIntegritySupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase integrity server environment is not configured.");
  }

  return createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

function createServerIntegrityAdminClient(): AnyOrgReadClient | null {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  if (serviceRoleKey.startsWith("sb_secret_")) {
    return new PostgrestClient(`${supabaseUrl}/rest/v1`, {
      fetch: async (input, init) => {
        const headers = new Headers(init?.headers);
        headers.delete("Authorization");
        headers.set("apikey", serviceRoleKey);

        return fetch(input, {
          ...init,
          headers,
        });
      },
      headers: {
        apikey: serviceRoleKey,
      },
      schema: "public",
    }) as unknown as AnyOrgReadClient;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  }) as unknown as AnyOrgReadClient;
}

async function resolveIntegrityRequestContext(accessToken: string | null) {
  if (!accessToken) {
    return {
      error: "Sessao invalida.",
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerIntegritySupabaseClient(accessToken);
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return {
        error: "Sessao invalida.",
        ok: false as const,
        status: 401,
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, organization_id, role, is_active")
      .eq("id", userData.user.id)
      .maybeSingle<IntegrityProfile>();

    if (profileError || !isValidProfile(profile)) {
      return {
        error: "Perfil nao encontrado.",
        ok: false as const,
        status: 403,
      };
    }

    return {
      ok: true as const,
      profile,
      supabase,
      user: userData.user,
    };
  } catch {
    return {
      error: genericAccessError,
      ok: false as const,
      status: 500,
    };
  }
}

function createIssue(issue: IntegrityIssue) {
  return issue;
}

function pushContractIssue(
  allIssues: IntegrityIssue[],
  issuesByContractId: Map<string, IntegrityIssue[]>,
  contractId: string,
  issue: IntegrityIssue,
) {
  allIssues.push(issue);
  attachIssueToContract(issuesByContractId, contractId, issue);
}

function attachIssueToContract(
  issuesByContractId: Map<string, IntegrityIssue[]>,
  contractId: string,
  issue: IntegrityIssue,
) {
  issuesByContractId.set(contractId, [
    ...(issuesByContractId.get(contractId) ?? []),
    issue,
  ]);
}

function groupBy<T>(
  values: T[],
  getKey: (value: T) => string | null,
) {
  const map = new Map<string, T[]>();

  for (const value of values) {
    const key = getKey(value);

    if (!key) {
      continue;
    }

    map.set(key, [...(map.get(key) ?? []), value]);
  }

  return map;
}

function uniqueValues(values: Array<string | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function normalizeNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function normalizeNumber(value: number | string | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isValidProfile(
  profile: IntegrityProfile | null,
): profile is IntegrityProfile & {
  is_active: true;
  organization_id: string;
  role: "admin" | "master" | "sdr";
} {
  return Boolean(
    profile &&
      profile.is_active === true &&
      typeof profile.organization_id === "string" &&
      profile.organization_id.trim() &&
      (profile.role === "admin" ||
        profile.role === "master" ||
        profile.role === "sdr"),
  );
}
