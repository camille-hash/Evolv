"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchAdministrators } from "@/modules/administrators/client";
import type { Administrator } from "@/modules/administrators/types";
import {
  createCommissionPlan,
  fetchCommissionPlans,
  updateCommissionPlan,
} from "@/modules/commission-plans/client";
import type {
  CommissionPaymentTrigger,
  CommissionPlan,
  CommissionPlanScheduleItemInput,
  CommissionPlanStatus,
  CommissionScheduleEventType,
  CommissionType,
} from "@/modules/commission-plans/types";
import type { OperationsAdministratorRow } from "@/modules/operations/administrators-types";

type OperationsCommissionPlansManagerProps = {
  administrators: OperationsAdministratorRow[];
};

type PlanFormState = {
  contractTermMonths: string;
  name: string;
  paymentInstallments: string;
  paymentTrigger: CommissionPaymentTrigger;
  status: CommissionPlanStatus;
};

type ScheduleRowState = {
  eventType: CommissionScheduleEventType;
  installmentNumber: string;
  offsetDays: string;
  offsetMonths: string;
  percentage: string;
};

type StatusFilter = CommissionPlanStatus | "all";

const emptyForm: PlanFormState = {
  contractTermMonths: "",
  name: "",
  paymentInstallments: "1",
  paymentTrigger: "contract_activation",
  status: "active",
};

const emptyScheduleRow: ScheduleRowState = {
  eventType: "installment",
  installmentNumber: "1",
  offsetDays: "",
  offsetMonths: "1",
  percentage: "0",
};

const paymentTriggerLabels: Record<CommissionPaymentTrigger, string> = {
  contract_activation: "Ativacao do contrato",
  contract_approved: "Contrato aprovado",
  contract_signed: "Contrato assinado",
  contract_submitted: "Contrato enviado",
  manual: "Manual",
};

const statusLabels: Record<CommissionPlanStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

