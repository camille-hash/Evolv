export function OperationsRevenueEmptyState({
  description = "Quando receitas forem geradas, esta area exibira a leitura operacional de previsao, reconhecimento e divergencias.",
  title = "Nenhuma receita operacional encontrada.",
}: {
  description?: string;
  title?: string;
}) {
  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white/80 p-6 text-center shadow-sm">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        {description}
      </p>
    </section>
  );
}
