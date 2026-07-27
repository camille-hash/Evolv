"use client";

import { type FormEvent, useEffect, useState } from "react";
import {
  createContractAssembly,
  createContractBid,
  fetchContractOperationalTimeline,
  saveContractBidResult,
} from "@/modules/operations/contract-timeline-client";
import type {
  ContractBidComposition,
  ContractOperationalTimeline,
  RegisterAssemblyInput,
  RegisterBidInput,
  RegisterBidResultInput,
} from "@/modules/operations/contract-timeline-types";
import { calculateBidSnapshot } from "@/modules/operations/contract-timeline-calculations";

type Action = "assembly" | "bid" | "result" | null;

const emptyTimeline: ContractOperationalTimeline = {
  assemblies: [],
  bids: [],
  events: [],
};
const currency = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function ContractOperationalTimeline({
  contractId,
  creditValue,
}: {
  contractId: string;
  creditValue: number;
}) {
  const [timeline, setTimeline] = useState(emptyTimeline);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<Action>(null);

  useEffect(() => {
    let active = true;
    fetchContractOperationalTimeline(contractId)
      .then((result) => {
        if (active) setTimeline(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(readMessage(cause));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [contractId]);

  function complete(nextTimeline: ContractOperationalTimeline) {
    setTimeline(nextTimeline);
    setError(null);
    setAction(null);
  }

  return (
    <section className="mt-5 border-t border-slate-200 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-slate-950">
            Timeline Operacional
          </h4>
          <p className="mt-1 text-sm text-slate-500">
            Assembleias, lances e resultados persistidos deste contrato.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={() => setAction("assembly")}>
            Registrar assembleia
          </ActionButton>
          <ActionButton
            disabled={!timeline.assemblies.length}
            onClick={() => setAction("bid")}
          >
            Registrar lance
          </ActionButton>
          <ActionButton
            disabled={!timeline.bids.length}
            onClick={() => setAction("result")}
          >
            Registrar resultado
          </ActionButton>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
      {action === "assembly" ? (
        <AssemblyForm
          contractId={contractId}
          onCancel={() => setAction(null)}
          onComplete={complete}
        />
      ) : null}
      {action === "bid" ? (
        <BidForm
          assemblies={timeline.assemblies}
          contractId={contractId}
          creditValue={creditValue}
          onCancel={() => setAction(null)}
          onComplete={complete}
        />
      ) : null}
      {action === "result" ? (
        <ResultForm
          bids={timeline.bids}
          contractId={contractId}
          onCancel={() => setAction(null)}
          onComplete={complete}
        />
      ) : null}

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-500">Carregando Timeline...</p>
      ) : timeline.events.length ? (
        <ol className="mt-5 grid gap-3">
          {timeline.events.map((event) => (
            <li
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              key={event.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                  {eventTypeLabel(event.eventType)}
                </span>
                <time className="text-xs text-slate-500">
                  {formatDate(event.eventAt)}
                </time>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {event.title}
              </p>
              {event.description ? (
                <p className="mt-1 text-sm text-slate-600">
                  {event.description}
                </p>
              ) : null}
              <EventSummary metadata={event.metadata} />
              <p className="mt-2 text-xs text-slate-400">
                Origem: {sourceLabel(event.sourceEntityType)}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-center">
          <p className="text-sm font-medium text-slate-700">
            Nenhum evento operacional registrado.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Contratos legados continuam válidos sem backfill artificial.
          </p>
        </div>
      )}
    </section>
  );
}

function AssemblyForm({
  contractId,
  onCancel,
  onComplete,
}: FormProps) {
  const [input, setInput] = useState<RegisterAssemblyInput>(() => ({
    assemblyDate: "",
    id: crypto.randomUUID(),
    status: "scheduled",
  }));
  const submission = useSubmission();

  async function submit(event: FormEvent) {
    event.preventDefault();
    await submission.run(() => createContractAssembly(contractId, input), onComplete);
  }

  return (
    <FormShell
      error={submission.error}
      isSaving={submission.isSaving}
      onCancel={onCancel}
      onSubmit={submit}
      title="Registrar assembleia"
    >
      <Field label="Data da assembleia">
        <input
          className={inputClass}
          onChange={(event) =>
            setInput({ ...input, assemblyDate: toIso(event.target.value) })
          }
          required
          type="datetime-local"
        />
      </Field>
      <Field label="Número da assembleia (opcional)">
        <input
          className={inputClass}
          onChange={(event) =>
            setInput({ ...input, assemblyNumber: event.target.value })
          }
        />
      </Field>
      <Field label="Status">
        <select
          className={inputClass}
          onChange={(event) =>
            setInput({
              ...input,
              status: event.target.value as RegisterAssemblyInput["status"],
            })
          }
          value={input.status}
        >
          <option value="scheduled">Agendada</option>
          <option value="postponed">Adiada</option>
          <option value="completed">Realizada</option>
          <option value="cancelled">Cancelada</option>
        </select>
      </Field>
      <Notes value={input.notes} onChange={(notes) => setInput({ ...input, notes })} />
    </FormShell>
  );
}

function BidForm({
  assemblies,
  contractId,
  creditValue,
  onCancel,
  onComplete,
}: FormProps & {
  assemblies: ContractOperationalTimeline["assemblies"];
  creditValue: number;
}) {
  const [input, setInput] = useState<RegisterBidInput>(() => ({
    assemblyId: assemblies[0]?.id ?? "",
    bidComposition: "cash",
    bidModality: "free",
    cashAmount: 0,
    embeddedAmount: 0,
    id: crypto.randomUUID(),
    result: "draft",
  }));
  const submission = useSubmission();
  const snapshot = calculateBidSnapshot({
    cashAmount: input.cashAmount,
    creditBaseAmount: creditValue,
    embeddedAmount: input.embeddedAmount,
  });

  function setComposition(composition: ContractBidComposition) {
    setInput({
      ...input,
      bidComposition: composition,
      cashAmount: composition === "embedded" ? 0 : input.cashAmount,
      embeddedAmount: composition === "cash" ? 0 : input.embeddedAmount,
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await submission.run(() => createContractBid(contractId, input), onComplete);
  }

  return (
    <FormShell
      error={submission.error}
      isSaving={submission.isSaving}
      onCancel={onCancel}
      onSubmit={submit}
      title="Registrar lance"
    >
      <Field label="Assembleia">
        <select
          className={inputClass}
          onChange={(event) =>
            setInput({ ...input, assemblyId: event.target.value })
          }
          required
          value={input.assemblyId}
        >
          {assemblies.map((assembly) => (
            <option key={assembly.id} value={assembly.id}>
              {assembly.assemblyNumber
                ? `Assembleia ${assembly.assemblyNumber}`
                : formatDate(assembly.assemblyDate)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Modalidade">
        <select
          className={inputClass}
          onChange={(event) =>
            setInput({
              ...input,
              bidModality:
                event.target.value as RegisterBidInput["bidModality"],
            })
          }
          value={input.bidModality}
        >
          <option value="free">Livre</option>
          <option value="fixed">Fixo</option>
          <option value="loyalty">Fidelidade</option>
          <option value="other">Outro</option>
        </select>
      </Field>
      <Field label="Composição">
        <select
          className={inputClass}
          onChange={(event) =>
            setComposition(event.target.value as ContractBidComposition)
          }
          value={input.bidComposition}
        >
          <option value="cash">Dinheiro</option>
          <option value="embedded">Embutido</option>
          <option value="mixed">Misto</option>
        </select>
      </Field>
      <MoneyField
        disabled={input.bidComposition === "embedded"}
        label="Valor em dinheiro"
        onChange={(cashAmount) => setInput({ ...input, cashAmount })}
        value={input.cashAmount}
      />
      <MoneyField
        disabled={input.bidComposition === "cash"}
        label="Valor embutido"
        onChange={(embeddedAmount) => setInput({ ...input, embeddedAmount })}
        value={input.embeddedAmount}
      />
      <div className="rounded-lg bg-white p-3 text-sm text-slate-700">
        <p>Total calculado: <strong>{currency.format(snapshot.totalAmount)}</strong></p>
        <p className="mt-1">
          Base de crédito utilizada no cálculo:{" "}
          <strong>{currency.format(creditValue)}</strong>
        </p>
        <p className="mt-1">
          Percentual total:{" "}
          <strong>
            {snapshot.totalPercentage === null
              ? "Indisponível"
              : `${snapshot.totalPercentage.toFixed(4)}%`}
          </strong>
        </p>
      </div>
      <Field label="Data do envio (opcional)">
        <input
          className={inputClass}
          onChange={(event) =>
            setInput({ ...input, submittedAt: toIso(event.target.value) })
          }
          type="datetime-local"
        />
      </Field>
      <Notes value={input.notes} onChange={(notes) => setInput({ ...input, notes })} />
    </FormShell>
  );
}

function ResultForm({
  bids,
  contractId,
  onCancel,
  onComplete,
}: FormProps & { bids: ContractOperationalTimeline["bids"] }) {
  const [bidId, setBidId] = useState(bids[0]?.id ?? "");
  const [input, setInput] = useState<RegisterBidResultInput>({
    contemplated: false,
  });
  const submission = useSubmission();

  async function submit(event: FormEvent) {
    event.preventDefault();
    await submission.run(
      () => saveContractBidResult(contractId, bidId, input),
      onComplete,
    );
  }

  return (
    <FormShell
      error={submission.error}
      isSaving={submission.isSaving}
      onCancel={onCancel}
      onSubmit={submit}
      title="Registrar resultado"
    >
      <Field label="Lance">
        <select
          className={inputClass}
          onChange={(event) => setBidId(event.target.value)}
          value={bidId}
        >
          {bids.map((bid) => (
            <option key={bid.id} value={bid.id}>
              {currency.format(bid.totalAmount)} — {bid.totalPercentage?.toFixed(4) ?? "—"}%
            </option>
          ))}
        </select>
      </Field>
      <Field label="Contemplado">
        <select
          className={inputClass}
          onChange={(event) =>
            setInput({
              ...input,
              contemplated: event.target.value === "yes",
              contemplationType:
                event.target.value === "yes"
                  ? input.contemplationType ?? "draw"
                  : undefined,
            })
          }
          value={input.contemplated ? "yes" : "no"}
        >
          <option value="no">Não</option>
          <option value="yes">Sim</option>
        </select>
      </Field>
      {input.contemplated ? (
        <Field label="Tipo de contemplação">
          <select
            className={inputClass}
            onChange={(event) =>
              setInput({
                ...input,
                contemplationType:
                  event.target.value as RegisterBidResultInput["contemplationType"],
              })
            }
            value={input.contemplationType}
          >
            <option value="draw">Sorteio</option>
            <option value="free_bid">Lance livre</option>
            <option value="fixed_bid">Lance fixo</option>
            <option value="other">Outro</option>
          </select>
        </Field>
      ) : null}
      <Field label="Percentual vencedor (opcional)">
        <input
          className={inputClass}
          min="0"
          onChange={(event) =>
            setInput({
              ...input,
              winningPercentage: numberOrUndefined(event.target.value),
            })
          }
          step="0.0001"
          type="number"
        />
      </Field>
      <Notes value={input.notes} onChange={(notes) => setInput({ ...input, notes })} />
    </FormShell>
  );
}

type FormProps = {
  contractId: string;
  onCancel: () => void;
  onComplete: (timeline: ContractOperationalTimeline) => void;
};

function FormShell({
  children,
  error,
  isSaving,
  onCancel,
  onSubmit,
  title,
}: {
  children: React.ReactNode;
  error: string | null;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
  title: string;
}) {
  return (
    <form
      className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
      onSubmit={onSubmit}
    >
      <p className="font-semibold text-slate-900">{title}</p>
      {children}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="flex gap-2">
        <button className={primaryButtonClass} disabled={isSaving} type="submit">
          {isSaving ? "Salvando..." : "Salvar"}
        </button>
        <button
          className={secondaryButtonClass}
          disabled={isSaving}
          onClick={onCancel}
          type="button"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}
function Notes({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value?: string;
}) {
  return (
    <Field label="Observações">
      <textarea
        className={inputClass}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        value={value ?? ""}
      />
    </Field>
  );
}
function MoneyField({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <Field label={label}>
      <input
        className={inputClass}
        disabled={disabled}
        min="0"
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        step="0.01"
        type="number"
        value={value}
      />
    </Field>
  );
}
function ActionButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={secondaryButtonClass}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
function EventSummary({ metadata }: { metadata: Record<string, unknown> }) {
  const total = numericMetadata(metadata.total_amount);
  const percentage = numericMetadata(metadata.total_percentage);
  const base = numericMetadata(metadata.credit_base_amount);
  if (total === null && percentage === null && base === null) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
      {total !== null ? <span>Valor: {currency.format(total)}</span> : null}
      {percentage !== null ? <span>Percentual: {percentage.toFixed(4)}%</span> : null}
      {base !== null ? (
        <span>Base de crédito utilizada no cálculo: {currency.format(base)}</span>
      ) : null}
    </div>
  );
}

function useSubmission() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return {
    error,
    isSaving,
    run: async (
      operation: () => Promise<ContractOperationalTimeline>,
      complete: (timeline: ContractOperationalTimeline) => void,
    ) => {
      setIsSaving(true);
      setError(null);
      try {
        complete(await operation());
      } catch (cause) {
        setError(readMessage(cause));
      } finally {
        setIsSaving(false);
      }
    },
  };
}

const inputClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100";
const primaryButtonClass =
  "rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60";
const secondaryButtonClass =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50";

function toIso(value: string) {
  return value ? new Date(value).toISOString() : "";
}
function numberOrUndefined(value: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
function numericMetadata(value: unknown) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Data indisponível" : dateTime.format(date);
}
function sourceLabel(value?: string) {
  if (value === "assembly") return "Assembleia";
  if (value === "bid") return "Lance";
  if (value === "contract") return "Contrato";
  return "Operação";
}
function eventTypeLabel(value: string) {
  return (
    {
      assembly_completed: "Assembleia realizada",
      assembly_scheduled: "Assembleia",
      assembly_updated: "Assembleia atualizada",
      bid_created: "Lance",
      bid_result_recorded: "Resultado",
      bid_submitted: "Lance enviado",
      contemplated: "Contemplação",
      contract_created: "Contrato",
      note_added: "Observação",
    }[value] ?? value
  );
}
function readMessage(value: unknown) {
  return value instanceof Error
    ? value.message
    : "Não foi possível concluir a operação.";
}
