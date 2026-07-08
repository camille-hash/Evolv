import type { LeadContractSummary } from "@/modules/contracts/types";

const contractStatusLabels: Record<LeadContractSummary["status"], string> = {
  active: "Ativo",
  approved: "Aprovado",
  cancelled: "Cancelado",
  completed: "Concluido",
  draft: "Rascunho",
  inactive: "Inativo",
  pending_documentation: "Documentacao pendente",
  rejected: "Rejeitado",
  submitted: "Enviado",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function LeadContractsCard({
  contracts,
  error,
  isLoading,
}: {
  contracts: LeadContractSummary[];
  error: string | null;
  isLoading: boolean;
  leadId: string;
}) {
  if (isLoading) {
    return (
      <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
        Carregando contratos...
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
        {error}
      </p>
    );
  }

  if (!contracts.length) {
    return (
      <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
        Nenhum contrato criado para este lead.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {contracts.map((contract) => (
        <article
          className="rounded-md border bg-background/70 p-4 text-sm"
          key={contract.id}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">
                {contract.contractNumber
                  ? `Contrato ${contract.contractNumber}`
                  : "Contrato"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Criado em {formatDate(contract.createdAt)}
              </p>
            </div>
            <span className="rounded-full border bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {contractStatusLabels[contract.status]}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ContractMetric
              label="Credito"
              value={currencyFormatter.format(contract.creditAmount)}
            />
            <ContractMetric
              label="Grupo"
              value={contract.group ?? "Nao informado"}
            />
            <ContractMetric
              label="Cota"
              value={contract.quota ?? "Nao informada"}
            />
            <ContractMetric
              label="Produto"
              value={contract.productType ?? "Nao informado"}
            />
            <ContractMetric
              label="Administradora"
              value={contract.administratorId ?? "Nao informada"}
            />
            <ContractMetric
              label="Cliente"
              value={contract.clientId ?? "Nao vinculado"}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function ContractMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card/70 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter.format(date);
}
