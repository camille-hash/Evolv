import { OperationsSectionCard } from "./operations-section-card";

type OperationCapability = {
  description?: string;
  label: string;
};

type OperationsPlaceholderPageProps = {
  capabilities: OperationCapability[];
  description: string;
  title: string;
};

export function OperationsPlaceholderPage({
  capabilities,
  description,
  title,
}: OperationsPlaceholderPageProps) {
  return (
    <div className="grid gap-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Operations Drilldown
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      </section>

      <section>
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Future Capabilities
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Arquitetura preparada
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {capabilities.map((capability) => (
            <OperationsSectionCard
              description={
                capability.description ??
                "Espaco reservado para evolucao operacional futura."
              }
              key={capability.label}
              label={capability.label}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-950">
          Modulo em preparacao
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Este drilldown ja possui rota, shell e navegacao oficial. A proxima
          etapa pode conectar dados e interacoes sem alterar a arquitetura do
          Operations Workspace.
        </p>
      </section>
    </div>
  );
}
