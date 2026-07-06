import type { IntegrityIssue } from "@/modules/master-data-integrity/types";

type OperationsIntegrityIssueListProps = {
  issues: IntegrityIssue[];
};

const severityClasses = {
  error: "border-rose-200 bg-rose-50 text-rose-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
} as const;

const severityLabelClasses = {
  error: "border-rose-200 bg-rose-100 text-rose-800",
  warning: "border-amber-200 bg-amber-100 text-amber-800",
} as const;

export function OperationsIntegrityIssueList({
  issues,
}: OperationsIntegrityIssueListProps) {
  return (
    <div className="grid gap-3">
      {issues.map((issue, index) => (
        <IssueCard issue={issue} key={`${issue.entityId}:${issue.code}:${index}`} />
      ))}
    </div>
  );
}

function IssueCard({ issue }: { issue: IntegrityIssue }) {
  return (
    <div className={`rounded-lg border p-4 ${severityClasses[issue.severity]}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${severityLabelClasses[issue.severity]}`}
        >
          {issue.severity}
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.14em]">
          {issue.code}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-semibold">{issue.title}</h3>
      <p className="mt-2 text-sm leading-6">{issue.description}</p>
      <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] opacity-70">
        Recomendacao
      </p>
      <p className="mt-1 text-sm leading-6">{issue.recommendation}</p>
    </div>
  );
}
