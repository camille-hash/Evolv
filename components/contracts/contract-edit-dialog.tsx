"use client";

import { useState } from "react";
import { updateContract } from "@/modules/contracts/client";
import type { Contract } from "@/modules/contracts/types";

type ContractEditDialogProps = {
  contractId: string;
  contractLabel: string;
  initialContractNumber?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (contract: Contract) => Promise<void> | void;
};

export function ContractEditDialog({
  contractId,
  contractLabel,
  initialContractNumber,
  isOpen,
  onClose,
  onUpdated,
}: ContractEditDialogProps) {
  const [contractNumber, setContractNumber] = useState(
    initialContractNumber ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const contract = await updateContract(null, contractId, {
        contractNumber,
      });
      await onUpdated?.(contract);
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Nao foi possivel atualizar o contrato.",
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
            Edicao do contrato
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            Resolver numero do contrato
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Preencha o campo abaixo para remover a pendencia operacional deste
            contrato.
          </p>
        </div>

        <div className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="font-medium text-slate-500">Contrato</span>
            <span>{contractLabel}</span>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Numero do contrato
            <input
              autoFocus
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              disabled={isSubmitting}
              onChange={(event) => setContractNumber(event.target.value)}
              placeholder="Informe o numero do contrato"
              value={contractNumber}
            />
          </label>
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
            disabled={isSubmitting || !contractNumber.trim()}
            onClick={() => void handleSubmit()}
            type="button"
          >
            {isSubmitting ? "Salvando..." : "Salvar contrato"}
          </button>
        </div>
      </div>
    </div>
  );
}
