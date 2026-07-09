import { listMasterDataIntegrityContracts } from "@/modules/master-data-integrity/server";
import type { MasterDataIntegrityContractRecord } from "@/modules/master-data-integrity/types";
import { listOperationsContracts } from "@/modules/operations/contracts-server";
import type { OperationsContractRow } from "@/modules/operations/contracts-types";
import { listOperationsRevenue } from "@/modules/operations/revenue-server";
import type { OperationsRevenueRow } from "@/modules/operations/revenue-types";
import type {
  OperationsWorkbenchResult,
  WorkbenchBucket,
  WorkbenchItem,
} from "./types";

export async function getOperationsWorkbench(
  accessToken: string | null,
): Promise<OperationsWorkbenchResult> {
  const [contractsResult, integrityResult, revenueResult] = await Promise.all([
    listOperationsContracts(accessToken),
    listMasterDataIntegrityContracts(accessToken),
    listOperationsRevenue(accessToken),
  ]);

  if (!contractsResult.ok) {
    return contractsResult;
  }

  if (!integrityResult.ok) {
    return integrityResult;
  }

  if (!revenueResult.ok) {
    return revenueResult;
  }

  const problemContractIds = new Set(
    integrityResult.response.contracts
      .filter((contract) => contract.issues.length > 0)
      .map((contract) => contract.contractId),
  );
  const workNowItems = buildWorkNowItems(
    contractsResult.contracts,
    problemContractIds,
  );
  const waitingItems = buildWaitingItems(
    contractsResult.contracts,
    revenueResult.entries,
    problemContractIds,
  );
  const problemItems = buildProblemItems(
    integrityResult.response.contracts,
    revenueResult.entries,
  );
  const completedTodayItems = buildCompletedTodayItems(
    contractsResult.contracts,
    revenueResult.entries,
  );

  return {
    ok: true,
    response: {
      buckets: [
        createBucket({
          id: "para_fazer_agora",
          title: "Para fazer agora",
          description: "Itens que ja pedem acao objetiva neste momento.",
          emptyTitle: "Nenhum item precisa da sua atencao agora.",
          emptyDescription:
            "Quando algo realmente pedir acao imediata, ele aparece aqui.",
          items: workNowItems,
        }),
        createBucket({
          id: "aguardando_retorno",
          title: "Aguardando retorno",
          description:
            "Itens em espera por resposta, pagamento, documentacao ou evolucao.",
          emptyTitle: "Nada aguardando retorno no momento.",
          emptyDescription:
            "Os itens que dependerem de retorno voltam para ca automaticamente na proxima leitura.",
          items: waitingItems,
        }),
        createBucket({
          id: "com_problema",
          title: "Com problema",
          description:
            "Itens com inconsistencia, divergencia ou risco operacional conhecido.",
          emptyTitle: "Nenhum problema encontrado.",
          emptyDescription:
            "A leitura atual nao encontrou problemas operacionais criticos ou avisos abertos.",
          items: problemItems,
        }),
        createBucket({
          id: "concluido_hoje",
          title: "Concluido hoje",
          description: "Entregas e baixas que ja avancaram hoje.",
          emptyTitle: "Nenhum trabalho concluido hoje.",
          emptyDescription:
            "Quando algo for concluido ao longo do dia, ele aparece aqui para acompanhamento rapido.",
          items: completedTodayItems,
        }),
      ],
      generatedAt: new Date().toISOString(),
    },
  };
}

