type OperationalEmptyStateProps = {
  description: string;
  title: string;
};

export function OperationalEmptyState({
  description,
  title,
}: OperationalEmptyStateProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/80 p-6 text-center shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
