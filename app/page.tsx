import { SimulatorPanel } from "@/components/simulator/simulator-panel";

export default function Home() {
  return (
    <main className="flex min-h-full flex-col gap-8 p-8">
      <section className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground">
          EVOLV
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground">
          Simulator
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Calculo inicial dos cenarios de parcela cheia, 70% e meia parcela.
        </p>
      </section>

      <SimulatorPanel />
    </main>
  );
}
