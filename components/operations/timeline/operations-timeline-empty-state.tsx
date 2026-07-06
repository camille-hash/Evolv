export function OperationsTimelineEmptyState() {
  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white/80 p-6 text-center shadow-sm">
      <p className="text-sm font-semibold text-slate-950">
        Nenhuma atividade operacional encontrada.
      </p>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        Quando clientes, contratos e receitas gerarem eventos operacionais
        relevantes, esta area exibira a atividade recente.
      </p>
    </section>
  );
}
