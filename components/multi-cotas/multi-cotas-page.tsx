"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import {
  calculateMultiCotas,
  loadMultiCotasInput,
  MAX_MULTI_COTAS_CARDS,
  MIN_MULTI_COTAS_CARDS,
  normalizeMultiCotasInput,
  saveMultiCotasInput,
  type MultiCotasCardResult,
  type MultiCotasInput,
  type MultiCotasResult,
} from "@/modules/multi-cotas";
import { Button } from "@/components/ui/button";
import type { CrmLeadProposalContext } from "@/modules/crm";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  style: "percent",
});

type MultiCotasSaveState = {
  message: string;
  status: "idle" | "saving" | "success" | "error";
};

export function MultiCotasPage({
  leadProposalContext,
  onClearLeadProposalContext,
}: {
  leadProposalContext?: CrmLeadProposalContext | null;
  onClearLeadProposalContext?: () => void;
}) {
  const [input, setInput] = useState<MultiCotasInput>(() =>
    loadMultiCotasInput(),
  );
  const [technicalOpen, setTechnicalOpen] = useState(true);
  const [simulationStatus, setSimulationStatus] = useState(
    "Simulacao atualizada",
  );
  const [studyTitle, setStudyTitle] = useState("");
  const [saveState, setSaveState] = useState<MultiCotasSaveState>({
    message: "",
    status: "idle",
  });
  const result = useMemo(() => calculateMultiCotas(input), [input]);
  const averageCardValue =
    result.summary.cardCount > 0
      ? result.summary.totalOriginalContracted / result.summary.cardCount
      : 0;
  const totalEstimatedGain =
    result.summary.totalInccGain + result.summary.totalIdleAppreciationGain;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setInput(loadMultiCotasInput());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function updateInput(
    partialInput: Partial<MultiCotasInput>,
    status = "Alteracoes aplicadas em tempo real",
  ) {
    const nextInput = saveMultiCotasInput(
      normalizeMultiCotasInput({
        ...input,
        ...partialInput,
      }),
    );

    setInput(nextInput);
    setSimulationStatus(status);
  }

  function updateCard(
    cardId: string,
    partialCard: Partial<MultiCotasInput["cards"][number]>,
  ) {
    updateInput({
      cards: input.cards.map((card) =>
        card.id === cardId
          ? {
              ...card,
              ...partialCard,
            }
          : card,
      ),
    });
  }

  function applySharedSettingsToAllCards() {
    updateInput({
      cards: input.cards.map((card) => ({
        ...card,
        originalValue: input.baseCardValue,
        contemplationMonth: input.sharedContemplationMonth,
        withdrawalMonth: input.consolidationMonth,
      })),
    }, "Configuracao comum aplicada a todas as cartas");
  }

  function handleConfirmSimulation() {
    setInput(saveMultiCotasInput(normalizeMultiCotasInput(input)));
    setSimulationStatus("Simulacao atualizada");
  }

  async function handleSaveLeadMultiCotas() {
    if (!leadProposalContext?.leadId) {
      setSaveState({
        message: "Abra a estrategia a partir de um lead antes de salvar.",
        status: "error",
      });
      return;
    }

    const title =
      studyTitle.trim() || `Estudo Multi-Cotas - ${leadProposalContext.leadName}`;

    setSaveState({
      message: "Salvando estudo Multi-Cotas no lead...",
      status: "saving",
    });

    const accessToken = await readSupabaseAccessToken();

    if (!accessToken) {
      setSaveState({
        message: "Sessao Supabase indisponivel. Faca login novamente.",
        status: "error",
      });
      return;
    }

    const payload = buildMultiCotasLeadSimulationPayload({
      input,
      leadProposalContext,
      result,
      title,
    });

    try {
      const response = await fetch("/api/crm/lead-simulations", {
        body: JSON.stringify(payload),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        simulation?: { id?: string };
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Nao foi possivel salvar o estudo.");
      }

      setSaveState({
        message: body?.simulation?.id
          ? `Estudo Multi-Cotas salvo. ID: ${body.simulation.id}`
          : "Estudo Multi-Cotas salvo no lead.",
        status: "success",
      });
    } catch (error) {
      setSaveState({
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar o estudo.",
        status: "error",
      });
    }
  }

  return (
    <section className="grid gap-6">
      <section className="executive-hero rounded-md p-7 text-primary-foreground sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/70">
          Estrategia Multi-Cotas
        </p>
        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-4xl font-semibold tracking-normal sm:text-5xl">
              Multi-Cotas
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-primary-foreground/74">
              Simulacao de multiplas cartas com contemplacoes escalonadas.
            </p>
          </div>
          <div className="rounded-md border border-primary-foreground/14 bg-primary-foreground/8 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-primary-foreground/58">
              Cartas simuladas
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {result.summary.cardCount}
            </p>
          </div>
        </div>
      </section>

      {leadProposalContext ? (
        <section className="executive-surface rounded-md p-5 text-card-foreground">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Lead vinculado
              </p>
              <h2 className="mt-2 text-lg font-semibold text-foreground">
                {leadProposalContext.leadName}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Este estudo sera salvo apenas para este lead.
              </p>
            </div>
            <div className="grid w-full gap-3 lg:max-w-md">
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Titulo do estudo
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                  onChange={(event) => setStudyTitle(event.target.value)}
                  placeholder={`Estudo Multi-Cotas - ${leadProposalContext.leadName}`}
                  value={studyTitle}
                />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  disabled={saveState.status === "saving"}
                  onClick={handleSaveLeadMultiCotas}
                  type="button"
                >
                  {saveState.status === "saving"
                    ? "Salvando..."
                    : "Salvar estudo no lead"}
                </Button>
                {onClearLeadProposalContext ? (
                  <Button
                    onClick={onClearLeadProposalContext}
                    type="button"
                    variant="secondary"
                  >
                    Encerrar contexto do lead
                  </Button>
                ) : null}
              </div>
              {saveState.message ? (
                <p
                  className={
                    saveState.status === "error"
                      ? "text-xs leading-5 text-destructive"
                      : "text-xs leading-5 text-muted-foreground"
                  }
                >
                  {saveState.message}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="executive-surface rounded-md p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Dados Tecnicos
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">
              Parametros da estrategia
            </h2>
          </div>
          <Button
            onClick={() => setTechnicalOpen((current) => !current)}
            type="button"
            variant="secondary"
          >
            Dados Tecnicos
          </Button>
        </div>

        {technicalOpen ? (
          <TechnicalSettings
            input={input}
            onApplySharedSettingsToAllCards={applySharedSettingsToAllCards}
            onCardChange={updateCard}
            onConfirmSimulation={handleConfirmSimulation}
            onInputChange={updateInput}
            resultCards={result.cards}
            simulationStatus={simulationStatus}
          />
        ) : null}
      </section>

      <section className="executive-surface rounded-md p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Resumo da Estrategia Multi-Cotas
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ResultCard
            label="Quantidade de cartas"
            value={String(result.summary.cardCount)}
          />
          <ResultCard
            label="Valor medio das cartas"
            value={currencyFormatter.format(averageCardValue)}
          />
          <ResultCard
            label="Total contratado"
            value={currencyFormatter.format(
              result.summary.totalOriginalContracted,
            )}
          />
          <ResultCard
            label="Total atualizado pelo INCC"
            value={currencyFormatter.format(result.summary.totalUpdatedCredit)}
          />
          <ResultCard
            label="Total futuro estimado"
            value={currencyFormatter.format(result.summary.totalFutureValue)}
          />
          <ResultCard
            label="Ganho estimado total"
            value={currencyFormatter.format(totalEstimatedGain)}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.72fr]">
        <section className="executive-surface rounded-md p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Narrativa comercial
          </p>
          <p className="mt-4 max-w-4xl text-lg leading-8 text-foreground">
            Nesta estrategia, o cliente distribui a aquisicao patrimonial em{" "}
            {result.summary.cardCount} cartas. Conforme as contemplacoes ocorrem
            ao longo do tempo, os creditos sao atualizados pelo INCC e podem
            permanecer valorizando ate o mes de saque definido para cada carta.
          </p>
        </section>

        <section className="executive-surface rounded-md p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Mes de saque
          </p>
          <p className="mt-3 text-3xl font-semibold text-primary">
            Individual por carta
          </p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Cada carta pode permanecer valorizando na administradora ate o mes
            de saque do credito definido nos dados tecnicos.
          </p>
        </section>
      </section>

      <section className="executive-surface rounded-md p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Linha do Tempo Multi-Cotas
        </p>
        <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
          {result.cards.map((card) => (
            <article
              className="min-w-44 rounded-md border bg-background/70 p-4"
              key={card.id}
            >
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Carta {card.position}
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                Contemplacao: mes {card.contemplationMonth}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                Saque: mes {card.withdrawalMonth}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {currencyFormatter.format(card.updatedCredit)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ResultCard
          label="Ganho por INCC"
          value={currencyFormatter.format(result.summary.totalInccGain)}
        />
        <ResultCard
          label="Ganho por valorizacao parada"
          value={currencyFormatter.format(
            result.summary.totalIdleAppreciationGain,
          )}
        />
        <ResultCard
          label="Ganho total estimado"
          value={currencyFormatter.format(totalEstimatedGain)}
        />
      </section>

      <section className="executive-surface rounded-md p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Tabela de Apoio
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">
            Memoria operacional por carta
          </h2>
        </div>
        <div className="mt-6 overflow-x-auto rounded-md border bg-background/60">
          <table className="w-full min-w-[1040px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                <th className="py-3 pr-4 font-medium">Carta</th>
                <th className="py-3 pr-4 font-medium">Valor original</th>
                <th className="py-3 pr-4 font-medium">Mes contemplacao</th>
                <th className="py-3 pr-4 font-medium">Mes saque</th>
                <th className="py-3 pr-4 font-medium">Reajustes INCC</th>
                <th className="py-3 pr-4 font-medium">Credito atualizado</th>
                <th className="py-3 pr-4 font-medium">Meses parada</th>
                <th className="py-3 pr-4 font-medium">Valor futuro</th>
              </tr>
            </thead>
            <tbody>
              {result.cards.map((card) => (
                <tr className="border-b last:border-b-0" key={card.id}>
                  <td className="py-4 pr-4 font-semibold text-foreground">
                    Carta {card.position}
                  </td>
                  <td className="py-4 pr-4">
                    {currencyFormatter.format(card.originalValue)}
                  </td>
                  <td className="py-4 pr-4">Mes {card.contemplationMonth}</td>
                  <td className="py-4 pr-4">Mes {card.withdrawalMonth}</td>
                  <td className="py-4 pr-4">{card.inccAdjustmentCount}</td>
                  <td className="py-4 pr-4 font-medium text-foreground">
                    {currencyFormatter.format(card.updatedCredit)}
                  </td>
                  <td className="py-4 pr-4">{card.idleMonths}</td>
                  <td className="py-4 pr-4 font-semibold text-primary">
                    {currencyFormatter.format(card.futureValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function TechnicalSettings({
  input,
  onApplySharedSettingsToAllCards,
  onCardChange,
  onConfirmSimulation,
  onInputChange,
  resultCards,
  simulationStatus,
}: {
  input: MultiCotasInput;
  onApplySharedSettingsToAllCards: () => void;
  onCardChange: (
    cardId: string,
    partialCard: Partial<MultiCotasInput["cards"][number]>,
  ) => void;
  onConfirmSimulation: () => void;
  onInputChange: (input: Partial<MultiCotasInput>) => void;
  resultCards: MultiCotasCardResult[];
  simulationStatus: string;
}) {
  return (
    <div className="mt-6 rounded-md border bg-background/70 p-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <NumberField
          label="Numero de cartas"
          max={MAX_MULTI_COTAS_CARDS}
          min={MIN_MULTI_COTAS_CARDS}
          onChange={(cardCount) => onInputChange({ cardCount })}
          value={input.cardCount}
        />
        <NumberField
          label="Valor base da carta"
          onChange={(baseCardValue) => onInputChange({ baseCardValue })}
          value={input.baseCardValue}
        />
        <NumberField
          label="Prazo total em meses"
          min={1}
          onChange={(termMonths) => onInputChange({ termMonths })}
          value={input.termMonths}
        />
        <NumberField
          label="INCC anual (%)"
          onChange={(annualInccPercent) => onInputChange({ annualInccPercent })}
          step="0.1"
          value={input.annualInccPercent}
        />
        <NumberField
          label="Mes de contemplacao para todas"
          min={1}
          onChange={(sharedContemplationMonth) =>
            onInputChange({ sharedContemplationMonth })
          }
          value={input.sharedContemplationMonth}
        />
        <NumberField
          label="Valorizacao mensal parada (%)"
          onChange={(monthlyIdleAppreciationPercent) =>
            onInputChange({ monthlyIdleAppreciationPercent })
          }
          step="0.1"
          value={input.monthlyIdleAppreciationPercent}
        />
        <NumberField
          label="Aplicar mes de saque para todas as cartas"
          min={1}
          onChange={(consolidationMonth) =>
            onInputChange({ consolidationMonth })
          }
          value={input.consolidationMonth}
        />
        <div className="flex items-end">
          <Button
            className="w-full"
            onClick={onApplySharedSettingsToAllCards}
            type="button"
            variant="secondary"
          >
            Aplicar a todas
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {input.cards.map((card) => {
          const resultCard =
            resultCards.find((currentCard) => currentCard.id === card.id) ??
            resultCards[card.position - 1];

          return (
            <div
              className="grid gap-4 rounded-md border bg-card p-4"
              key={card.id}
            >
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr]">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Carta
                  </p>
                  <p className="mt-2 font-semibold text-foreground">
                    Carta {card.position}
                  </p>
                </div>
                <NumberField
                  label="Valor individual"
                  onChange={(originalValue) =>
                    onCardChange(card.id, { originalValue })
                  }
                  value={card.originalValue}
                />
                <NumberField
                  label="Mes de saque do credito"
                  min={1}
                  onChange={(withdrawalMonth) =>
                    onCardChange(card.id, { withdrawalMonth })
                  }
                  value={card.withdrawalMonth}
                />
              </div>

              <ContemplationTracker
                maxMonth={input.termMonths}
                onChange={(contemplationMonth) =>
                  onCardChange(card.id, { contemplationMonth })
                }
                value={card.contemplationMonth}
              />

              {resultCard ? <CardOperationalSummary card={resultCard} /> : null}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          {simulationStatus}
        </p>
        <Button onClick={onConfirmSimulation} type="button">
          Confirmar simulacao
        </Button>
      </div>
    </div>
  );
}

function ContemplationTracker({
  maxMonth,
  onChange,
  value,
}: {
  maxMonth: number;
  onChange: (value: number) => void;
  value: number;
}) {
  const nextValue = Math.min(Math.max(1, Math.trunc(value)), maxMonth);

  return (
    <div className="rounded-md border bg-background/70 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Mes de contemplacao
          </p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            Mes {nextValue}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            aria-label="Reduzir mes de contemplacao"
            disabled={nextValue <= 1}
            onClick={() => onChange(nextValue - 1)}
            type="button"
            variant="secondary"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            aria-label="Aumentar mes de contemplacao"
            disabled={nextValue >= maxMonth}
            onClick={() => onChange(nextValue + 1)}
            type="button"
            variant="secondary"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <input
        aria-label="Selecionar mes de contemplacao da carta"
        className="mt-4 w-full accent-primary"
        max={maxMonth}
        min={1}
        onChange={(event) => onChange(Number(event.target.value))}
        type="range"
        value={nextValue}
      />
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>Mes 1</span>
        <span>Mes {maxMonth}</span>
      </div>
    </div>
  );
}

function CardOperationalSummary({ card }: { card: MultiCotasCardResult }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <InlineMetric
        label="Credito"
        value={currencyFormatter.format(card.commercialCredit)}
      />
      <InlineMetric
        label="Reajustes INCC"
        value={String(card.inccAdjustmentCount)}
      />
      <InlineMetric
        label="Valor futuro"
        value={currencyFormatter.format(card.futureValue)}
      />
      <InlineMetric
        label="ROI estimado"
        value={percentFormatter.format(card.estimatedGainRate)}
      />
    </div>
  );
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/70 p-3">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="executive-surface rounded-md p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
    </article>
  );
}

function NumberField({
  label,
  max,
  min = 0,
  onChange,
  step = "1",
  value,
}: {
  label: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  step?: string;
  value: number;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <input
        className="h-10 rounded-md border bg-background px-3 text-sm font-medium text-foreground outline-none transition focus:border-primary"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="number"
        value={String(value)}
      />
    </label>
  );
}

function buildMultiCotasLeadSimulationPayload({
  input,
  leadProposalContext,
  result,
  title,
}: {
  input: MultiCotasInput;
  leadProposalContext: CrmLeadProposalContext;
  result: MultiCotasResult;
  title: string;
}) {
  const totalEstimatedGain =
    result.summary.totalInccGain + result.summary.totalIdleAppreciationGain;
  const snapshot = {
    input,
    metadata: {
      source: "multi_cotas",
      version: "103A.41-R1",
    },
    result: {
      cards: result.cards,
      summary: result.summary,
    },
  };

  return {
    calculationSnapshot: snapshot,
    leadId: leadProposalContext.leadId,
    presentationSnapshot: {
      ...snapshot,
      leadContext: {
        leadName: leadProposalContext.leadName,
      },
      summary: {
        averageCardValue:
          result.summary.cardCount > 0
            ? result.summary.totalOriginalContracted / result.summary.cardCount
            : 0,
        totalEstimatedGain,
        totalFutureValue: result.summary.totalFutureValue,
        totalUpdatedCredit: result.summary.totalUpdatedCredit,
      },
    },
    simulationType: "multi_cotas",
    source: "multi_cotas",
    summary: {
      commercialCredit: result.summary.totalUpdatedCredit,
      contemplationMonth: input.sharedContemplationMonth,
      estimatedGain: totalEstimatedGain,
      estimatedSaleValue: result.summary.totalFutureValue,
      inccRate: input.annualInccPercent / 100,
      quotaCount: result.summary.cardCount,
      totalCredit: result.summary.totalOriginalContracted,
      updatedCredit: result.summary.totalUpdatedCredit,
    },
    technicalInput: snapshot,
    title,
  };
}

async function readSupabaseAccessToken() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    return null;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    return null;
  }

  return data.session.access_token;
}
