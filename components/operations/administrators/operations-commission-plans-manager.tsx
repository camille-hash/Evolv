"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createCommissionPlan,
  fetchCommissionPlans,
  updateCommissionPlan,
} from "@/modules/commission-plans/client";
import type {
  CommissionPaymentTrigger,
  CommissionPlan,
  CommissionPlanStatus,
  CommissionType,
} from "@/modules/commission-plans/types";
import type { OperationsAdministratorRow } from "@/modules/operations/administrators-types";

type OperationsCommissionPlansManagerProps = {
  administrators: OperationsAdministratorRow[];
};

type PlanFormState = {
  commissionFixedAmount: string;
  commissionPercentage: string;
  commissionType: CommissionType;
  name: string;
  paymentInstallments: string;
  paymentTrigger: CommissionPaymentTrigger;
  status: CommissionPlanStatus;
};

type StatusFilter = CommissionPlanStatus | "all";

const emptyForm: PlanFormState = {
  commissionFixedAmount: "",
  commissionPercentage: "",
  commissionType: "percentage",
  name: "",
  paymentInstallments: "1",
  paymentTrigger: "contract_activation",
  status: "active",
};

const commissionTypeLabels: Record<CommissionType, string> = {
  fixed: "Valor fixo",
  hybrid: "Hibrido",
  percentage: "Percentual",
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

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 0,
  style: "currency",
});

