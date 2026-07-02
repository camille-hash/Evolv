import type { OperationalInsightSeverity } from "@/modules/operations/intelligence-types";
import type { OperationalPriorityBanner } from "@/modules/operations/intelligence-types";

type OperationsPriorityBannerProps = {
  banner?: OperationalPriorityBanner;
};

const severityClasses: Record<OperationalInsightSeverity, string> = {
  attention: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-rose-200 bg-rose-50 text-rose-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

export function OperationsPriorityBanner({
  banner,
}: OperationsPriorityBannerProps) {
  if (!banner) {
    return null;
  }

  return (
    <section
      className={`rounded-xl border p-5 shadow-sm ${severityClasses[banner.severity]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">
        Prioridade operacional
      </p>
      <h2 className="mt-2 text-lg font-semibold">{banner.title}</h2>
      <p className="mt-2 text-sm leading-6 opacity-80">{banner.description}</p>
    </section>
  );
}