function buildWorkNowItems(
  contracts: OperationsContractRow[],
  problemContractIds: Set<string>,
) {
  return contracts
    .filter((contract) => {
      const sourceStatus = normalizeText(contract.sourceStatus);

      return (
        !problemContractIds.has(contract.id) &&
        contract.status === "attention" &&
        sourceStatus !== "inactive" &&
        sourceStatus !== "approved" &&
        sourceStatus !== "pending_documentation" &&
        sourceStatus !== "submitted" &&
        sourceStatus !== "completed" &&
        sourceStatus !== "cancelled" &&
        sourceStatus !== "rejected"
      );
    })
    .slice(0, 8)
    .map((contract) => ({
      actionLabel: "Resolver",
      bucket: "para_fazer_agora",
      context: {
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        focus: "pendencia_contrato",
        sourceStatus: normalizeText(contract.sourceStatus) || undefined,
      },
      destinationType: "contrato",
      href: buildContractsResolutionHref(contract, "pendencia_contrato"),
      id: `contrato-atencao:${contract.id}`,
      proximaAcao: resolveContractAttentionNextAction(contract),
      recordId: contract.id,
      resumo: resolveContractAttentionSummary(contract),
      situacao: resolveContractSituation(contract),
      tipo: "Contrato em andamento",
      titulo: resolveContractTitle(contract),
      tone: "atencao",
    }) satisfies WorkbenchItem);
}

function buildWaitingItems(
  contracts: OperationsContractRow[],
  revenueEntries: OperationsRevenueRow[],
  problemContractIds: Set<string>,
) {
  const waitingContracts = contracts
    .filter((contract) => {
      const sourceStatus = normalizeText(contract.sourceStatus);

      return (
        !problemContractIds.has(contract.id) &&
        (sourceStatus === "approved" ||
          sourceStatus === "pending_documentation" ||
          sourceStatus === "submitted")
      );
    })
    .slice(0, 6)
    .map((contract) => ({
      actionLabel: "Resolver",
      bucket: "aguardando_retorno",
      context: {
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        focus: "aguardando_contrato",
        sourceStatus: normalizeText(contract.sourceStatus) || undefined,
      },
      destinationType: "contrato",
      href: buildContractsResolutionHref(contract, "aguardando_contrato"),
      id: `contrato-aguardando:${contract.id}`,
      proximaAcao:
        "Confirmar o retorno pendente e decidir o proximo passo do contrato.",
      recordId: contract.id,
      resumo:
        "O contrato ainda depende de avanco operacional antes de seguir para a proxima etapa.",
      situacao: resolveContractSourceSituation(contract.sourceStatus),
      tipo: "Contrato aguardando",
      titulo: resolveContractTitle(contract),
      tone: "neutro",
    }) satisfies WorkbenchItem);
  const waitingRevenue = revenueEntries
    .filter((entry) => entry.status === "pending" || entry.status === "expected")
    .slice(0, 6)
    .map((entry) => ({
      actionLabel: "Resolver",
      bucket: "aguardando_retorno",
      context: {
        contractId: entry.contractId,
        contractNumber: entry.contractNumber,
        focus: "receita_aguardando",
        revenueId: entry.id,
      },
      destinationType: "receita",
      href: buildRevenueResolutionHref(entry, "receita_aguardando"),
      id: `receita-aguardando:${entry.id}`,
      proximaAcao:
        "Acompanhar o retorno necessario para transformar a previsao em receita reconhecida.",
      recordId: entry.id,
      resumo: `Receita prevista para ${entry.clientName} ainda esta aguardando evolucao operacional.`,
      situacao: entry.dueDate
        ? `Prazo ${formatDate(entry.dueDate)}`
        : "Sem prazo definido",
      tipo: "Receita aguardando",
      titulo: resolveRevenueTitle(entry),
      tone: "neutro",
    }) satisfies WorkbenchItem);

  return [...waitingContracts, ...waitingRevenue].slice(0, 10);
}

