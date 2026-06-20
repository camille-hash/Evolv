"use client";

import { useMemo, useState } from "react";
import {
  buildSimulatorCommercialPresentation,
  calculateSimulatorScenarios,
  type BidType,
  type InsuranceOption,
  type SimulatorCommercialData,
  type SimulatorInput,
  type SimulatorScenarioKey,
} from "@/modules/simulator";
import { generateSimulatorCommercialPdf } from "@/modules/reports";

type FormState = {
  credit: number;
  administrativeFeePercent: number;
  reserveFundPercent: number;
  termMonths: number;
  monthlyInsurancePercent: number;
  inccPercent: number;
  cardSalePercent: number;
  embeddedBidPercent: number;
  cashBidPercent: number;
};

const initialForm: FormState = {
  credit: 400000,
  administrativeFeePercent: 26,
  reserveFundPercent: 2,
  termMonths: 197,
  monthlyInsurancePercent: 0.03,
  inccPercent: 0,
  cardSalePercent: 20,
  embeddedBidPercent: 25,
  cashBidPercent: 25,
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const percent = new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function CommercialSimulator() {
  const [form, setForm] = useState(initialForm);
  const [scenario, setScenario] = useState<SimulatorScenarioKey>("full");
  const [insurance, setInsurance] = useState<InsuranceOption>("with-insurance");
  const [bidType, setBidType] = useState<BidType>("none");
  const [contemplationMonth, setContemplationMonth] = useState(12);
  const [simulationName, setSimulationName] = useState("Simulacao Comercial");
  const [commercialData, setCommercialData] = useState<SimulatorCommercialData>({
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    consultantName: "",
    commercialNotes: "",
  });

  const input = useMemo<SimulatorInput>(() => ({
    credit: Math.max(0.01, form.credit),
    administrativeFeeRate: rate(form.administrativeFeePercent),
    reserveFundRate: rate(form.reserveFundPercent),
    termMonths: Math.max(1, Math.trunc(form.termMonths)),
    monthlyInsuranceRate: rate(form.monthlyInsurancePercent),
    inccRate: rate(form.inccPercent),
    cardSaleRate: rate(form.cardSalePercent),
    embeddedBidRate: rate(form.embeddedBidPercent),
    cashBidRate: rate(form.cashBidPercent),
  }), [form]);
  const calculation = useMemo(() => calculateSimulatorScenarios(input), [input]);
  const presentation = useMemo(() => buildSimulatorCommercialPresentation({
    calculation,
    input,
    selectedScenarioKey: scenario,
    insuranceOption: insurance,
    bidType,
    contemplationMonth: clamp(contemplationMonth, 1, input.termMonths),
  }), [bidType, calculation, contemplationMonth, input, insurance, scenario]);

  function updateForm(key: keyof FormState, value: number) {
    setForm((current) => ({ ...current, [key]: Number.isFinite(value) ? value : 0 }));
  }

  function updateCommercialData(key: keyof SimulatorCommercialData, value: string) {
    setCommercialData((current) => ({ ...current, [key]: value }));
  }

  function generatePdf() {
    generateSimulatorCommercialPdf({
      presentation,
      simulationName,
      commercialData,
      simulationDate: new Date().toISOString(),
    });
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="eyebrow text-emerald-800">Patrion Simulator</p>
        <h1 className="mt-2 text-3xl font-semibold">Simulacao Comercial</h1>
        <p className="mt-2 text-slate-600">Informe os parametros. O resultado e recalculado em tempo real.</p>
      </div>

      <section className="card space-y-5">
        <h2 className="text-xl font-semibold">Formulario</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField label="Credito contratado" value={form.credit} onChange={(value) => updateForm("credit", value)} />
          <NumberField label="Taxa administrativa (%)" value={form.administrativeFeePercent} onChange={(value) => updateForm("administrativeFeePercent", value)} />
          <NumberField label="Fundo de reserva (%)" value={form.reserveFundPercent} onChange={(value) => updateForm("reserveFundPercent", value)} />
          <NumberField label="Prazo (meses)" step={1} value={form.termMonths} onChange={(value) => updateForm("termMonths", value)} />
          <NumberField label="Seguro mensal (%)" step={0.01} value={form.monthlyInsurancePercent} onChange={(value) => updateForm("monthlyInsurancePercent", value)} />
          <NumberField label="INCC anual (%)" value={form.inccPercent} onChange={(value) => updateForm("inccPercent", value)} />
          <NumberField label="Venda estimada da carta (%)" value={form.cardSalePercent} onChange={(value) => updateForm("cardSalePercent", value)} />
          <NumberField label="Lance embutido (%)" value={form.embeddedBidPercent} onChange={(value) => updateForm("embeddedBidPercent", value)} />
          <NumberField label="Lance em dinheiro (%)" value={form.cashBidPercent} onChange={(value) => updateForm("cashBidPercent", value)} />
          <NumberField label="Mes de contemplacao" step={1} value={contemplationMonth} onChange={setContemplationMonth} />
          <SelectField label="Cenario" value={scenario} onChange={(value) => setScenario(value as SimulatorScenarioKey)} options={[
            ["full", "Parcela cheia"], ["seventy", "70%"], ["half", "50%"],
          ]} />
          <SelectField label="Seguro" value={insurance} onChange={(value) => setInsurance(value as InsuranceOption)} options={[
            ["with-insurance", "Com seguro"], ["without-insurance", "Sem seguro"],
          ]} />
          <SelectField label="Lance" value={bidType} onChange={(value) => setBidType(value as BidType)} options={[
            ["none", "Sem lance"], ["embedded", "Lance embutido"], ["cash", "Lance em dinheiro"],
          ]} />
        </div>
      </section>

      <section className="card space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Resultado</h2>
            <p className="mt-1 text-sm text-slate-600">{presentation.selectedScenarioName} · {presentation.insuranceLabel} · {presentation.bidLabel}</p>
          </div>
          <button className="button" onClick={generatePdf} type="button">Gerar PDF Comercial</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Credito atualizado" value={currency.format(presentation.updatedCredit)} />
          <Metric label="Credito liquido" value={currency.format(presentation.liquidCredit)} />
          <Metric label="Parcela antes" value={currency.format(presentation.installmentBeforeContemplation)} />
          <Metric label="Parcela apos" value={currency.format(presentation.installmentAfterContemplation)} />
          <Metric label="Investimento real" value={currency.format(presentation.realInvestment)} />
          <Metric label="Venda estimada" value={currency.format(presentation.estimatedCardSaleValue)} />
          <Metric label="Lucro estimado" value={currency.format(presentation.estimatedCardSaleProfit)} />
          <Metric label="Ganho estimado" value={percent.format(presentation.estimatedCardSaleGainRate)} />
        </div>
      </section>

      <section className="card space-y-5">
        <h2 className="text-xl font-semibold">Dados do PDF</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Nome da simulacao" value={simulationName} onChange={setSimulationName} />
          <TextField label="Cliente" value={commercialData.clientName} onChange={(value) => updateCommercialData("clientName", value)} />
          <TextField label="Telefone" value={commercialData.clientPhone} onChange={(value) => updateCommercialData("clientPhone", value)} />
          <TextField label="E-mail" value={commercialData.clientEmail} onChange={(value) => updateCommercialData("clientEmail", value)} />
          <TextField label="Consultor" value={commercialData.consultantName} onChange={(value) => updateCommercialData("consultantName", value)} />
          <label className="field sm:col-span-2">Observacoes<textarea className="textarea" value={commercialData.commercialNotes} onChange={(event) => updateCommercialData("commercialNotes", event.target.value)} /></label>
        </div>
      </section>
    </section>
  );
}

function NumberField({ label, value, onChange, step = 0.01 }: { label: string; value: number; onChange: (value: number) => void; step?: number }) {
  return <label className="field">{label}<input className="input" min="0" onChange={(event) => onChange(event.target.valueAsNumber)} step={step} type="number" value={value} /></label>;
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field">{label}<input className="input" onChange={(event) => onChange(event.target.value)} type="text" value={value} /></label>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="field">{label}<select className="select" onChange={(event) => onChange(event.target.value)} value={value}>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><p className="metric-label">{label}</p><p className="metric-value">{value}</p></div>;
}

function rate(value: number) { return Math.max(0, value || 0) / 100; }
function clamp(value: number, min: number, max: number) { return Math.min(Math.max(min, Math.trunc(value || min)), max); }
