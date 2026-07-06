import type { MasterDataIntegrityContractRecord } from "@/modules/master-data-integrity/types";
import { OperationsContextLink } from "../operations-context-link";
import { OperationsIntegrityIssueList } from "./operations-integrity-issue-list";

type OperationsIntegrityContractCardProps = {
  contract: MasterDataIntegrityContractRecord;
};

export function OperationsIntegrityContractCard({
  contract,
}: OperationsIntegrityContractCardProps) {
  const errorCount = contract.issues.filter((issue) => issue.severity === "error").length;
  const warningCount = contract.issues.length - errorCount;
  const headlineTone = errorCount > 0 ? "Critico" : "Warning";
  const headlineClass =
    errorCount > 0
      ? "border-rose-200 bg-rose-100 text-rose-800"
      : "border-amber-200 bg-amber-100 text-amber-800";

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-950">
              Contrato {contract.contractNumber ?? "Sem numero"}
            </h2>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${headlineClass}`}
            >
              {headlineTone}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
              Status {contract.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {errorCount} error(s) e {warningCount} warning(s) detectados para este contrato.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OperationsContextLink href={`/operations/integrity/${contract.contractId}`}>
            Ver detalhe
          </OperationsContextLink>
          <OperationsContextLink href="/operations/contracts">
            Ver contratos
          </OperationsContextLink>
          <OperationsContextLink href="/operations/administrators">
            Ver administradoras
          </OperationsContextLink>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <OperationsIntegrityIssueList issues={contract.issues} />
      </div>
    </article>
  );
}