function buildProblemItems(
  contracts: MasterDataIntegrityContractRecord[],
  revenueEntries: OperationsRevenueRow[],
) {
  const contractProblems = contracts
    .filter((contract) => contract.issues.length > 0)
    .map((contract) => {
      const errorCount = contract.issues.filter(
        (issue) => issue.severity === "error",
      ).length;
      const warningCount = contract.issues.length - errorCount;
      const firstIssue = contract.issues[0];

      return {
        actionLabel: "Resolver",
        bucket: "com_problema",
        context: {
          contractId: contract.contractId,
          contractNumber: contract.contractNumber ?? undefined,
          focus: "integridade_contrato",
          issueCode: firstIssue.code,
        },
        destinationType: "integridade",
        href: buildIntegrityResolutionHref(contract.contractId, firstIssue.code),
        id: `integridade:${contract.contractId}`,
        proximaAcao: firstIssue.recommendation,
        recordId: contract.contractId,
        resumo: firstIssue.description,
        situacao: `${errorCount} erro(s) e ${warningCount} aviso(s)`,
        tipo: "Integridade de contrato",
        titulo: resolveIntegrityTitle(contract),
        tone: errorCount > 0 ? "critico" : "atencao",
      } satisfies WorkbenchItem;
    });
  const revenueProblems = revenueEntries
    .filter(
      (entry) =>
        entry.status === "attention" || entry.attentionItems.length > 0,
    )
    .map((entry) => ({
      actionLabel: "Resolver",
      bucket: "com_problema",
      context: {
        contractId: entry.contractId,
        contractNumber: entry.contractNumber,
        focus: "receita_divergente",
        revenueId: entry.id,
      },
      destinationType: "receita",
      href: buildRevenueResolutionHref(entry, "receita_divergente"),
      id: `receita-problema:${entry.id}`,
      proximaAcao:
        "Revisar a divergencia da receita e conferir o contrato de origem.",
      recordId: entry.id,
      resumo:
        entry.attentionItems[0] ??
        "Existe uma divergencia operacional que impede confianca total na receita.",
      situacao: `Previsto ${formatCurrency(entry.expectedAmount)}`,
      tipo: "Receita com divergencia",
      titulo: resolveRevenueTitle(entry),
      tone: "critico",
    }) satisfies WorkbenchItem);

  return [...contractProblems, ...revenueProblems].slice(0, 12);
}

function buildCompletedTodayItems(
  contracts: OperationsContractRow[],
  revenueEntries: OperationsRevenueRow[],
) {
  const completedRevenue = revenueEntries
    .filter(
      (entry) =>
        entry.status === "recognized" && isToday(entry.paidAt ?? null),
    )
    .map((entry) => ({
      bucket: "concluido_hoje",
      id: `receita-concluida:${entry.id}`,
      proximaAcao:
        "Nenhuma acao imediata. Apenas acompanhar o fechamento do dia.",
      resumo: `Receita reconhecida para ${entry.clientName}.`,
      situacao: entry.paidAt
        ? `Concluido em ${formatDateTime(entry.paidAt)}`
        : "Concluido hoje",
      tipo: "Receita concluida",
      titulo: resolveRevenueTitle(entry),
      tone: "concluido",
    }) satisfies WorkbenchItem);
  const completedContracts = contracts
    .filter(
      (contract) =>
        (normalizeText(contract.sourceStatus) === "completed" ||
          normalizeText(contract.sourceStatus) === "inactive") &&
        isToday(contract.updatedAt ?? null),
    )
    .map((contract) => ({
      bucket: "concluido_hoje",
      id: `contrato-concluido:${contract.id}`,
      proximaAcao:
        "Nenhuma acao imediata. Conferir apenas se o fechamento do contrato foi refletido no restante da operacao.",
      resumo:
        normalizeText(contract.sourceStatus) === "inactive"
          ? "O contrato foi inativado hoje com ajuste operacional dos futuros."
          : "O contrato foi marcado como concluido hoje.",
      situacao: contract.updatedAt
        ? `Concluido em ${formatDateTime(contract.updatedAt)}`
        : "Concluido hoje",
      tipo:
        normalizeText(contract.sourceStatus) === "inactive"
          ? "Contrato inativado"
          : "Contrato concluido",
      titulo: resolveContractTitle(contract),
      tone: "concluido",
    }) satisfies WorkbenchItem);

  return [...completedRevenue, ...completedContracts]
    .sort((left, right) => right.situacao.localeCompare(left.situacao))
    .slice(0, 10);
}

function createBucket(input: WorkbenchBucket): WorkbenchBucket {
  return input;
}

function resolveContractAttentionSummary(contract: OperationsContractRow) {
  const firstAttention = contract.attentionItems[0];

  if (firstAttention) {
    return `O contrato precisa de revisao porque ha pendencia em aberto: ${translateAttentionItem(firstAttention)}.`;
  }

  return "O contrato pede revisao operacional.";
}

