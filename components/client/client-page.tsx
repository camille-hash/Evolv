"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  fetchClientById,
  fetchClients,
} from "@/modules/clients/client";
import type {
  ClientContract,
  ClientDetailResponse,
  ClientListItem,
} from "@/modules/clients/types";
import {
  emptyClientContext,
  type ClientContext,
} from "@/modules/client-context";
import { generateEvolvMasterReport } from "@/modules/reports";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const contractStatusLabels: Record<ClientContract["status"], string> = {
  active: "Ativo",
  approved: "Aprovado",
  cancelled: "Cancelado",
  completed: "Concluido",
  draft: "Rascunho",
  pending_documentation: "Documentacao pendente",
  rejected: "Rejeitado",
  submitted: "Enviado",
};

export function ClientPage({
  initialClientId,
  notice,
  onClientContextChange,
}: {
  initialClientId?: string | null;
  notice?: string | null;
  onClientContextChange: (context: ClientContext) => void;
}) {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientDetail, setSelectedClientDetail] =
    useState<ClientDetailResponse | null>(null);
  const [search, setSearch] = useState("");
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const selectedClientContext = useMemo(
    () => toClientContext(selectedClientDetail),
    [selectedClientDetail],
  );

  useEffect(() => {
    let isActive = true;

    async function loadClients() {
      setIsLoadingClients(true);
      setClientsError(null);

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setIsLoadingClients(false);
          setClientsError("Nao foi possivel carregar os clientes.");
          onClientContextChange(emptyClientContext);
        }
        return;
      }

      try {
        const loadedClients = await fetchClients(accessToken, {
          limit: 50,
          search: search.trim() || null,
        });

        if (!isActive) {
          return;
        }

        setClients(loadedClients);
        setSelectedClientId((current) => {
          if (current && loadedClients.some((client) => client.id === current)) {
            return current;
          }

          if (
            initialClientId &&
            loadedClients.some((client) => client.id === initialClientId)
          ) {
            return initialClientId;
          }

          return loadedClients[0]?.id ?? null;
        });

        if (!loadedClients.length) {
          setSelectedClientDetail(null);
          onClientContextChange(emptyClientContext);
        }
      } catch {
        if (isActive) {
          setClientsError("Nao foi possivel carregar os clientes.");
          onClientContextChange(emptyClientContext);
        }
      } finally {
        if (isActive) {
          setIsLoadingClients(false);
        }
      }
    }

    void loadClients();

    return () => {
      isActive = false;
    };
  }, [initialClientId, onClientContextChange, search]);

  useEffect(() => {
    let isActive = true;

    async function loadSelectedClient() {
      if (!selectedClientId) {
        setSelectedClientDetail(null);
        return;
      }

      setIsLoadingDetail(true);
      setDetailError(null);

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setIsLoadingDetail(false);
          setDetailError("Nao foi possivel carregar o cliente.");
          onClientContextChange(emptyClientContext);
        }
        return;
      }

      try {
        const detail = await fetchClientById(accessToken, selectedClientId);

        if (isActive) {
          setSelectedClientDetail(detail);
          onClientContextChange(toClientContext(detail));
        }
      } catch {
        if (isActive) {
          setDetailError("Nao foi possivel carregar o cliente.");
          onClientContextChange(emptyClientContext);
        }
      } finally {
        if (isActive) {
          setIsLoadingDetail(false);
        }
      }
    }

    void loadSelectedClient();

    return () => {
      isActive = false;
    };
  }, [onClientContextChange, selectedClientId]);

  return (
    <section className="grid gap-6">
      <section className="executive-surface rounded-md p-6 text-card-foreground sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Cliente persistido
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              Clientes e Contratos
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Leitura operacional baseada em clientes e contratos persistidos no
              Supabase.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="grid gap-2 text-sm font-medium text-foreground">
              Buscar cliente
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome, email ou telefone"
                value={search}
              />
            </label>
            <button
              className="inline-flex h-10 items-center justify-center rounded-md border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 sm:self-end"
              disabled={!selectedClientDetail}
              onClick={() => generateEvolvMasterReport(selectedClientContext)}
              title={
                selectedClientDetail
                  ? "Gerar Dossie EVOLV para o cliente selecionado"
                  : "Selecione um cliente persistido para gerar o Dossie EVOLV"
              }
              type="button"
            >
              Gerar Dossie EVOLV
            </button>
          </div>
        </div>
      </section>

      {clientsError ? (
        <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
          {clientsError}
        </p>
      ) : null}

      {notice ? (
        <p className="rounded-md border border-primary/25 bg-primary/[0.06] p-4 text-sm font-medium text-foreground">
          {notice}
        </p>
      ) : null}

      {!clientsError && !isLoadingClients && !clients.length ? (
        <section className="executive-surface rounded-md p-7 text-card-foreground">
          <p className="text-sm font-semibold text-foreground">
            Nenhum cliente persistido ainda.
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Clientes serao criados a partir de contratos originados no CRM.
          </p>
        </section>
      ) : null}

      {isLoadingClients ? (
        <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
          Carregando clientes persistidos...
        </p>
      ) : null}

      {clients.length ? (
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.4fr]">
          <section className="executive-surface rounded-md p-5 text-card-foreground">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Lista
                </p>
                <h3 className="mt-1 text-base font-semibold text-foreground">
                  Clientes persistidos
                </h3>
              </div>
              <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {clients.length}
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {clients.map((client) => (
                <button
                  className={`rounded-md border p-4 text-left transition ${
                    selectedClientId === client.id
                      ? "border-primary/60 bg-primary/[0.06]"
                      : "bg-background/70 hover:border-primary/40"
                  }`}
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  type="button"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{client.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {client.email ?? client.phone ?? "Contato nao informado"}
                      </p>
                    </div>
                    <span className="rounded-full border bg-card px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {client.status}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                    <span>{client.contractsCount} contratos</span>
                    <span>{client.activeContractsCount} ativos</span>
                    <span>{currencyFormatter.format(client.totalCreditAmount)}</span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Atualizado em {formatDate(client.updatedAt)}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-4">
            {isLoadingDetail ? (
              <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
                Carregando detalhe do cliente...
              </p>
            ) : detailError ? (
              <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
                {detailError}
              </p>
            ) : selectedClientDetail ? (
              <ClientPersistedDetail detail={selectedClientDetail} />
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}

function ClientPersistedDetail({ detail }: { detail: ClientDetailResponse }) {
  return (
    <>
      <section className="executive-surface rounded-md p-5 text-card-foreground">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Dados do cliente
            </p>
            <h3 className="mt-1 text-xl font-semibold text-foreground">
              {detail.client.name}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {detail.client.email ?? detail.client.phone ?? "Contato nao informado"}
            </p>
          </div>
          <span className="rounded-full border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {detail.client.status}
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ClientSummaryItem
            label="Criado em"
            value={formatDate(detail.client.createdAt)}
          />
          <ClientSummaryItem
            label="Atualizado em"
            value={formatDate(detail.client.updatedAt)}
          />
          <ClientSummaryItem
            label="Telefone"
            value={detail.client.phone ?? "Nao informado"}
          />
          <ClientSummaryItem
            label="Email"
            value={detail.client.email ?? "Nao informado"}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ClientSummaryCard
          label="Contratos"
          value={String(detail.summary.contractsCount)}
        />
        <ClientSummaryCard
          label="Contratos ativos"
          value={String(detail.summary.activeContractsCount)}
        />
        <ClientSummaryCard
          label="Rascunhos"
          value={String(detail.summary.draftContractsCount)}
        />
        <ClientSummaryCard
          label="Credito total"
          value={currencyFormatter.format(detail.summary.totalCreditAmount)}
        />
      </section>

      <section className="executive-surface rounded-md p-5 text-card-foreground">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Contratos vinculados
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            Historico contratual
          </h3>
        </div>
        {detail.contracts.length ? (
          <div className="mt-4 grid gap-3">
            {detail.contracts.map((contract) => (
              <ClientContractItem contract={contract} key={contract.id} />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
            Cliente sem contratos vinculados.
          </p>
        )}
      </section>
    </>
  );
}

function ClientContractItem({ contract }: { contract: ClientContract }) {
  return (
    <article className="rounded-md border bg-background/70 p-4 text-sm">
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

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <ClientSummaryItem
          label="Produto"
          value={contract.productType ?? "Nao informado"}
        />
        <ClientSummaryItem
          label="Credito"
          value={currencyFormatter.format(contract.creditAmount)}
        />
        <ClientSummaryItem
          label="Parcela"
          value={
            contract.installmentAmount === null
              ? "Nao informada"
              : currencyFormatter.format(contract.installmentAmount)
          }
        />
        <ClientSummaryItem
          label="Prazo"
          value={
            contract.termMonths === null
              ? "Nao informado"
              : `${contract.termMonths} meses`
          }
        />
        <ClientSummaryItem
          label="Lead"
          value={contract.leadId ?? "Nao vinculado"}
        />
      </div>
    </article>
  );
}

function ClientSummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="executive-surface rounded-md p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
    </article>
  );
}

function ClientSummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm leading-6 text-foreground">
        {value}
      </p>
    </div>
  );
}

async function readSupabaseAccessToken() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    return null;
  }

  return data.session.access_token;
}

function toClientContext(detail: ClientDetailResponse | null): ClientContext {
  if (!detail) {
    return emptyClientContext;
  }

  return {
    ...emptyClientContext,
    email: detail.client.email ?? "",
    nome: detail.client.name,
    observacoes: detail.summary.contractsCount
      ? `${detail.summary.contractsCount} contrato(s) persistido(s).`
      : "Cliente persistido sem contratos vinculados.",
    telefone: detail.client.phone ?? "",
  };
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateTimeFormatter.format(date);
}
