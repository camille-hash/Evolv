type OperationsPageHeaderProps = {
  description?: string;
  eyebrow?: string;
  title?: string;
};

export function OperationsPageHeader({
  description = "Visao derivada de clientes, contratos, administradoras, comissoes, receitas e portfolio.",
  eyebrow = "Operations Workspace",
  title = "Centro operacional EVOLV",
}: OperationsPageHeaderProps) {
  return (
    <header className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-white shadow-2xl shadow-slate-950/40">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
        {eyebrow}
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            {description}
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-200">
          Read-only
        </span>
      </div>
    </header>
  );
}
