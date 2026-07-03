"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { readSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import {
  createAdministrator,
  fetchAdministrators,
} from "@/modules/administrators/client";
import type { Administrator } from "@/modules/administrators/types";
import { fetchCommissionPlans } from "@/modules/commission-plans/client";
import type { CommissionPlan } from "@/modules/commission-plans/types";
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
import { createContract } from "@/modules/contracts/client";
import type { ContractStatus } from "@/modules/contracts/types";
import { createExpectedContractRevenue } from "@/modules/revenue/client";
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

type ContractCreationFormState = {
  administratorId: string;
  commissionPlanId: string;
  contemplationModel: string;
  contractNumber: string;
  creditAmount: string;
  expectedCommissionAmount: string;
  expectedCommissionDueDate: string;
  installmentAmount: string;
  productType: string;
  status: ContractStatus;
  termMonths: string;
};

const emptyContractCreationForm: ContractCreationFormState = {
  administratorId: "",
  commissionPlanId: "",
  contemplationModel: "",
  contractNumber: "",
  creditAmount: "",
  expectedCommissionAmount: "",
  expectedCommissionDueDate: "",
  installmentAmount: "",
  productType: "",
  status: "active",
  termMonths: "",
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
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    initialClientId ?? null,
  );
  const [selectedClientDetail, setSelectedClientDetail] =
    useState<ClientDetailResponse | null>(null);
  const [search, setSearch] = useState("");
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isContractFormOpen, setIsContractFormOpen] = useState(false);
  const [isLoadingContractOptions, setIsLoadingContractOptions] =
    useState(false);
  const [isSavingContract, setIsSavingContract] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [contractError, setContractError] = useState<string | null>(null);
  const [contractSuccessMessage, setContractSuccessMessage] =
    useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [commissionPlans, setCommissionPlans] = useState<CommissionPlan[]>([]);
  const [contractForm, setContractForm] = useState<ContractCreationFormState>(
    emptyContractCreationForm,
  );
  const [newAdministratorName, setNewAdministratorName] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const selectedClientContext = useMemo(
    () => toClientContext(selectedClientDetail),
    [selectedClientDetail],
  );
  const selectedClientIsOutsideCurrentResults = Boolean(
    selectedClientDetail &&
      !clients.some((client) => client.id === selectedClientDetail.client.id),
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
          setClientsError("Sessao invalida para carregar os clientes.");
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
          if (current) {
            return current;
          }

          if (initialClientId) {
            return initialClientId;
          }

          return loadedClients[0]?.id ?? null;
        });

        if (!loadedClients.length && !initialClientId) {
          setSelectedClientDetail(null);
          onClientContextChange(emptyClientContext);
        }
      } catch (error) {
        if (isActive) {
          setClientsError(resolveClientPageError(error, "Nao foi possivel carregar os clientes."));
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
  }, [initialClientId, onClientContextChange, refreshVersion, search]);

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
          setDetailError("Sessao invalida para carregar o cliente.");
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
      } catch (error) {
        if (isActive) {
          setDetailError(resolveClientPageError(error, "Nao foi possivel carregar o cliente."));
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

  useEffect(() => {
    let isActive = true;

    async function loadContractOptions() {
      if (!isContractFormOpen || !selectedClientDetail) {
        return;
      }

      setIsLoadingContractOptions(true);
      setContractError(null);

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setContractError("Sessao invalida para carregar dados do contrato.");
          setIsLoadingContractOptions(false);
        }
        return;
      }

      try {
        const loadedAdministrators = await fetchAdministrators(accessToken, {
          limit: 100,
          status: "active",
        });
        const loadedCommissionPlans = contractForm.administratorId
          ? await fetchCommissionPlans(accessToken, {
              administratorId: contractForm.administratorId,
              limit: 100,
              status: "active",
            })
          : [];

        if (isActive) {
          setAdministrators(loadedAdministrators);
          setCommissionPlans(loadedCommissionPlans);
        }
      } catch (error) {
        if (isActive) {
          setContractError(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar dados do contrato.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoadingContractOptions(false);
        }
      }
    }

    void loadContractOptions();

    return () => {
      isActive = false;
    };
  }, [contractForm.administratorId, isContractFormOpen, selectedClientDetail]);

  function updateContractForm(patch: Partial<ContractCreationFormState>) {
    setContractForm((current) => ({
      ...current,
      ...patch,
    }));
  }

  async function handleCreateMinimalAdministrator() {
    const name = newAdministratorName.trim();

    if (!name) {
      setContractError("Informe o nome da administradora.");
      return;
    }

    const accessToken = await readSupabaseAccessToken();

    if (!accessToken) {
      setContractError("Sessao invalida para criar administradora.");
      return;
    }

    setIsLoadingContractOptions(true);
    setContractError(null);

    try {
      const administrator = await createAdministrator(accessToken, {
        name,
        status: "active",
      });

      setAdministrators((current) => [...current, administrator]);
      setNewAdministratorName("");
      updateContractForm({ administratorId: administrator.id });
    } catch (error) {
      setContractError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel criar a administradora.",
      );
    } finally {
      setIsLoadingContractOptions(false);
    }
  }

  async function handleCreateContract() {
    if (!selectedClientDetail) {
      return;
    }

    const creditAmount = parseRequiredCurrencyValue(contractForm.creditAmount);

    if (creditAmount === null) {
      setContractError("Informe o valor de credito do contrato.");
      return;
    }

    const installmentAmount = parseOptionalCurrencyValue(
      contractForm.installmentAmount,
    );
    const expectedCommissionAmount = parseOptionalCurrencyValue(
      contractForm.expectedCommissionAmount,
    );
    const termMonths = parseOptionalPositiveInteger(contractForm.termMonths);

    if (installmentAmount === undefined) {
      setContractError("Valor de parcela invalido.");
      return;
    }

    if (expectedCommissionAmount === undefined) {
      setContractError("Valor de comissao esperada invalido.");
      return;
    }

    if (termMonths === undefined) {
      setContractError("Prazo do contrato invalido.");
      return;
    }

    const accessToken = await readSupabaseAccessToken();

    if (!accessToken) {
      setContractError("Sessao invalida para cadastrar contrato.");
      return;
    }

    setIsSavingContract(true);
    setContractError(null);
    setContractSuccessMessage(null);

    try {
      const contract = await createContract(accessToken, {
        administratorId: contractForm.administratorId || null,
        clientId: selectedClientDetail.client.id,
        commissionPlanId: contractForm.commissionPlanId || null,
        contemplationModel: normalizeOptionalFormText(
          contractForm.contemplationModel,
        ),
        contractNumber: normalizeOptionalFormText(contractForm.contractNumber),
        creditAmount,
        installmentAmount,
        metadata: {
          origin: "client_contract_creation_flow",
        },
        productType: normalizeOptionalFormText(contractForm.productType),
        status: contractForm.status,
        termMonths,
      });

      if (expectedCommissionAmount !== null) {
        await createExpectedContractRevenue(accessToken, contract.id, {
          dueDate:
            normalizeOptionalFormText(contractForm.expectedCommissionDueDate) ??
            null,
          expectedAmount: expectedCommissionAmount,
          metadata: {
            origin: "client_contract_creation_flow",
          },
        });
      }

      const refreshedDetail = await fetchClientById(
        accessToken,
        selectedClientDetail.client.id,
      );

      setSelectedClientDetail(refreshedDetail);
      onClientContextChange(toClientContext(refreshedDetail));
      setRefreshVersion((current) => current + 1);
      setContractForm(emptyContractCreationForm);
      setIsContractFormOpen(false);
      setContractSuccessMessage("Contrato cadastrado com sucesso.");
    } catch (error) {
      setContractError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel cadastrar o contrato.",
      );
    } finally {
      setIsSavingContract(false);
    }
  }

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

      {contractSuccessMessage ? (
        <p className="rounded-md border border-primary/25 bg-primary/[0.06] p-4 text-sm font-medium text-foreground">
          {contractSuccessMessage}
        </p>
      ) : null}

      {selectedClientDetail ? (
        <section className="executive-surface rounded-md p-5 text-card-foreground">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Operacao contratual
              </p>
              <h3 className="mt-1 text-base font-semibold text-foreground">
                Cadastrar contrato para {selectedClientDetail.client.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Registre contrato, administradora e receita esperada sem sair do
                cliente persistido.
              </p>
            </div>
            <button
              className="inline-flex h-10 items-center justify-center rounded-md border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              onClick={() => setIsContractFormOpen((current) => !current)}
              type="button"
            >
              {isContractFormOpen ? "Fechar cadastro" : "Cadastrar contrato"}
            </button>
          </div>

          {isContractFormOpen ? (
            <div className="mt-5 grid gap-4 rounded-md border bg-background/60 p-4">
              {contractError ? (
                <p className="rounded-md border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
                  {contractError}
                </p>
              ) : null}

              {isLoadingContractOptions ? (
                <p className="text-sm text-muted-foreground">
                  Carregando administradoras e planos de comissao...
                </p>
              ) : null}

              {!administrators.length ? (
                <div className="rounded-md border border-dashed bg-card p-4">
                  <p className="text-sm font-medium text-foreground">
                    Nenhuma administradora ativa encontrada.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                      onChange={(event) =>
                        setNewAdministratorName(event.target.value)
                      }
                      placeholder="Nome da administradora"
                      value={newAdministratorName}
                    />
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-md border bg-card px-4 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
                      disabled={isLoadingContractOptions}
                      onClick={handleCreateMinimalAdministrator}
                      type="button"
                    >
                      Criar administradora
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ContractFormField label="Administradora">
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    onChange={(event) =>
                      updateContractForm({
                        administratorId: event.target.value,
                        commissionPlanId: "",
                      })
                    }
                    value={contractForm.administratorId}
                  >
                    <option value="">Sem administradora</option>
                    {administrators.map((administrator) => (
                      <option key={administrator.id} value={administrator.id}>
                        {administrator.name}
                      </option>
                    ))}
                  </select>
                </ContractFormField>

                <ContractFormField label="Plano de comissao">
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    disabled={!contractForm.administratorId}
                    onChange={(event) =>
                      updateContractForm({ commissionPlanId: event.target.value })
                    }
                    value={contractForm.commissionPlanId}
                  >
                    <option value="">
                      {contractForm.administratorId
                        ? "Sem plano"
                        : "Selecione uma administradora"}
                    </option>
                    {commissionPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                  {contractForm.administratorId && !commissionPlans.length ? (
                    <p className="text-xs leading-5 text-muted-foreground">
                      Nenhum plano ativo encontrado para esta administradora.
                    </p>
                  ) : null}
                </ContractFormField>

                <ContractFormField label="Status">
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    onChange={(event) =>
                      updateContractForm({
                        status: event.target.value as ContractStatus,
                      })
                    }
                    value={contractForm.status}
                  >
                    <option value="active">Ativo</option>
                    <option value="draft">Rascunho</option>
                    <option value="pending_documentation">
                      Documentacao pendente
                    </option>
                    <option value="approved">Aprovado</option>
                  </select>
                </ContractFormField>

                <ContractFormInput
                  label="Numero do contrato"
                  onChange={(value) =>
                    updateContractForm({ contractNumber: value })
                  }
                  placeholder="Opcional"
                  value={contractForm.contractNumber}
                />
                <ContractFormInput
                  label="Produto"
                  onChange={(value) => updateContractForm({ productType: value })}
                  placeholder="Consorcio, carta, imovel..."
                  value={contractForm.productType}
                />
                <ContractFormInput
                  label="Credito"
                  onChange={(value) => updateContractForm({ creditAmount: value })}
                  placeholder="Ex: 250000"
                  type="number"
                  value={contractForm.creditAmount}
                />
                <ContractFormInput
                  label="Parcela"
                  onChange={(value) =>
                    updateContractForm({ installmentAmount: value })
                  }
                  placeholder="Opcional"
                  type="number"
                  value={contractForm.installmentAmount}
                />
                <ContractFormInput
                  label="Prazo em meses"
                  onChange={(value) => updateContractForm({ termMonths: value })}
                  placeholder="Opcional"
                  type="number"
                  value={contractForm.termMonths}
                />
                <ContractFormInput
                  label="Modelo de contemplacao"
                  onChange={(value) =>
                    updateContractForm({ contemplationModel: value })
                  }
                  placeholder="Opcional"
                  value={contractForm.contemplationModel}
                />
                <ContractFormInput
                  label="Comissao esperada"
                  onChange={(value) =>
                    updateContractForm({ expectedCommissionAmount: value })
                  }
                  placeholder="Opcional"
                  type="number"
                  value={contractForm.expectedCommissionAmount}
                />
                <ContractFormInput
                  label="Vencimento da comissao"
                  onChange={(value) =>
                    updateContractForm({ expectedCommissionDueDate: value })
                  }
                  type="date"
                  value={contractForm.expectedCommissionDueDate}
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-md border bg-card px-4 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
                  disabled={isSavingContract}
                  onClick={() => {
                    setContractForm(emptyContractCreationForm);
                    setContractError(null);
                    setIsContractFormOpen(false);
                  }}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-md border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                  disabled={isSavingContract}
                  onClick={handleCreateContract}
                  type="button"
                >
                  {isSavingContract ? "Salvando..." : "Salvar contrato"}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {selectedClientIsOutsideCurrentResults ? (
        <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
          Cliente selecionado carregado diretamente. Ele pode estar fora do
          filtro atual da busca.
        </p>
      ) : null}

      {!clientsError && !isLoadingClients && !clients.length && !selectedClientId ? (
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

      {clients.length || selectedClientId ? (
        <div
          className={
            clients.length
              ? "grid gap-5 xl:grid-cols-[0.95fr_1.4fr]"
              : "grid gap-5"
          }
        >
          {clients.length ? (
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
                      <span>
                        {currencyFormatter.format(client.totalCreditAmount)}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Atualizado em {formatDate(client.updatedAt)}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

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

function ContractFormField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      {label}
      {children}
    </label>
  );
}

function ContractFormInput({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "date" | "number" | "text";
  value: string;
}) {
  return (
    <ContractFormField label={label}>
      <input
        className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
        min={type === "number" ? "0" : undefined}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step={type === "number" ? "0.01" : undefined}
        type={type}
        value={value}
      />
    </ContractFormField>
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
          label="Plano"
          value={contract.commissionPlanName ?? "Nao vinculado"}
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

function resolveClientPageError(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateTimeFormatter.format(date);
}

function normalizeOptionalFormText(value: string) {
  const trimmed = value.trim();

  return trimmed || null;
}

function parseRequiredCurrencyValue(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseOptionalCurrencyValue(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseOptionalPositiveInteger(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