function resolveContractAttentionNextAction(contract: OperationsContractRow) {
  const firstAttention = contract.attentionItems[0];

  if (!firstAttention) {
    return "Abrir o contrato e decidir o proximo passo operacional.";
  }

  return `Abrir o contrato e resolver: ${translateAttentionItem(firstAttention)}.`;
}

function resolveContractSituation(contract: OperationsContractRow) {
  if (contract.sourceStatus) {
    return resolveContractSourceSituation(contract.sourceStatus);
  }

  return "Situacao operacional em revisao";
}

function resolveContractSourceSituation(sourceStatus: string | undefined) {
  const normalized = normalizeText(sourceStatus);

  if (normalized === "approved") {
    return "Aguardando ativacao";
  }

  if (normalized === "pending_documentation") {
    return "Aguardando documentacao";
  }

  if (normalized === "submitted") {
    return "Aguardando analise";
  }

  if (normalized === "active") {
    return "Contrato ativo";
  }

  if (normalized === "inactive") {
    return "Contrato inativado";
  }

  if (normalized === "completed") {
    return "Concluido";
  }

  return "Em andamento";
}

function resolveContractTitle(contract: OperationsContractRow) {
  if (contract.contractNumber) {
    return `${contract.clientName} - Contrato ${contract.contractNumber}`;
  }

  return `${contract.clientName} - Contrato sem numero`;
}

function resolveIntegrityTitle(contract: MasterDataIntegrityContractRecord) {
  if (contract.contractNumber) {
    return `${contract.clientName ?? "Cliente"} - Contrato ${contract.contractNumber}`;
  }

  return `${contract.clientName ?? "Cliente"} - Contrato sem numero`;
}

function resolveRevenueTitle(entry: OperationsRevenueRow) {
  if (entry.contractNumber) {
    return `${entry.clientName} - Contrato ${entry.contractNumber}`;
  }

  return `${entry.clientName} - Receita operacional`;
}

function translateAttentionItem(item: string) {
  if (item === "Missing linked client") {
    return "cliente nao vinculado";
  }

  if (item === "Missing linked administrator") {
    return "administradora nao vinculada";
  }

  if (item === "Missing contract number") {
    return "numero do contrato ausente";
  }

  if (item === "Zero estimated revenue") {
    return "receita estimada zerada";
  }

  if (item === "Recognized revenue greater than estimated revenue") {
    return "receita reconhecida maior que a estimada";
  }

  if (item === "Zero credit value") {
    return "valor de credito zerado";
  }

  return item;
}

function normalizeText(value: string | undefined | null) {
  return value?.trim().toLowerCase() ?? "";
}

function isToday(value: string | null) {
  if (!value) {
    return false;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const now = new Date();

  return (
    parsed.getUTCFullYear() === now.getUTCFullYear() &&
    parsed.getUTCMonth() === now.getUTCMonth() &&
    parsed.getUTCDate() === now.getUTCDate()
  );
}

function formatDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "sem data valida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(parsed);
}

function formatDateTime(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "horario indisponivel";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildContractsResolutionHref(
  contract: OperationsContractRow,
  focus: "aguardando_contrato" | "pendencia_contrato",
) {
  const searchParams = new URLSearchParams({
    contractId: contract.id,
    destino: "contrato",
    foco: focus,
    origem: "mesa",
  });
  const normalizedStatus = normalizeText(contract.sourceStatus);

  if (normalizedStatus) {
    searchParams.set("status", normalizedStatus);
  }

  return `/operations/contracts?${searchParams.toString()}`;
}

function buildRevenueResolutionHref(
  entry: OperationsRevenueRow,
  focus: "receita_aguardando" | "receita_divergente",
) {
  const searchParams = new URLSearchParams({
    contractId: entry.contractId,
    destino: "receita",
    entryId: entry.id,
    foco: focus,
    origem: "mesa",
    status: entry.status,
  });

  return `/operations/revenue?${searchParams.toString()}`;
}

function buildIntegrityResolutionHref(contractId: string, issueCode: string) {
  const searchParams = new URLSearchParams({
    issueCode,
    origem: "mesa",
  });

  return `/operations/integrity/${contractId}?${searchParams.toString()}`;
}
