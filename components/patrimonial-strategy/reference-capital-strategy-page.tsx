"use client";

import { useMemo, useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { PublicationBuilderPanel } from "@/components/patrimonial-strategy/publication-builder-panel";
import { Button } from "@/components/ui/button";
import type { CrmLeadProposalContext, CrmLeadSimulation } from "@/modules/crm";
import { readSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import {
  buildReferenceCapitalStrategySnapshot,
  calculateReferenceCapitalExclusiveStrategy,
  centsToCurrencyAmount,
  isReferenceCapitalStrategySnapshot,
  readPublicationsFromStrategySnapshot,
  type PatrimonialPublication,
  referenceCapitalCreditCatalog,
  referenceCapitalProductKey,
  referenceCapitalProductVersion,
  type ReferenceCapitalCreditAmount,
  type ReferenceCapitalStrategyResult,
} from "@/modules/patrimonial-strategy";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

type SaveState = {
  message: string;
  status: "idle" | "saving" | "success" | "error";
};

type QuotaDraft = {
  creditAmount: ReferenceCapitalCreditAmount;
  contemplationScenarioMonth: number;
  id: string;
};

export function ReferenceCapitalStrategyPage({
  leadProposalContext,
  onClearLeadProposalContext,
  onOpenCrm,
}: {
  leadProposalContext?: CrmLeadProposalContext | null;
  onClearLeadProposalContext?: () => void;
  onOpenCrm?: () => void;
}) {
  const [quotas, setQuotas] = useState<QuotaDraft[]>([
    {
      creditAmount: 150000,
      contemplationScenarioMonth: 12,
      id: "reference-capital-quota-1",
    },
    {
      creditAmount: 200000,
      contemplationScenarioMonth: 24,
      id: "reference-capital-quota-2",
    },
  ]);
  const [studyTitle, setStudyTitle] = useState("");
  const [
    includeContemplationScenariosInMaterial,
    setIncludeContemplationScenariosInMaterial,
  ] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({
    message: "",
    status: "idle",
  });
  const [savedSimulation, setSavedSimulation] =
    useState<CrmLeadSimulation | null>(null);
  const [isPublicationBuilderOpen, setIsPublicationBuilderOpen] =
    useState(false);

  const calculation = useMemo(() => {
    try {
      return {
        error: null,
        result: calculateReferenceCapitalExclusiveStrategy({
          includeContemplationScenariosInMaterial,
          productKey: referenceCapitalProductKey,
          productVersion: referenceCapitalProductVersion,
          quotas,
        }),
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel calcular esta estrategia.",
        result: null,
      };
    }
  }, [includeContemplationScenariosInMaterial, quotas]);

  function addQuota() {
    setQuotas((current) => [
      ...current,
      {
        creditAmount: 150000,
        contemplationScenarioMonth: Math.min(216, (current.length + 1) * 12),
        id: `reference-capital-quota-${current.length + 1}`,
      },
    ]);
  }

  function removeQuota(id: string) {
    setQuotas((current) =>
      current.length <= 2 ? current : current.filter((quota) => quota.id !== id),
    );
  }

  function updateQuotaCredit(
    id: string,
    creditAmount: ReferenceCapitalCreditAmount,
  ) {
    setQuotas((current) =>
      current.map((quota) =>
        quota.id === id
          ? {
              ...quota,
              creditAmount,
            }
          : quota,
      ),
    );
  }

  function updateQuotaContemplationScenarioMonth(id: string, month: number) {
    setQuotas((current) =>
      current.map((quota) =>
        quota.id === id
          ? {
              ...quota,
              contemplationScenarioMonth: normalizeScenarioMonth(month),
            }
          : quota,
      ),
    );
  }

  async function handleSave() {
    if (!leadProposalContext?.leadId) {
      setSaveState({
        message: "Abra a estrategia a partir de um lead antes de salvar.",
        status: "error",
      });
      return;
    }

    if (!calculation.result) {
      setSaveState({
        message: calculation.error ?? "Revise a composicao antes de salvar.",
        status: "error",
      });
      return;
    }

    setSaveState({
      message: "Salvando Estrategia Patrimonial Patrion Asset no lead...",
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

    const title =
      studyTitle.trim() ||
      `Estrategia Patrimonial Patrion Asset - ${leadProposalContext.leadName}`;
    const payload = buildLeadSimulationPayload({
      leadProposalContext,
      result: calculation.result,
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
        simulation?: CrmLeadSimulation;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Nao foi possivel salvar a estrategia.");
      }

      if (!body?.simulation?.id) {
        throw new Error("A estrategia foi salva, mas o retorno nao trouxe identificador.");
      }

      setSavedSimulation(body.simulation);
      setIsPublicationBuilderOpen(false);
      setSaveState({
        message:
          "Estrategia salva com sucesso. Agora voce pode preparar o Material Executivo que sera compartilhado com o cliente.",
        status: "success",
      });
    } catch (error) {
      setSaveState({
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar a estrategia.",
        status: "error",
      });
    }
  }

  async function savePublication(publication: PatrimonialPublication) {
    if (!savedSimulation) {
      throw new Error("Salve a estrategia antes de preparar o Material Executivo.");
    }

    const accessToken = await readSupabaseAccessToken();

    if (!accessToken) {
      throw new Error("Sessao Supabase indisponivel. Faca login novamente.");
    }

    const response = await fetch("/api/crm/lead-simulations", {
      body: JSON.stringify({
        publication,
        simulationId: savedSimulation.id,
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      simulation?: CrmLeadSimulation;
    } | null;

    if (!response.ok || !body?.simulation) {
      throw new Error(
        body?.error ?? "Nao foi possivel salvar a publicacao.",
      );
    }

    setSavedSimulation(body.simulation);
  }

  const savedPublications = savedSimulation
    ? readPublicationsFromStrategySnapshot(savedSimulation.presentationSnapshot)
    : [];
  const latestPublication =
    savedPublications
      .filter((publication) => publication.strategyVersion === 1)
      .sort((left, right) => {
        if (left.publicationVersion !== right.publicationVersion) {
          return right.publicationVersion - left.publicationVersion;
        }

        return right.createdAt.localeCompare(left.createdAt);
      })[0] ?? null;
  const savedStrategySnapshot = savedSimulation?.calculationSnapshot ?? null;
  const canRenderPublicationBuilder = Boolean(
    savedSimulation &&
      savedStrategySnapshot &&
      isReferenceCapitalStrategySnapshot(savedStrategySnapshot),
  );

  return (
    <section className="grid gap-6">
      <section className="executive-hero rounded-md p-7 text-primary-foreground sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/70">
          Estrategia Patrimonial Patrion Asset
        </p>
        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-4xl font-semibold tracking-normal sm:text-5xl">
              Grupo Exclusivo Referencia Capital
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-primary-foreground/74">
              Produto utilizado como instrumento financeiro para uma composicao
              patrimonial obrigatoriamente Multi-Cotas.
            </p>
          </div>
          <div className="rounded-md border border-primary-foreground/14 bg-primary-foreground/8 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-primary-foreground/58">
              Produto
            </p>
            <p className="mt-2 text-sm font-semibold">2227 - IMV115-PCRED</p>
          </div>
        </div>
      </section>

      {leadProposalContext ? (
        <section className="executive-surface rounded-md p-5 text-card-foreground">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Gerando estrategia para
              </p>
              <h2 className="mt-2 text-lg font-semibold text-foreground">
                {leadProposalContext.leadName}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                O snapshot sera preservado no Dossie deste lead com produto,
                engine e versao.
              </p>
            </div>
            <div className="grid w-full gap-3 lg:max-w-md">
              <label className="grid gap-2 text-sm font-medium text-foreground">
                Titulo do estudo
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                  onChange={(event) => setStudyTitle(event.target.value)}
                  placeholder={`Estrategia Patrimonial Patrion Asset - ${leadProposalContext.leadName}`}
                  value={studyTitle}
                />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  disabled={saveState.status === "saving" || !calculation.result}
                  onClick={handleSave}
                  type="button"
                >
                  {saveState.status === "saving"
                    ? "Salvando..."
                    : "Salvar estrategia no lead"}
                </Button>
                {savedSimulation ? (
                  <Button
                    onClick={() => setIsPublicationBuilderOpen(true)}
                    type="button"
                    variant="secondary"
                  >
                    Preparar Material Executivo
                  </Button>
                ) : null}
                {onClearLeadProposalContext ? (
                  <Button
                    onClick={onClearLeadProposalContext}
                    type="button"
                    variant="secondary"
                  >
                    Encerrar contexto
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
      ) : (
        <section className="executive-surface rounded-md border-dashed p-5 text-card-foreground">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Modo avulso indisponivel para salvamento
              </p>
              <h2 className="mt-2 text-lg font-semibold text-foreground">
                Inicie esta estrategia pelo Dossie do Lead.
              </h2>
            </div>
            {onOpenCrm ? (
              <Button onClick={onOpenCrm} type="button" variant="secondary">
                Iniciar pelo Dossie
              </Button>
            ) : null}
          </div>
        </section>
      )}

      {canRenderPublicationBuilder &&
      savedSimulation &&
      savedStrategySnapshot &&
      isReferenceCapitalStrategySnapshot(savedStrategySnapshot) ? (
        isPublicationBuilderOpen || latestPublication ? (
          <PublicationBuilderPanel
            createdBy={savedSimulation.createdBy}
            initialPublication={latestPublication}
            onPreparePublication={savePublication}
            onSaveDraft={savePublication}
            strategyId={`strategy:${savedSimulation.organizationId}:${savedSimulation.leadId}:${savedSimulation.id}`}
            strategySnapshot={savedStrategySnapshot}
            strategyTitle={savedSimulation.title}
            strategyVersion={1}
          />
        ) : (
          <section className="executive-surface rounded-md p-5 text-card-foreground">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Material Executivo
                </p>
                <h3 className="mt-2 text-lg font-semibold text-foreground">
                  Nenhuma publicacao criada.
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Transforme esta Estrategia Patrimonial em um Material Executivo
                  para compartilhar com o cliente.
                </p>
              </div>
              <Button
                onClick={() => setIsPublicationBuilderOpen(true)}
                type="button"
              >
                Preparar Material Executivo
              </Button>
            </div>
          </section>
        )
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_0.72fr]">
        <section className="executive-surface rounded-md p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Composicao obrigatoria
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-foreground">
                Cotas da estrategia
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Minimo de duas cotas por politica comercial Patrion Asset.
              </p>
            </div>
            <Button onClick={addQuota} type="button" variant="secondary">
              <Plus className="h-4 w-4" aria-hidden />
              Adicionar cota
            </Button>
          </div>

          <div className="mt-6 overflow-hidden rounded-md border bg-background/60">
            <div className="hidden grid-cols-[minmax(190px,1fr)_170px_repeat(3,minmax(120px,0.55fr))_40px] border-b bg-muted/30 px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground xl:grid">
              <span>Cota</span>
              <span>Crédito</span>
              <span>Meses 1 a 12</span>
              <span>Meses 13 a 24</span>
              <span>Meses 25 a 216</span>
              <span />
            </div>
            <div>
              {quotas.map((quota, index) => {
                const catalogItem = findReferenceCapitalCatalogItem(
                  quota.creditAmount,
                );

                return (
                  <article
                    className="grid gap-3 border-b px-3 py-3 last:border-b-0 xl:grid-cols-[minmax(190px,1fr)_170px_repeat(3,minmax(120px,0.55fr))_40px] xl:items-center"
                    key={quota.id}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical
                        aria-hidden
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                      />
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                          Cota {index + 1}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {catalogItem?.catalogCode ?? "-"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground xl:hidden">
                        Crédito
                      </span>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm font-medium text-foreground outline-none transition focus:border-primary"
                        onChange={(event) =>
                          updateQuotaCredit(
                            quota.id,
                            Number(event.target.value) as ReferenceCapitalCreditAmount,
                          )
                        }
                        value={quota.creditAmount}
                      >
                        {referenceCapitalCreditCatalog.map((item) => (
                          <option key={item.catalogCode} value={item.creditAmount}>
                            {currencyFormatter.format(item.creditAmount)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <QuotaInstallmentCell
                      label="Meses 1 a 12"
                      value={formatCents(
                        catalogItem?.installmentMonths1To12Cents ?? 0,
                      )}
                    />
                    <QuotaInstallmentCell
                      label="Meses 13 a 24"
                      value={formatCents(
                        catalogItem?.installmentMonths13To24Cents ?? 0,
                      )}
                    />
                    <QuotaInstallmentCell
                      label="Meses 25 a 216"
                      value={formatCents(
                        catalogItem?.installmentMonths25To216Cents ?? 0,
                      )}
                    />
                    <Button
                      aria-label={`Remover cota ${index + 1}`}
                      className="h-10 w-10 p-0 justify-self-start xl:justify-self-end"
                      disabled={quotas.length <= 2}
                      onClick={() => removeQuota(quota.id)}
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </article>
                );
              })}
            </div>
          </div>
          <div className="mt-4 rounded-md border border-dashed bg-background/50 px-4 py-3 text-center text-xs font-medium text-muted-foreground">
            Arraste as cotas para reordenar.
          </div>
        </section>

        <section className="executive-surface rounded-md p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Cenário de Contemplação
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Defina o mês utilizado como hipótese de planejamento para cada cota.
          </p>
          <div className="mt-5 grid gap-3">
            {quotas.map((quota, index) => {
              const catalogItem = referenceCapitalCreditCatalog.find(
                (item) => item.creditAmount === quota.creditAmount,
              );

              return (
                <ContemplationScenarioSlider
                  catalogCode={catalogItem?.catalogCode}
                  creditAmount={quota.creditAmount}
                  key={quota.id}
                  onChange={(month) =>
                    updateQuotaContemplationScenarioMonth(quota.id, month)
                  }
                  position={index + 1}
                  value={quota.contemplationScenarioMonth}
                />
              );
            })}
          </div>
          <label className="mt-4 flex items-start gap-3 rounded-md border bg-background/70 p-3 text-sm text-muted-foreground">
            <input
              checked={includeContemplationScenariosInMaterial}
              className="mt-1 accent-primary"
              onChange={(event) =>
                setIncludeContemplationScenariosInMaterial(event.target.checked)
              }
              type="checkbox"
            />
            <span>
              <span className="block font-medium text-foreground">
                Exibir no material os cenários de contemplação utilizados na simulação.
              </span>
              Os meses informados representam hipóteses de planejamento e não
              garantias de contemplação.
            </span>
          </label>
          {calculation.error ? (
            <p className="mt-4 rounded-md border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
              {calculation.error}
            </p>
          ) : null}
        </section>
      </section>

      {calculation.result ? (
        <ReferenceCapitalResultPanel result={calculation.result} />
      ) : null}
    </section>
  );
}

function QuotaInstallmentCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground xl:hidden">
        {label}
      </span>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ContemplationScenarioSlider({
  catalogCode,
  creditAmount,
  onChange,
  position,
  value,
}: {
  catalogCode?: string;
  creditAmount: ReferenceCapitalCreditAmount;
  onChange: (value: number) => void;
  position: number;
  value: number;
}) {
  const normalizedValue = normalizeScenarioMonth(value);

  return (
    <article className="rounded-md border bg-background/70 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Cota {position}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {currencyFormatter.format(creditAmount)}
          </p>
          {catalogCode ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Código comercial {catalogCode}
            </p>
          ) : null}
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
          <input
            className="h-11 w-16 rounded-md border bg-background px-3 text-center text-sm font-semibold text-foreground outline-none transition focus:border-primary"
            max={216}
            min={1}
            onChange={(event) => onChange(Number(event.target.value))}
            step={1}
            type="number"
            value={normalizedValue}
          />
          mês
        </label>
      </div>

      <div className="mt-5">
        <input
          aria-label={`Selecionar mês de contemplação da cota ${position}`}
          className="h-5 w-full cursor-pointer accent-primary"
          max={216}
          min={1}
          onChange={(event) => onChange(Number(event.target.value))}
          step={1}
          type="range"
          value={normalizedValue}
        />
        <div className="mt-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>1</span>
          <span>216</span>
        </div>
      </div>
    </article>
  );
}

function ReferenceCapitalResultPanel({
  result,
}: {
  result: ReferenceCapitalStrategyResult;
}) {
  return (
    <section className="grid gap-6">
      <section className="executive-surface rounded-md p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Resumo principal
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Credito total contratado"
            value={formatCents(result.consolidated.totalCreditCents)}
          />
          <MetricCard
            label="Quantidade de cotas"
            value={String(result.consolidated.quotaCount)}
          />
          <MetricCard
            label="Parcela - meses 1 a 12"
            value={formatCents(result.consolidated.installmentMonths1To12Cents)}
          />
          <MetricCard
            label="Parcela - meses 13 a 24"
            value={formatCents(result.consolidated.installmentMonths13To24Cents)}
          />
          <MetricCard
            label="Parcela-base - meses 25 a 216"
            value={formatCents(result.consolidated.installmentMonths25To216Cents)}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="executive-surface rounded-md p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Informacoes oficiais
          </p>
          <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
            <InlineInfo label="Plano" value="216 meses" />
            <InlineInfo label="Seguro prestamista" value="Incluso na parcela" />
            <InlineInfo label="Atualizacao" value="INCC anual" />
            <InlineInfo label="Primeiro reajuste" value="14a parcela" />
            <InlineInfo label="Contemplacoes previstas" value="4 modalidades conforme regulamento" />
          </div>
        </section>

        <section className="executive-surface rounded-md p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Cotas calculadas
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {result.quotas.map((quota) => (
              <article className="rounded-md border bg-background/70 p-4" key={quota.id}>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Cota {quota.position} - {quota.catalogCode}
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {currencyFormatter.format(quota.creditAmount)}
                </p>
                <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
                  <span>Meses 1 a 12: {formatCents(quota.installmentMonths1To12Cents)}</span>
                  <span>Meses 13 a 24: {formatCents(quota.installmentMonths13To24Cents)}</span>
                  <span>Meses 25 a 216: {formatCents(quota.installmentMonths25To216Cents)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="executive-surface rounded-md p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-xl font-semibold text-foreground">{value}</p>
    </article>
  );
}

function InlineInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border bg-background/70 p-3">
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function buildLeadSimulationPayload({
  leadProposalContext,
  result,
  title,
}: {
  leadProposalContext: CrmLeadProposalContext;
  result: ReferenceCapitalStrategyResult;
  title: string;
}) {
  const snapshot = buildReferenceCapitalStrategySnapshot({
    leadContext: {
      commercialContext: leadProposalContext.commercialContext ?? null,
      leadId: leadProposalContext.leadId,
      leadName: leadProposalContext.leadName,
      responsibleName: leadProposalContext.responsibleName ?? null,
    },
    result,
  });

  return {
    calculationSnapshot: snapshot,
    leadId: leadProposalContext.leadId,
    presentationSnapshot: snapshot,
    simulationType: "multi_cotas",
    source: "multi_cotas",
    summary: {
      contemplationMonth: null,
      monthlyPayment: centsToCurrencyAmount(
        result.consolidated.installmentMonths1To12Cents,
      ),
      postContemplationPayment: centsToCurrencyAmount(
        result.consolidated.installmentMonths25To216Cents,
      ),
      quotaCount: result.consolidated.quotaCount,
      totalCredit: centsToCurrencyAmount(result.consolidated.totalCreditCents),
      updatedCredit: centsToCurrencyAmount(result.consolidated.totalCreditCents),
    },
    technicalInput: snapshot,
    title,
  };
}

function formatCents(cents: number) {
  return currencyFormatter.format(centsToCurrencyAmount(cents));
}

function findReferenceCapitalCatalogItem(creditAmount: ReferenceCapitalCreditAmount) {
  return referenceCapitalCreditCatalog.find(
    (item) => item.creditAmount === creditAmount,
  );
}

function normalizeScenarioMonth(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(1, Math.trunc(value)), 216);
}