export function OperationsCommissionPlansManager({
  administrators: operationalAdministrators,
}: OperationsCommissionPlansManagerProps) {
  const [catalogAdministrators, setCatalogAdministrators] = useState<
    Administrator[]
  >([]);
  const [selectedAdministratorId, setSelectedAdministratorId] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [plans, setPlans] = useState<CommissionPlan[]>([]);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyForm);
  const [installmentsToGenerate, setInstallmentsToGenerate] = useState("12");
  const [scheduleRows, setScheduleRows] = useState<ScheduleRowState[]>([
    emptyScheduleRow,
  ]);
  const [isLoadingAdministrators, setIsLoadingAdministrators] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fallbackAdministrators = useMemo(
    () =>
      operationalAdministrators.map((administrator) => ({
        createdAt: "",
        createdBy: null,
        id: administrator.id,
        metadata: {},
        name: administrator.name,
        organizationId: "",
        slug: administrator.name.toLowerCase().replace(/\s+/g, "-"),
        status: "active" as const,
        updatedAt: "",
        updatedBy: null,
      })),
    [operationalAdministrators],
  );
  const administrators = catalogAdministrators.length
    ? catalogAdministrators
    : fallbackAdministrators;
  const effectiveAdministratorId =
    selectedAdministratorId || administrators[0]?.id || "";
  const selectedAdministrator = administrators.find(
    (administrator) => administrator.id === effectiveAdministratorId,
  );
  const scheduleTotals = useMemo(
    () => calculateScheduleTotals(scheduleRows),
    [scheduleRows],
  );
  const editingPlan = plans.find((plan) => plan.id === editingPlanId) ?? null;

  useEffect(() => {
    let isActive = true;

    async function loadAdministrators() {
      setIsLoadingAdministrators(true);

      try {
        const loadedAdministrators = await fetchAdministrators(null, {
          limit: 100,
          status: "active",
        });

        if (isActive) {
          setCatalogAdministrators(loadedAdministrators);
        }
      } catch {
        if (isActive) {
          setCatalogAdministrators([]);
        }
      } finally {
        if (isActive) {
          setIsLoadingAdministrators(false);
        }
      }
    }

    void loadAdministrators();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadPlans() {
      if (!effectiveAdministratorId) {
        setPlans([]);
        return;
      }

      setIsLoadingPlans(true);
      setError(null);

      try {
        const loadedPlans = await fetchCommissionPlans(null, {
          administratorId: effectiveAdministratorId,
          limit: 100,
          status: statusFilter === "all" ? null : statusFilter,
        });

        if (isActive) {
          setPlans(loadedPlans);
        }
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Nao foi possivel carregar os planos de comissao.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoadingPlans(false);
        }
      }
    }

    void loadPlans();

    return () => {
      isActive = false;
    };
  }, [effectiveAdministratorId, statusFilter]);

  function updateForm(patch: Partial<PlanFormState>) {
    setForm((current) => ({
      ...current,
      ...patch,
    }));
  }

  function updateScheduleRow(index: number, patch: Partial<ScheduleRowState>) {
    setScheduleRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? normalizeScheduleRow({
              ...row,
              ...patch,
            })
          : row,
      ),
    );
  }

  function resetForm() {
    setEditingPlanId(null);
    setForm(emptyForm);
    setInstallmentsToGenerate("12");
    setScheduleRows([emptyScheduleRow]);
  }

  function startEdit(plan: CommissionPlan) {
    setEditingPlanId(plan.id);
    setForm({
      contractTermMonths:
        plan.contractTermMonths === null ? "" : String(plan.contractTermMonths),
      name: plan.name,
      paymentInstallments: String(plan.paymentInstallments),
      paymentTrigger: plan.paymentTrigger,
      status: plan.status,
    });
    setScheduleRows(
      plan.scheduleItems.length
        ? plan.scheduleItems.map((item) => ({
            eventType: item.eventType,
            installmentNumber:
              item.installmentNumber === null
                ? ""
                : String(item.installmentNumber),
            offsetDays: item.offsetDays === null ? "" : String(item.offsetDays),
            offsetMonths:
              item.offsetMonths === null ? "" : String(item.offsetMonths),
            percentage: String(item.percentage),
          }))
        : [emptyScheduleRow],
    );
    setNotice(null);
    setError(null);
  }

  function generateInstallments() {
    const total = Number(installmentsToGenerate);

    if (!Number.isInteger(total) || total < 1 || total > 240) {
      setError("Informe uma quantidade de parcelas entre 1 e 240.");
      return;
    }

    setScheduleRows(
      Array.from({ length: total }, (_, index) => ({
        eventType: "installment",
        installmentNumber: String(index + 1),
        offsetDays: "",
        offsetMonths: String(index + 1),
        percentage: "0",
      })),
    );
    setError(null);
  }

  function addContemplationEvent() {
    setScheduleRows((current) => [
      ...current,
      {
        eventType: "contemplation",
        installmentNumber: "",
        offsetDays: "",
        offsetMonths: "",
        percentage: "0",
      },
    ]);
  }

  async function reloadPlans() {
    if (!effectiveAdministratorId) {
      setPlans([]);
      return;
    }

    const loadedPlans = await fetchCommissionPlans(null, {
      administratorId: effectiveAdministratorId,
      limit: 100,
      status: statusFilter === "all" ? null : statusFilter,
    });
    setPlans(loadedPlans);
  }

  async function handleSubmit() {
    if (!effectiveAdministratorId) {
      setError("Selecione uma administradora.");
      return;
    }

    const payload = buildPayload(form);

    if (!payload.ok) {
      setError(payload.error);
      return;
    }

    const schedulePayload = buildSchedulePayload(scheduleRows);

    if (!schedulePayload.ok) {
      setError(schedulePayload.error);
      return;
    }

    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const input = {
        ...payload.input,
        administratorId: effectiveAdministratorId,
        commissionFixedAmount: null,
        commissionPercentage: scheduleTotals.percentage || null,
        commissionType: "percentage" as CommissionType,
        scheduleItems: schedulePayload.scheduleItems,
      };

      if (editingPlanId) {
        await updateCommissionPlan(null, editingPlanId, input);
        setNotice("Plano de comissao atualizado.");
      } else {
        await createCommissionPlan(null, input);
        setNotice("Plano de comissao criado.");
      }

      await reloadPlans();
      resetForm();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Nao foi possivel salvar o plano de comissao.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus(plan: CommissionPlan) {
    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      await updateCommissionPlan(null, plan.id, {
        status: plan.status === "active" ? "inactive" : "active",
      });
      await reloadPlans();
      setNotice(
        plan.status === "active"
          ? "Plano inativado para novos contratos."
          : "Plano ativado para novos contratos.",
      );
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Nao foi possivel alterar o status do plano.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Planos de comissao
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Templates operacionais por administradora
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Cadastre reguas percentuais reutilizaveis. Valores em reais sao
            calculados somente no contrato, com o credito real contratado.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Administradora
            <select
              className="h-10 min-w-56 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
              disabled={isLoadingAdministrators}
              onChange={(event) => {
                setSelectedAdministratorId(event.target.value);
                resetForm();
              }}
              value={effectiveAdministratorId}
            >
              {!administrators.length ? (
                <option value="">Nenhuma administradora</option>
              ) : null}
              {administrators.map((administrator) => (
                <option key={administrator.id} value={administrator.id}>
                  {administrator.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Status
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              value={statusFilter}
            >
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
              <option value="all">Todos</option>
            </select>
          </label>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      ) : null}

      {!selectedAdministrator ? (
        <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Cadastre uma administradora antes de criar planos de comissao.
        </div>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-950">
              {editingPlan ? "Editar template" : "Novo template"}
            </h3>
            <div className="mt-4 grid gap-3">
              <FormInput
                label="Nome"
                onChange={(value) => updateForm({ name: value })}
                placeholder="Ex: Plano 182x"
                value={form.name}
              />

              <div className="grid gap-3 sm:grid-cols-3">
                <FormInput
                  label="Prazo comercial"
                  onChange={(value) =>
                    updateForm({ contractTermMonths: value })
                  }
                  placeholder="Ex: 182"
                  type="number"
                  value={form.contractTermMonths}
                />
                <FormSelect
                  label="Status"
                  onChange={(value) =>
                    updateForm({ status: value as CommissionPlanStatus })
                  }
                  value={form.status}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </FormSelect>
                <FormSelect
                  label="Gatilho"
                  onChange={(value) =>
                    updateForm({
                      paymentTrigger: value as CommissionPaymentTrigger,
                    })
                  }
                  value={form.paymentTrigger}
                >
                  {Object.entries(paymentTriggerLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </FormSelect>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Regua percentual
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Total:{" "}
                      <span className="font-semibold text-slate-900">
                        {scheduleTotals.percentage.toLocaleString("pt-BR")}%
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <FormInput
                      label="Qtd. parcelas"
                      onChange={setInstallmentsToGenerate}
                      type="number"
                      value={installmentsToGenerate}
                    />
                    <div className="flex items-end gap-2">
                      <button
                        className="inline-flex h-10 items-center justify-center rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800"
                        onClick={generateInstallments}
                        type="button"
                      >
                        Gerar parcelas
                      </button>
                      <button
                        className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                        onClick={addContemplationEvent}
                        type="button"
                      >
                        Adicionar contemplacao
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-3">
                  {scheduleRows.map((row, index) => (
                    <div
                      className="grid gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-[1.1fr_0.7fr_0.8fr_0.8fr_0.8fr_auto]"
                      key={`${row.eventType}-${index}`}
                    >
                      <FormSelect
                        label="Tipo"
                        onChange={(value) =>
                          updateScheduleRow(index, {
                            eventType: value as CommissionScheduleEventType,
                          })
                        }
                        value={row.eventType}
                      >
                        <option value="installment">Parcela</option>
                        <option value="contemplation">Contemplacao</option>
                      </FormSelect>
                      <FormInput
                        disabled={row.eventType === "contemplation"}
                        label="N."
                        onChange={(value) =>
                          updateScheduleRow(index, { installmentNumber: value })
                        }
                        type="number"
                        value={row.installmentNumber}
                      />
                      <FormInput
                        label="%"
                        onChange={(value) =>
                          updateScheduleRow(index, { percentage: value })
                        }
                        type="number"
                        value={row.percentage}
                      />
                      <FormInput
                        label="Offset meses"
                        onChange={(value) =>
                          updateScheduleRow(index, { offsetMonths: value })
                        }
                        type="number"
                        value={row.offsetMonths}
                      />
                      <FormInput
                        label="Offset dias"
                        onChange={(value) =>
                          updateScheduleRow(index, { offsetDays: value })
                        }
                        type="number"
                        value={row.offsetDays}
                      />
                      <div className="flex items-end">
                        <button
                          className="inline-flex h-10 w-full items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 disabled:opacity-50"
                          disabled={scheduleRows.length === 1}
                          onClick={() =>
                            setScheduleRows((current) =>
                              current.filter(
                                (_, rowIndex) => rowIndex !== index,
                              ),
                            )
                          }
                          type="button"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-md border border-slate-900 bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving}
                  onClick={handleSubmit}
                  type="button"
                >
                  {editingPlan ? "Salvar alteracoes" : "Criar plano"}
                </button>
                {editingPlan ? (
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                    disabled={isSaving}
                    onClick={resetForm}
                    type="button"
                  >
                    Cancelar edicao
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-950">
                Planos de {selectedAdministrator.name}
              </h3>
              <span className="text-xs font-medium text-slate-500">
                {isLoadingPlans ? "Carregando..." : `${plans.length} plano(s)`}
              </span>
            </div>

            <div className="mt-3 grid gap-3">
              {!isLoadingPlans && !plans.length ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Nenhum plano encontrado para o filtro selecionado.
                </div>
              ) : null}

              {plans.map((plan) => (
                <article
                  className="rounded-lg border border-slate-200 bg-white p-4"
                  key={plan.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-slate-950">
                          {plan.name}
                        </h4>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {statusLabels[plan.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatScheduleSummary(plan)} -{" "}
                        {paymentTriggerLabels[plan.paymentTrigger]} -{" "}
                        {plan.paymentInstallments} parcela(s) de pagamento
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                        disabled={isSaving}
                        onClick={() => startEdit(plan)}
                        type="button"
                      >
                        Editar
                      </button>
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                        disabled={isSaving}
                        onClick={() => handleToggleStatus(plan)}
                        type="button"
                      >
                        {plan.status === "active" ? "Inativar" : "Ativar"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function buildPayload(form: PlanFormState) {
  const name = form.name.trim();
  const paymentInstallments = Number(form.paymentInstallments);
  const contractTermMonths = parseOptionalPositiveInteger(
    form.contractTermMonths,
  );

  if (!name) {
    return invalidPayload("Informe o nome do plano.");
  }

  if (!Number.isInteger(paymentInstallments) || paymentInstallments < 1) {
    return invalidPayload("Informe uma quantidade valida de parcelas.");
  }

  if (contractTermMonths === undefined) {
    return invalidPayload("Informe um prazo comercial valido.");
  }

  return {
    input: {
      contractTermMonths,
      name,
      paymentInstallments,
      paymentTrigger: form.paymentTrigger,
      status: form.status,
    },
    ok: true as const,
  };
}

function buildSchedulePayload(rows: ScheduleRowState[]) {
  const scheduleItems: CommissionPlanScheduleItemInput[] = [];
  const seenKeys = new Set<string>();

  for (const [index, row] of rows.entries()) {
    const percentage = parseRequiredNonNegativeNumber(row.percentage);
    const installmentNumber =
      row.eventType === "installment"
        ? parseRequiredPositiveInteger(row.installmentNumber)
        : null;
    const offsetMonths = parseOptionalNonNegativeInteger(row.offsetMonths);
    const offsetDays = parseOptionalNonNegativeInteger(row.offsetDays);

    if (percentage === null) {
      return invalidPayload("Informe percentuais validos na regua.");
    }

    if (offsetMonths === undefined) {
      return invalidPayload("Informe offsets em meses validos.");
    }

    if (offsetDays === undefined) {
      return invalidPayload("Informe offsets em dias validos.");
    }

    if (row.eventType === "installment" && installmentNumber === null) {
      return invalidPayload("Parcela exige numero maior que zero.");
    }

    const key = `${row.eventType}:${installmentNumber ?? "event"}`;

    if (seenKeys.has(key)) {
      return invalidPayload("A regua possui eventos duplicados.");
    }

    seenKeys.add(key);
    scheduleItems.push({
      eventType: row.eventType,
      installmentNumber,
      offsetDays,
      offsetMonths,
      percentage,
      sortOrder: index,
    });
  }

  return {
    ok: true as const,
    scheduleItems,
  };
}

function normalizeScheduleRow(row: ScheduleRowState): ScheduleRowState {
  if (row.eventType === "contemplation") {
    return {
      ...row,
      installmentNumber: "",
    };
  }

  return {
    ...row,
    installmentNumber: row.installmentNumber || "1",
  };
}

function invalidPayload(error: string) {
  return {
    error,
    ok: false as const,
  };
}

function parseOptionalPositiveInteger(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return undefined;
  }

  return parsed;
}

function parseOptionalNonNegativeInteger(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

function parseRequiredNonNegativeNumber(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseRequiredPositiveInteger(value: string) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function calculateScheduleTotals(rows: ScheduleRowState[]) {
  return rows.reduce(
    (summary, row) => ({
      percentage:
        summary.percentage +
        (parseRequiredNonNegativeNumber(row.percentage) ?? 0),
    }),
    {
      percentage: 0,
    },
  );
}

function formatScheduleSummary(plan: CommissionPlan) {
  const percentage =
    plan.totalSchedulePercentage ?? plan.commissionPercentage ?? 0;
  const eventsCount = plan.scheduleItems.length;

  return `${percentage.toLocaleString("pt-BR")}% total - ${eventsCount} evento(s)`;
}

function FormInput({
  disabled = false,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "number" | "text";
  value: string;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700">
      {label}
      <input
        className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function FormSelect({
  children,
  label,
  onChange,
  value,
}: {
  children: ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700">
      {label}
      <select
        className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}
