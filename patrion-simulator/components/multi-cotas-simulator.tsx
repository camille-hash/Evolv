"use client";

import { useMemo, useState } from "react";
import {
  calculateMultiCotas,
  defaultMultiCotasInput,
  normalizeMultiCotasInput,
  type MultiCotasInput,
} from "@/modules/multi-cotas";
import { generateMultiCotasCommercialPdf } from "@/modules/reports";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function MultiCotasSimulator() {
  const [input, setInput] = useState<MultiCotasInput>(defaultMultiCotasInput);
  const [title, setTitle] = useState("Estudo Multi-Cotas");
  const [clientName, setClientName] = useState("");
  const result = useMemo(() => calculateMultiCotas(input), [input]);
  const estimatedGain = result.summary.totalInccGain + result.summary.totalIdleAppreciationGain;

  function update(partial: Partial<MultiCotasInput>) {
    setInput((current) => normalizeMultiCotasInput({ ...current, ...partial }));
  }

  function updateCard(id: string, partial: Partial<MultiCotasInput["cards"][number]>) {
    update({ cards: input.cards.map((card) => card.id === id ? { ...card, ...partial } : card) });
  }

  function generatePdf() {
    generateMultiCotasCommercialPdf({
      input,
      result,
      title,
      clientName: clientName || undefined,
      simulationDate: new Date().toISOString(),
    });
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="eyebrow text-emerald-800">Patrion Simulator</p>
        <h1 className="mt-2 text-3xl font-semibold">Multi-Cotas</h1>
        <p className="mt-2 text-slate-600">Configure as cartas e acompanhe o consolidado em tempo real.</p>
      </div>

      <section className="card space-y-5">
        <h2 className="text-xl font-semibold">Formulario</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField label="Quantidade de cartas" step={1} value={input.cardCount} onChange={(cardCount) => update({ cardCount })} />
          <NumberField label="Valor base por carta" value={input.baseCardValue} onChange={(baseCardValue) => update({ baseCardValue })} />
          <NumberField label="Prazo (meses)" step={1} value={input.termMonths} onChange={(termMonths) => update({ termMonths })} />
          <NumberField label="Contemplacao compartilhada" step={1} value={input.sharedContemplationMonth} onChange={(sharedContemplationMonth) => update({ sharedContemplationMonth })} />
          <NumberField label="INCC anual (%)" value={input.annualInccPercent} onChange={(annualInccPercent) => update({ annualInccPercent })} />
          <NumberField label="Valorizacao mensal (%)" value={input.monthlyIdleAppreciationPercent} onChange={(monthlyIdleAppreciationPercent) => update({ monthlyIdleAppreciationPercent })} />
          <NumberField label="Mes de consolidacao" step={1} value={input.consolidationMonth} onChange={(consolidationMonth) => update({ consolidationMonth })} />
          <button className="button button-secondary self-end" onClick={() => update({ cards: input.cards.map((card) => ({ ...card, originalValue: input.baseCardValue, contemplationMonth: input.sharedContemplationMonth, withdrawalMonth: input.consolidationMonth })) })} type="button">
            Aplicar a todas
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr className="border-b"><th className="p-3">Carta</th><th className="p-3">Valor</th><th className="p-3">Contemplacao</th><th className="p-3">Saque</th></tr></thead>
            <tbody>{input.cards.map((card) => (
              <tr className="border-b" key={card.id}>
                <td className="p-3 font-semibold">{card.position}</td>
                <td className="p-3"><CompactNumber value={card.originalValue} onChange={(originalValue) => updateCard(card.id, { originalValue })} /></td>
                <td className="p-3"><CompactNumber step={1} value={card.contemplationMonth} onChange={(contemplationMonth) => updateCard(card.id, { contemplationMonth })} /></td>
                <td className="p-3"><CompactNumber step={1} value={card.withdrawalMonth} onChange={(withdrawalMonth) => updateCard(card.id, { withdrawalMonth })} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="card space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-xl font-semibold">Resultado</h2><p className="mt-1 text-sm text-slate-600">{result.summary.cardCount} cartas calculadas.</p></div>
          <button className="button" onClick={generatePdf} type="button">Gerar PDF Multi-Cotas</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Credito contratado" value={currency.format(result.summary.totalOriginalContracted)} />
          <Metric label="Credito atualizado" value={currency.format(result.summary.totalUpdatedCredit)} />
          <Metric label="Valor futuro" value={currency.format(result.summary.totalFutureValue)} />
          <Metric label="Ganho estimado" value={currency.format(estimatedGain)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead><tr className="border-b"><th className="p-3">Carta</th><th className="p-3">Credito atualizado</th><th className="p-3">Reajustes INCC</th><th className="p-3">Valor futuro</th><th className="p-3">Resultado</th></tr></thead>
            <tbody>{result.cards.map((card) => (
              <tr className="border-b" key={card.id}><td className="p-3 font-semibold">{card.position}</td><td className="p-3">{currency.format(card.updatedCredit)}</td><td className="p-3">{card.inccAdjustmentCount}</td><td className="p-3">{currency.format(card.futureValue)}</td><td className="p-3 font-semibold text-emerald-800">{currency.format(card.estimatedGain)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-xl font-semibold">Dados do PDF</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Titulo" value={title} onChange={setTitle} />
          <TextField label="Cliente (opcional)" value={clientName} onChange={setClientName} />
        </div>
      </section>
    </section>
  );
}

function NumberField({ label, value, onChange, step = 0.01 }: { label: string; value: number; onChange: (value: number) => void; step?: number }) {
  return <label className="field">{label}<input className="input" min="0" onChange={(event) => onChange(event.target.valueAsNumber)} step={step} type="number" value={value} /></label>;
}
function CompactNumber({ value, onChange, step = 0.01 }: { value: number; onChange: (value: number) => void; step?: number }) {
  return <input aria-label="Valor da carta" className="input" min="0" onChange={(event) => onChange(event.target.valueAsNumber)} step={step} type="number" value={value} />;
}
function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field">{label}<input className="input" onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><p className="metric-label">{label}</p><p className="metric-value">{value}</p></div>;
}
