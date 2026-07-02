export function OperationsAdministratorsEmptyState() {
  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white/80 p-6 text-center shadow-sm">
      <p className="text-sm font-semibold text-slate-950">
        Nenhuma administradora operacional encontrada.
      </p>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        Quando administradoras forem vinculadas a contratos, esta area exibira a
        leitura operacional por administradora.
      </p>
    </section>
  );
}
