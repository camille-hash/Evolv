"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calculateMultiCotas,
  loadMultiCotasInput,
  MAX_MULTI_COTAS_CARDS,
  MIN_MULTI_COTAS_CARDS,
  normalizeMultiCotasInput,
  saveMultiCotasInput,
  type MultiCotasInput,
} from "@/modules/multi-cotas";
import { Button } from "@/components/ui/button";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export function MultiCotasPage() {
  const [input, setInput] = useState<MultiCotasInput>(() =>
    loadMultiCotasInput(),
  );
  const [technicalOpen, setTechnicalOpen] = useState(false);
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

  function updateInput(partialInput: Partial<MultiCotasInput>) {
    const nextInput = saveMultiCotasInput(
      normalizeMultiCotasInput({
        ...input,
        ...partialInput,
      }),
    );

    setInput(nextInput);
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
              Mes de uso
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {input.consolidationMonth}
            </p>
          </div>
        </div>
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
            label="Mes de consolidacao"
            value={`Mes ${input.consolidationMonth}`}
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
            permanecer valorizando ate o mes {input.consolidationMonth},
            escolhido como mes de consolidacao.
          </p>
        </section>

        <section className="executive-surface rounded-md p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Mes de consolidacao
          </p>
          <p className="mt-3 text-5xl font-semibold text-primary">
            {input.consolidationMonth}
          </p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Ate este mes, as cartas contempladas podem permanecer valorizando na
            administradora.
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
                Mes {card.contemplationMonth}
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Detalhe operacional por carta
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">
              Memoria de apoio da estrategia
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
            onCardChange={updateCard}
            onInputChange={updateInput}
          />
        ) : null}

        <div className="mt-6 overflow-x-auto rounded-md border bg-background/60">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                <th className="py-3 pr-4 font-medium">Carta</th>
                <th className="py-3 pr-4 font-medium">Valor original</th>
                <th className="py-3 pr-4 font-medium">Mes contemplacao</th>
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
  onCardChange,
  onInputChange,
}: {
  input: MultiCotasInput;
  onCardChange: (
    cardId: string,
    partialCard: Partial<MultiCotasInput["cards"][number]>,
  ) => void;
  onInputChange: (input: Partial<MultiCotasInput>) => void;
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
          label="Valorizacao mensal parada (%)"
          onChange={(monthlyIdleAppreciationPercent) =>
            onInputChange({ monthlyIdleAppreciationPercent })
          }
          step="0.1"
          value={input.monthlyIdleAppreciationPercent}
        />
        <NumberField
          label="Mes de uso/consolidacao"
          min={1}
          onChange={(consolidationMonth) =>
            onInputChange({ consolidationMonth })
          }
          value={input.consolidationMonth}
        />
      </div>

      <div className="mt-6 grid gap-3">
        {input.cards.map((card) => (
          <div
            className="grid gap-3 rounded-md border bg-card p-4 md:grid-cols-[1fr_1fr_1fr]"
            key={card.id}
          >
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
              label="Mes de contemplacao"
              min={1}
              onChange={(contemplationMonth) =>
                onCardChange(card.id, { contemplationMonth })
              }
              value={card.contemplationMonth}
            />
          </div>
        ))}
      </div>
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
