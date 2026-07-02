type OperationsSectionCardProps = {
  description: string;
  label: string;
};

export function OperationsSectionCard({
  description,
  label,
}: OperationsSectionCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{label}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}