export function OperationsCommissionPlansManager({
  administrators,
}: OperationsCommissionPlansManagerProps) {
  const [selectedAdministratorId, setSelectedAdministratorId] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [plans, setPlans] = useState<CommissionPlan[]>([]);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeAdministrators = useMemo(
    () =>
      administrators.filter(
        (administrator) => administrator.status !== "inactive",
      ),
    [administrators],
  );
  const visibleAdministrators = activeAdministrators.length
    ? activeAdministrators
    : administrators;
  const effectiveAdministratorId =
    selectedAdministratorId || visibleAdministrators[0]?.id || "";

  useEffect(() => {
    let isActive = true;

    async function loadPlans() {
      if (!effectiveAdministratorId) {
        setPlans([]);
        return;
      }

      setIsLoading(true);
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
          setIsLoading(false);
        }
      }
    }

    void loadPlans();

    return () => {
      isActive = false;
    };
  }, [effectiveAdministratorId, statusFilter]);

  const selectedAdministrator = administrators.find(
    (administrator) => administrator.id === effectiveAdministratorId,
  );
  const editingPlan = plans.find((plan) => plan.id === editingPlanId) ?? null;

  function updateForm(patch: Partial<PlanFormState>) {
    setForm((current) => ({
      ...current,
      ...patch,
    }));
  }

  function startEdit(plan: CommissionPlan) {
    setEditingPlanId(plan.id);
    setForm({
      commissionFixedAmount:
        plan.commissionFixedAmount === null
          ? ""
          : String(plan.commissionFixedAmount),
      commissionPercentage:
        plan.commissionPercentage === null
          ? ""
          : String(plan.commissionPercentage),
      commissionType: plan.commissionType,
      name: plan.name,
      paymentInstallments: String(plan.paymentInstallments),
      paymentTrigger: plan.paymentTrigger,
      status: plan.status,
    });
    setNotice(null);
    setError(null);
  }

  function resetForm() {
    setEditingPlanId(null);
    setForm(emptyForm);
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

    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      if (editingPlanId) {
        await updateCommissionPlan(null, editingPlanId, {
          ...payload.input,
          administratorId: effectiveAdministratorId,
        });
        setNotice("Plano de comissao atualizado.");
      } else {
        await createCommissionPlan(null, {
          ...payload.input,
          administratorId: effectiveAdministratorId,
        });
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
            Cadastro operacional por administradora
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Gerencie os planos que aparecem no cadastro de contrato. Planos
            inativos permanecem preservados para contratos antigos.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Administradora
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
              onChange={(event) => {
                setSelectedAdministratorId(event.target.value);
                resetForm();
              }}
              value={effectiveAdministratorId}
            >
              {!visibleAdministrators.length ? (
                <option value="">Nenhuma administradora</option>
              ) : null}
              {visibleAdministrators.map((administrator) => (
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
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-950">
              {editingPlan ? "Editar plano" : "Novo plano"}
            </h3>
            <div className="mt-4 grid gap-3">
              <FormInput
                label="Nome"
                onChange={(value) => updateForm({ name: value })}
                placeholder="Ex: Plano padrao 2%"
                value={form.name}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <FormSelect
                  label="Tipo"
                  onChange={(value) =>
                    updateForm({ commissionType: value as CommissionType })
                  }
                  value={form.commissionType}
                >
                  {Object.entries(commissionTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </FormSelect>
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
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormInput
                  label="Percentual"
                  onChange={(value) =>
                    updateForm({ commissionPercentage: value })
                  }
                  placeholder="Ex: 2"
                  type="number"
                  value={form.commissionPercentage}
                />
                <FormInput
                  label="Valor fixo"
                  onChange={(value) =>
                    updateForm({ commissionFixedAmount: value })
                  }
                  placeholder="Opcional"
                  type="number"
                  value={form.commissionFixedAmount}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
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
                <FormInput
                  label="Parcelas"
                  onChange={(value) =>
                    updateForm({ paymentInstallments: value })
                  }
                  type="number"
                  value={form.paymentInstallments}
                />
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
                {isLoading ? "Carregando..." : `${plans.length} plano(s)`}
              </span>
            </div>

            <div className="mt-3 grid gap-3">
              {!isLoading && !plans.length ? (
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
                        {formatPlanRule(plan)} -{" "}
                        {paymentTriggerLabels[plan.paymentTrigger]} -{" "}
                        {plan.paymentInstallments} parcela(s)
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
  const commissionPercentage = parseOptionalPositiveNumber(
    form.commissionPercentage,
  );
  const commissionFixedAmount = parseOptionalPositiveNumber(
    form.commissionFixedAmount,
  );

  if (!name) {
    return invalidPayload("Informe o nome do plano.");
  }

  if (!Number.isInteger(paymentInstallments) || paymentInstallments < 1) {
    return invalidPayload("Informe uma quantidade valida de parcelas.");
  }

  if (commissionPercentage === undefined) {
    return invalidPayload("Informe um percentual valido.");
  }

  if (commissionFixedAmount === undefined) {
    return invalidPayload("Informe um valor fixo valido.");
  }

  if (form.commissionType === "percentage" && commissionPercentage === null) {
    return invalidPayload("Plano percentual exige percentual maior que zero.");
  }

  if (form.commissionType === "fixed" && commissionFixedAmount === null) {
    return invalidPayload("Plano fixo exige valor fixo maior que zero.");
  }

  if (
    form.commissionType === "hybrid" &&
    commissionPercentage === null &&
    commissionFixedAmount === null
  ) {
    return invalidPayload("Plano hibrido exige percentual ou valor fixo.");
  }

  return {
    input: {
      commissionFixedAmount,
      commissionPercentage,
      commissionType: form.commissionType,
      name,
      paymentInstallments,
      paymentTrigger: form.paymentTrigger,
      status: form.status,
    },
    ok: true as const,
  };
}

function invalidPayload(error: string) {
  return {
    error,
    ok: false as const,
  };
}

function parseOptionalPositiveNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function formatPlanRule(plan: CommissionPlan) {
  const parts: string[] = [commissionTypeLabels[plan.commissionType]];

  if (plan.commissionPercentage !== null) {
    parts.push(`${plan.commissionPercentage.toLocaleString("pt-BR")}%`);
  }

  if (plan.commissionFixedAmount !== null) {
    parts.push(currencyFormatter.format(plan.commissionFixedAmount));
  }

  return parts.join(" - ");
}

function FormInput({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "number" | "text";
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      <input
        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
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
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      <select
        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}
