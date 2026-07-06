"use client";

import { useMemo, useState } from "react";
import {
  updateContractStatus,
  type UpdateContractStatusResult,
} from "@/modules/contracts/client";
import type {
  ContractInactiveAction,
  ContractStatus,
  ContractStatusInput,
} from "@/modules/contracts/types";

const statusLabels: Record<ContractStatus, string> = {
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

type ContractStatusDialogProps = {
  contractId: string;
  contractLabel: string;
  currentStatus: ContractStatus;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (result: UpdateContractStatusResult) => Promise<void> | void;
};

export function ContractStatusDialog({
  contractId,
  contractLabel,
  currentStatus,
  isOpen,
  onClose,
  onUpdated,
}: ContractStatusDialogProps) {
  const defaultNextStatus = currentStatus === "inactive" ? "active" : "inactive";
  const [nextStatus, setNextStatus] = useState<"active" | "inactive">(
    defaultNextStatus,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusDescription = useMemo(() => {
    if (nextStatus === "inactive") {
      return "Os lancamentos futuros pendentes serao cancelados. Valores ja recebidos serao mantidos.";
    }

    return "O contrato voltara a ficar ativo e seguira o fluxo operacional normal desta situacao.";
  }, [nextStatus]);

  if (!isOpen) {
    return null;
  }

  async function handleConfirm() {
    const input = createStatusInput(nextStatus);

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateContractStatus(null, contractId, input);
      await onUpdated?.(result);
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Nao foi possivel alterar a situacao do contrato.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"
      role="dialog"
    >
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Situacao do contrato
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            Alterar situacao
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Confirme a nova situacao para atualizar o contrato e os totais
            operacionais relacionados.
          </p>
        </div>

        <div className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="font-medium text-slate-500">Contrato</span>
            <span>{contractLabel}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <span className="font-medium text-slate-500">Situacao atual</span>
            <span className="font-semibold text-slate-950">
              {statusLabels[currentStatus]}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium text-slate-700">
              Nova situacao
            </legend>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300">
              <input
                checked={nextStatus === "active"}
                className="mt-1"
                disabled={isSubmitting}
                name="contract-status"
                onChange={() => setNextStatus("active")}
                type="radio"
              />
              <span>
                <span className="block font-medium text-slate-950">Ativo</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Mantem o contrato em operacao normal.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300">
              <input
                checked={nextStatus === "inactive"}
                className="mt-1"
                disabled={isSubmitting}
                name="contract-status"
                onChange={() => setNextStatus("inactive")}
                type="radio"
              />
              <span>
                <span className="block font-medium text-slate-950">Inativo</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Cancela os lancamentos futuros pendentes e preserva o
                  historico reconhecido.
                </span>
              </span>
            </label>
          </fieldset>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {statusDescription}
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="rounded-lg border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || nextStatus === currentStatus}
            onClick={() => void handleConfirm()}
            type="button"
          >
            {isSubmitting ? "Salvando..." : "Confirmar alteracao"}
          </button>
        </div>
      </div>
    </div>
  );
}

function createStatusInput(
  nextStatus: "active" | "inactive",
): ContractStatusInput {
  if (nextStatus === "inactive") {
    return {
      inactiveAction: "cancel_future_entries" satisfies ContractInactiveAction,
      status: "inactive",
    };
  }

  return {
    status: "active",
  };
}
