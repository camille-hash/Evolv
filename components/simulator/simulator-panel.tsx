"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Copy,
  FileDown,
  FolderOpen,
  Minus,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  applyAdministratorToSimulationForm,
  buildSimulatorCommercialPresentation,
  calculateSimulatorScenarios,
  createEmptyCommercialData,
  createDefaultSavedAdministratorData,
  createSavedAdministratorData,
  deleteSimulation,
  duplicateSimulation,
  formatSimulationDate,
  isSimulatorExampleValid,
  listAdministrators,
  loadSavedSimulations,
  resetAdministratorsDefaults,
  saveSimulation,
  saveAdministrator,
  simulatorExampleInput,
  type BidType,
  type InsuranceOption,
  type SimulatorAdministrator,
  type SimulatorCommercialData,
  type SimulatorSavedFormState,
  type SimulatorSavedSimulation,
  type SimulatorInput,
  type SimulatorScenarioKey,
} from "@/modules/simulator";
import { generateSimulatorCommercialPdf } from "@/modules/reports";
import {
  buildIntelligenceSummary,
  type IntelligenceSummary,
} from "@/modules/intelligence";
import {
  buildWealthEvolution,
  buildWealthJourney,
  loadWealthEvolutionInput,
} from "@/modules/wealth";
import { cn } from "@/lib/utils";

type SimulatorFormState = SimulatorSavedFormState;

const scenarioOptions: Array<{
  key: SimulatorScenarioKey;
  label: string;
}> = [
  { key: "full", label: "Parcela cheia" },
  { key: "seventy", label: "70%" },
  { key: "half", label: "50%" },
];

const insuranceOptions: Array<{
  key: InsuranceOption;
  label: string;
}> = [
  { key: "with-insurance", label: "Com seguro" },
  { key: "without-insurance", label: "Sem seguro" },
];

const bidOptions: Array<{
  key: BidType;
  label: string;
}> = [
  { key: "none", label: "Sem lance" },
  { key: "embedded", label: "Lance embutido" },
  { key: "cash", label: "Lance em dinheiro" },
];

const initialFormState: SimulatorFormState = {
  credit: String(simulatorExampleInput.credit),
  administrativeFeePercent: percentFromRate(
    simulatorExampleInput.administrativeFeeRate,
  ),
  reserveFundPercent: percentFromRate(simulatorExampleInput.reserveFundRate),
  termMonths: String(simulatorExampleInput.termMonths),
  monthlyInsurancePercent: percentFromRate(
    simulatorExampleInput.monthlyInsuranceRate,
    4,
  ),
  inccPercent: "",
  cardSalePercent: "100",
  embeddedBidPercent: "25",
  cashBidPercent: "25",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function SimulatorPanel() {
  const [isTechnicalAreaOpen, setIsTechnicalAreaOpen] = useState(false);
  const [activeSimulationId, setActiveSimulationId] = useState<string | null>(
    null,
  );
  const [simulationName, setSimulationName] = useState("");
  const [commercialData, setCommercialData] =
    useState<SimulatorCommercialData>(() => createEmptyCommercialData());
  const [administrators, setAdministrators] = useState<
    SimulatorAdministrator[]
  >([]);
  const [selectedAdministratorId, setSelectedAdministratorId] =
    useState("custom");
  const [administratorDraft, setAdministratorDraft] =
    useState<SimulatorAdministrator | null>(null);
  const [isAdministratorEditorOpen, setIsAdministratorEditorOpen] =
    useState(false);
  const [savedSimulations, setSavedSimulations] = useState<
    SimulatorSavedSimulation[]
  >([]);
  const [selectedScenarioKey, setSelectedScenarioKey] =
    useState<SimulatorScenarioKey>("full");
  const [insuranceOption, setInsuranceOption] =
    useState<InsuranceOption>("with-insurance");
  const [bidType, setBidType] = useState<BidType>("none");
  const [contemplationMonth, setContemplationMonth] = useState(1);
  const [formState, setFormState] =
    useState<SimulatorFormState>(initialFormState);

  const simulatorInput = useMemo(
    () => toSimulatorInput(formState),
    [formState],
  );
  const calculation = useMemo(
    () => calculateSimulatorScenarios(simulatorInput),
    [simulatorInput],
  );
  const presentation = useMemo(
    () =>
      buildSimulatorCommercialPresentation({
        calculation,
        input: simulatorInput,
        selectedScenarioKey,
        insuranceOption,
        bidType,
        contemplationMonth,
      }),
    [
      calculation,
      bidType,
      contemplationMonth,
      insuranceOption,
      selectedScenarioKey,
      simulatorInput,
    ],
  );
  const activeSavedSimulation = useMemo(
    () =>
      savedSimulations.find(
        (simulation) => simulation.id === activeSimulationId,
      ),
    [activeSimulationId, savedSimulations],
  );
  const selectedAdministrator = useMemo(
    () =>
      administratorDraft ??
      administrators.find(
        (administrator) => administrator.id === selectedAdministratorId,
      ) ??
      null,
    [administratorDraft, administrators, selectedAdministratorId],
  );
  const intelligenceSummary = useMemo(
    () =>
      buildIntelligenceSummary({
        presentation,
        selectedScenarioKey,
        administratorInsuranceRequired: Boolean(
          selectedAdministrator?.insuranceRequired,
        ),
        bidType,
        embeddedBidRate: simulatorInput.embeddedBidRate ?? 0,
        cashBidRate: simulatorInput.cashBidRate ?? 0,
      }),
    [
      bidType,
      presentation,
      selectedAdministrator?.insuranceRequired,
      selectedScenarioKey,
      simulatorInput.cashBidRate,
      simulatorInput.embeddedBidRate,
    ],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSavedSimulations(loadSavedSimulations());
      const storedAdministrators = listAdministrators();
      const selectedAdministratorRecord =
        storedAdministrators.find(
          (administrator) => administrator.id === "custom",
        ) ?? storedAdministrators[0];

      setAdministrators(storedAdministrators);
      setAdministratorDraft(selectedAdministratorRecord ?? null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <section className="flex flex-col gap-7">
      <section className="rounded-md border bg-card text-card-foreground">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="border-b p-6 sm:p-8 xl:border-b-0 xl:border-r">
            <div className="flex flex-col gap-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    EVOLV
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-foreground">
                    Simulacao patrimonial
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Visao comercial da estrategia selecionada para apresentacao
                    ao cliente.
                  </p>
                </div>

                <div className="grid w-full gap-3 lg:w-[320px]">
                  <label className="grid gap-2 text-sm font-medium">
                    Nome da simulacao
                    <input
                      className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                      onChange={(event) =>
                        setSimulationName(event.target.value)
                      }
                      placeholder="Simulacao do cliente"
                      value={simulationName}
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                      onClick={handleSaveSimulation}
                      type="button"
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                      Salvar
                    </button>
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-medium transition hover:border-primary/40 hover:bg-accent"
                      onClick={() =>
                        generateSimulatorCommercialPdf({
                          presentation,
                          simulationName,
                          commercialData,
                          intelligenceSummary,
                          wealthJourney: getCurrentWealthJourney(),
                          simulationDate:
                            activeSavedSimulation?.updatedAt ??
                            new Date().toISOString(),
                        })
                      }
                      type="button"
                    >
                      <FileDown className="h-4 w-4" aria-hidden="true" />
                      Gerar PDF
                    </button>
                  </div>
                  {activeSimulationId ? (
                    <p className="text-xs text-muted-foreground">
                      Editando simulacao salva.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Credito contratado
                  </p>
                  <p className="mt-2 text-4xl font-semibold tracking-normal text-foreground">
                    {currencyFormatter.format(presentation.contractedCredit)}
                  </p>
                </div>
                <div className="rounded-md border bg-background p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Contemplacao
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    Mes {presentation.contemplationMonth}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
              {scenarioOptions.map((option) => (
                <button
                  className={cn(
                    "h-11 rounded-md border px-4 text-sm font-medium transition",
                    selectedScenarioKey === option.key
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "bg-background text-foreground hover:border-primary/40 hover:bg-accent",
                  )}
                  key={option.key}
                  onClick={() => setSelectedScenarioKey(option.key)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

              <div className="grid gap-3 sm:grid-cols-2">
              {insuranceOptions.map((option) => (
                <button
                  className={cn(
                    "h-11 rounded-md border px-4 text-sm font-medium transition",
                    insuranceOption === option.key
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "bg-background text-foreground hover:border-primary/40 hover:bg-accent",
                    isInsuranceOptionDisabled(option.key) &&
                      "cursor-not-allowed opacity-50 hover:border-border hover:bg-background",
                  )}
                  disabled={isInsuranceOptionDisabled(option.key)}
                  key={option.key}
                  onClick={() => handleSelectInsuranceOption(option.key)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

              <div className="grid gap-3 lg:grid-cols-3">
              {bidOptions.map((option) => (
                <button
                  className={cn(
                    "h-11 rounded-md border px-4 text-sm font-medium transition",
                    bidType === option.key
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "bg-background text-foreground hover:border-primary/40 hover:bg-accent",
                  )}
                  key={option.key}
                  onClick={() => setBidType(option.key)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
              </div>
            </div>
          </div>

          <div className="bg-muted/40 p-6 sm:p-8">
            <p className="text-sm font-medium text-muted-foreground">
              Ajuste de contemplacao
            </p>
            <div className="mt-5 flex items-center justify-between gap-3">
              <IconButton
                label="Diminuir mes"
                onClick={() => updateContemplationMonth(contemplationMonth - 1)}
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </IconButton>
              <div className="min-w-28 text-center">
                <div className="text-4xl font-semibold text-foreground">
                  {presentation.contemplationMonth}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  de {simulatorInput.termMonths} meses
                </div>
              </div>
              <IconButton
                label="Aumentar mes"
                onClick={() => updateContemplationMonth(contemplationMonth + 1)}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </IconButton>
            </div>
            <input
              className="mt-7 w-full accent-primary"
              max={simulatorInput.termMonths}
              min={1}
              onChange={(event) =>
                updateContemplationMonth(Number(event.target.value))
              }
              type="range"
              value={presentation.contemplationMonth}
            />
            <div className="mt-8 grid gap-3">
              <SummaryLine
                label="Cenario"
                value={presentation.selectedScenarioName}
              />
              <SummaryLine label="Seguro" value={presentation.insuranceLabel} />
              <SummaryLine label="Lance" value={presentation.bidLabel} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-md border bg-card p-5 text-card-foreground sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Administradora</h2>
          <p className="text-sm text-muted-foreground">
            Selecione uma administradora para aplicar parametros padrao. Os
            campos tecnicos continuam editaveis manualmente.
          </p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="grid gap-2 text-sm font-medium">
            Administradora selecionada
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              onChange={(event) =>
                handleSelectAdministrator(event.target.value)
              }
              value={selectedAdministratorId}
            >
              {administrators.map((administrator) => (
                <option key={administrator.id} value={administrator.id}>
                  {administrator.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-2 sm:grid-cols-2 lg:w-[320px]">
            <button
              className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition hover:border-primary/40 hover:bg-accent"
              onClick={() =>
                setIsAdministratorEditorOpen((current) => !current)
              }
              type="button"
            >
              Editar parametros
            </button>
            <button
              className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition hover:border-primary/40 hover:bg-accent"
              onClick={handleResetAdministrators}
              type="button"
            >
              Resetar defaults
            </button>
          </div>
        </div>

        {selectedAdministrator?.insuranceRequired ? (
          <p className="mt-3 text-sm font-medium text-primary">
            Seguro obrigatorio nesta administradora.
          </p>
        ) : null}

        {isAdministratorEditorOpen && administratorDraft ? (
          <div className="mt-5 grid gap-4 border-t pt-5 md:grid-cols-2 xl:grid-cols-6">
            <AdministratorInputField
              label="Nome"
              value={administratorDraft.name}
              onChange={(name) => updateAdministratorDraft({ name })}
            />
            <AdministratorInputField
              label="Taxa administrativa (%)"
              value={administratorDraft.parameters.administrativeFeePercent}
              onChange={(administrativeFeePercent) =>
                updateAdministratorDraftParameter({
                  administrativeFeePercent,
                })
              }
            />
            <AdministratorInputField
              label="Fundo de reserva (%)"
              value={administratorDraft.parameters.reserveFundPercent}
              onChange={(reserveFundPercent) =>
                updateAdministratorDraftParameter({ reserveFundPercent })
              }
            />
            <AdministratorInputField
              label="Prazo padrao"
              value={administratorDraft.parameters.termMonths}
              onChange={(termMonths) =>
                updateAdministratorDraftParameter({ termMonths })
              }
            />
            <AdministratorInputField
              label="Seguro padrao (%)"
              value={administratorDraft.parameters.monthlyInsurancePercent}
              onChange={(monthlyInsurancePercent) =>
                updateAdministratorDraftParameter({
                  monthlyInsurancePercent,
                })
              }
            />
            <div className="grid gap-2 text-sm font-medium">
              Seguro obrigatorio
              <button
                className={cn(
                  "h-10 rounded-md border px-3 text-sm font-medium transition",
                  administratorDraft.insuranceRequired
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:border-primary/40 hover:bg-accent",
                )}
                onClick={() =>
                  updateAdministratorDraft({
                    insuranceRequired: !administratorDraft.insuranceRequired,
                  })
                }
                type="button"
              >
                {administratorDraft.insuranceRequired ? "Sim" : "Nao"}
              </button>
            </div>
            <div className="flex items-end md:col-span-2 xl:col-span-6">
              <button
                className="inline-flex h-10 items-center justify-center rounded-md border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                onClick={handleSaveAdministratorDraft}
                type="button"
              >
                Salvar e aplicar administradora
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-md border bg-card p-5 text-card-foreground sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Dados comerciais</h2>
          <p className="text-sm text-muted-foreground">
            Informacoes opcionais para salvar junto com a simulacao e compor o
            PDF comercial.
          </p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <CommercialDataField
            label="Cliente"
            value={commercialData.clientName}
            onChange={(clientName) => updateCommercialData({ clientName })}
          />
          <CommercialDataField
            label="Telefone"
            value={commercialData.clientPhone}
            onChange={(clientPhone) => updateCommercialData({ clientPhone })}
          />
          <CommercialDataField
            label="E-mail"
            value={commercialData.clientEmail}
            onChange={(clientEmail) => updateCommercialData({ clientEmail })}
          />
          <CommercialDataField
            label="Consultor"
            value={commercialData.consultantName}
            onChange={(consultantName) =>
              updateCommercialData({ consultantName })
            }
          />
          <CommercialDataTextArea
            label="Observacoes"
            value={commercialData.commercialNotes}
            onChange={(commercialNotes) =>
              updateCommercialData({ commercialNotes })
            }
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <CommercialMetric
          label="Parcela antes"
          value={currencyFormatter.format(
            presentation.installmentBeforeContemplation,
          )}
          featured
        />
        <CommercialMetric
          label="Parcela pos"
          value={currencyFormatter.format(
            presentation.installmentAfterContemplation,
          )}
          featured
        />
        <CommercialMetric
          label="Valor de venda"
          value={currencyFormatter.format(presentation.estimatedCardSaleValue)}
          featured
        />
        <CommercialMetric
          label="Alavancagem"
          value={`${presentation.leverageMultiple.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}x`}
          featured
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CommercialMetric
          label="Credito atualizado pelo INCC"
          value={currencyFormatter.format(presentation.updatedCredit)}
        />
        <CommercialMetric
          label="Credito liquido disponivel"
          value={currencyFormatter.format(presentation.liquidCredit)}
        />
        <CommercialMetric
          label="Cenario selecionado"
          value={presentation.selectedScenarioName}
        />
        <CommercialMetric
          label="Opcao de seguro"
          value={presentation.insuranceLabel}
        />
        <CommercialMetric
          label="Tipo de lance"
          value={presentation.bidLabel}
        />
        <CommercialMetric
          label="Valor do lance"
          value={currencyFormatter.format(presentation.bidAmount)}
        />
      </section>

      <IntelligenceSummaryPanel summary={intelligenceSummary} />

      {presentation.installmentAfterContemplationFallback ? (
        <div className="rounded-md border bg-accent px-5 py-3 text-sm text-accent-foreground">
          A contemplacao foi selecionada no ultimo mes do prazo. A parcela
          cheia foi usada como referencia pos-contemplacao.
        </div>
      ) : null}

      <section className="rounded-md border bg-card p-6 text-card-foreground sm:p-7">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Total estimado investido ate a contemplacao
            </p>
            <p className="mt-2 text-4xl font-semibold text-primary">
              {currencyFormatter.format(
                presentation.totalInvestedUntilContemplation,
              )}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {presentation.contemplationMonth} parcelas no cenario{" "}
            {presentation.selectedScenarioName.toLowerCase()}.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CommercialMetric
          label="Investimento real"
          value={currencyFormatter.format(presentation.realInvestment)}
          featured
        />
        <CommercialMetric
          label="Lucro estimado"
          value={currencyFormatter.format(presentation.estimatedCardSaleProfit)}
          featured
        />
        <CommercialMetric
          label="Percentual de ganho"
          value={percentFormatter.format(presentation.estimatedCardSaleGainRate)}
          featured
        />
      </section>

      <section className="rounded-md border bg-card p-5 text-card-foreground sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Simulacoes salvas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Historico local deste navegador.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {savedSimulations.length} registros
          </p>
        </div>

        {savedSimulations.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {savedSimulations.map((simulation) => (
              <article
                className={cn(
                  "grid gap-4 rounded-md border bg-background p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-center",
                  activeSimulationId === simulation.id &&
                    "border-primary/50 bg-primary/[0.03]",
                )}
                key={simulation.id}
              >
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">
                    {simulation.name}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Atualizada em {formatSimulationDate(simulation.updatedAt)}
                  </p>
                </div>

                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <SavedValue
                    label="Credito"
                    value={currencyFormatter.format(
                      simulation.results.contractedCredit,
                    )}
                  />
                  <SavedValue
                    label="Cenario"
                    value={simulation.results.selectedScenarioName}
                  />
                  <SavedValue
                    label="Venda"
                    value={currencyFormatter.format(
                      simulation.results.estimatedCardSaleValue,
                    )}
                  />
                  <SavedValue
                    label="Lucro"
                    value={currencyFormatter.format(
                      simulation.results.estimatedCardSaleProfit,
                    )}
                  />
                </div>

                <div className="flex items-center gap-2 lg:justify-end">
                  <ActionButton
                    label="Abrir"
                    onClick={() => handleOpenSimulation(simulation)}
                  >
                    <FolderOpen className="h-4 w-4" aria-hidden="true" />
                  </ActionButton>
                  <ActionButton
                    label="Duplicar"
                    onClick={() => handleDuplicateSimulation(simulation.id)}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </ActionButton>
                  <ActionButton
                    label="Excluir"
                    onClick={() => handleDeleteSimulation(simulation.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </ActionButton>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-md border border-dashed bg-background p-5 text-sm text-muted-foreground">
            Nenhuma simulacao salva neste navegador.
          </div>
        )}
      </section>

      <div className="rounded-md border bg-muted/30 text-card-foreground">
        <button
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
          onClick={() => setIsTechnicalAreaOpen((current) => !current)}
          type="button"
        >
          <div>
            <h2 className="text-sm font-semibold">Area tecnica</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Parametros internos da simulacao.
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 transition-transform",
              isTechnicalAreaOpen ? "rotate-180" : "rotate-0",
            )}
            aria-hidden="true"
          />
        </button>

        {isTechnicalAreaOpen ? (
          <div className="grid gap-4 border-t p-5 sm:grid-cols-2 lg:grid-cols-4">
            <SimulatorInputField
              label="Credito"
              value={formState.credit}
              onChange={(credit) => updateFormState({ credit })}
            />
            <SimulatorInputField
              label="Taxa administrativa (%)"
              value={formState.administrativeFeePercent}
              onChange={(administrativeFeePercent) =>
                updateFormState({ administrativeFeePercent })
              }
            />
            <SimulatorInputField
              label="Fundo de reserva (%)"
              value={formState.reserveFundPercent}
              onChange={(reserveFundPercent) =>
                updateFormState({ reserveFundPercent })
              }
            />
            <SimulatorInputField
              label="Prazo em meses"
              value={formState.termMonths}
              onChange={(termMonths) => updateFormState({ termMonths })}
            />
            <SimulatorInputField
              label="Seguro mensal (%)"
              value={formState.monthlyInsurancePercent}
              onChange={(monthlyInsurancePercent) =>
                updateFormState({ monthlyInsurancePercent })
              }
            />
            <SimulatorInputField
              label="INCC (%)"
              value={formState.inccPercent}
              onChange={(inccPercent) => updateFormState({ inccPercent })}
            />
            <SimulatorInputField
              label="Venda da carta (%)"
              value={formState.cardSalePercent}
              onChange={(cardSalePercent) =>
                updateFormState({ cardSalePercent })
              }
            />
            <SimulatorInputField
              label="Lance embutido (%)"
              value={formState.embeddedBidPercent}
              onChange={(embeddedBidPercent) =>
                updateFormState({ embeddedBidPercent })
              }
            />
            <SimulatorInputField
              label="Lance em dinheiro (%)"
              value={formState.cashBidPercent}
              onChange={(cashBidPercent) =>
                updateFormState({ cashBidPercent })
              }
            />
            <div className="rounded-md border bg-background p-3 text-sm">
              <p className="font-medium">Validacao da especificacao</p>
              <p
                className={cn(
                  "mt-1 font-semibold",
                  isSimulatorExampleValid()
                    ? "text-emerald-700"
                    : "text-destructive",
                )}
              >
                {isSimulatorExampleValid()
                  ? "Resultados conferidos"
                  : "Resultados divergentes"}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );

  function updateFormState(partialState: Partial<SimulatorFormState>) {
    setFormState((current) => ({ ...current, ...partialState }));
  }

  function updateCommercialData(partialState: Partial<SimulatorCommercialData>) {
    setCommercialData((current) => ({ ...current, ...partialState }));
  }

  function updateAdministratorDraft(
    partialState: Partial<SimulatorAdministrator>,
  ) {
    setAdministratorDraft((current) =>
      current ? { ...current, ...partialState } : current,
    );
  }

  function updateAdministratorDraftParameter(
    partialParameters: Partial<SimulatorAdministrator["parameters"]>,
  ) {
    setAdministratorDraft((current) =>
      current
        ? {
            ...current,
            parameters: {
              ...current.parameters,
              ...partialParameters,
            },
          }
        : current,
    );
  }

  function updateContemplationMonth(nextMonth: number) {
    setContemplationMonth(
      Math.min(Math.max(1, Math.trunc(nextMonth)), simulatorInput.termMonths),
    );
  }

  function handleSaveSimulation() {
    const administratorData = selectedAdministrator
      ? createSavedAdministratorData(selectedAdministrator)
      : createDefaultSavedAdministratorData();
    const savedSimulation = saveSimulation({
      id: activeSimulationId,
      draft: {
        name: simulationName,
        formState,
        commercialData,
        administratorData,
        selectedScenarioKey,
        insuranceOption,
        contemplationMonth: presentation.contemplationMonth,
        bidType,
      },
      presentation,
    });

    setActiveSimulationId(savedSimulation.id);
    setSimulationName(savedSimulation.name);
    setCommercialData(savedSimulation.commercialData);
    setSelectedAdministratorId(
      savedSimulation.administratorData.selectedAdministratorId,
    );
    setAdministratorDraft(toAdministratorFromSavedData(savedSimulation));
    setSavedSimulations(loadSavedSimulations());
  }

  function handleOpenSimulation(simulation: SimulatorSavedSimulation) {
    setActiveSimulationId(simulation.id);
    setSimulationName(simulation.name);
    setCommercialData(simulation.commercialData);
    setSelectedAdministratorId(
      simulation.administratorData.selectedAdministratorId,
    );
    setAdministratorDraft(toAdministratorFromSavedData(simulation));
    setFormState(simulation.formState);
    setSelectedScenarioKey(simulation.selectedScenarioKey);
    setInsuranceOption(
      simulation.administratorData.insuranceRequired
        ? "with-insurance"
        : simulation.insuranceOption,
    );
    setContemplationMonth(simulation.contemplationMonth);
    setBidType(simulation.bidType);
  }

  function handleSelectAdministrator(administratorId: string) {
    const administrator = administrators.find(
      (currentAdministrator) => currentAdministrator.id === administratorId,
    );

    if (!administrator) {
      return;
    }

    setSelectedAdministratorId(administrator.id);
    setAdministratorDraft(administrator);
    setFormState((currentFormState) =>
      applyAdministratorToSimulationForm(currentFormState, administrator),
    );

    if (administrator.insuranceRequired) {
      setInsuranceOption("with-insurance");
    }
  }

  function handleSaveAdministratorDraft() {
    if (!administratorDraft) {
      return;
    }

    const nextAdministrators = saveAdministrator(administratorDraft);

    setAdministrators(nextAdministrators);
    setSelectedAdministratorId(administratorDraft.id);
    setFormState((currentFormState) =>
      applyAdministratorToSimulationForm(currentFormState, administratorDraft),
    );

    if (administratorDraft.insuranceRequired) {
      setInsuranceOption("with-insurance");
    }
  }

  function handleResetAdministrators() {
    const defaultAdministrators = resetAdministratorsDefaults();
    const customAdministrator =
      defaultAdministrators.find(
        (administrator) => administrator.id === "custom",
      ) ?? defaultAdministrators[0];

    setAdministrators(defaultAdministrators);
    setSelectedAdministratorId(customAdministrator.id);
    setAdministratorDraft(customAdministrator);
    setFormState((currentFormState) =>
      applyAdministratorToSimulationForm(currentFormState, customAdministrator),
    );
    setInsuranceOption("with-insurance");
  }

  function handleSelectInsuranceOption(option: InsuranceOption) {
    if (isInsuranceOptionDisabled(option)) {
      return;
    }

    setInsuranceOption(option);
  }

  function isInsuranceOptionDisabled(option: InsuranceOption) {
    return (
      option === "without-insurance" &&
      Boolean(selectedAdministrator?.insuranceRequired)
    );
  }

  function getCurrentWealthJourney() {
    const wealthInput = loadWealthEvolutionInput();
    const evolution = buildWealthEvolution(wealthInput);

    return buildWealthJourney({ evolution, input: wealthInput });
  }

  function handleDuplicateSimulation(id: string) {
    const duplicatedSimulation = duplicateSimulation(id);

    if (!duplicatedSimulation) {
      return;
    }

    setSavedSimulations(loadSavedSimulations());
  }

  function handleDeleteSimulation(id: string) {
    const simulations = deleteSimulation(id);

    setSavedSimulations(simulations);

    if (activeSimulationId === id) {
      setActiveSimulationId(null);
    }
  }
}

function IntelligenceSummaryPanel({
  summary,
}: {
  summary: IntelligenceSummary;
}) {
  return (
    <section className="rounded-md border bg-card p-6 text-card-foreground sm:p-7">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Intelligence
        </p>
        <h2 className="text-xl font-semibold text-foreground">
          Analise EVOLV
        </h2>
      </div>

      <div className="mt-5 rounded-md border bg-primary/[0.03] p-5">
        <p className="text-sm font-medium text-muted-foreground">
          Resumo Executivo
        </p>
        <p className="mt-2 text-base leading-7 text-foreground">
          {summary.executiveSummary}
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <IntelligenceList title="Principais Insights" items={summary.insights} />
        <IntelligenceList
          title="Pontos de Atencao"
          items={summary.attentionPoints}
        />
        <IntelligenceList title="Oportunidades" items={summary.opportunities} />
      </div>
    </section>
  );
}

function IntelligenceList({
  items,
  title,
}: {
  items: string[];
  title: string;
}) {
  return (
    <article className="rounded-md border bg-background p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <li className="flex gap-2" key={item}>
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function toAdministratorFromSavedData(
  simulation: SimulatorSavedSimulation,
): SimulatorAdministrator {
  return {
    id: simulation.administratorData.selectedAdministratorId,
    name: simulation.administratorData.selectedAdministratorName,
    kind: simulation.administratorData.administratorKind,
    parameters: simulation.administratorData.appliedParameters,
    insuranceRequired: simulation.administratorData.insuranceRequired,
  };
}

function AdministratorInputField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function CommercialDataField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function CommercialDataTextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium md:col-span-2 xl:col-span-4">
      {label}
      <textarea
        className="min-h-24 resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function CommercialMetric({
  label,
  value,
  featured = false,
}: {
  label: string;
  value: string;
  featured?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-md border bg-card p-5 text-card-foreground",
        featured && "border-primary/20 bg-primary/[0.03]",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-3 font-semibold tracking-normal",
          featured ? "text-2xl text-primary" : "text-xl text-foreground",
        )}
      >
        {value}
      </p>
    </article>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-3 text-sm last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function SavedValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-medium text-foreground">{value}</p>
    </div>
  );
}

function ActionButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-md border bg-card transition hover:border-primary/40 hover:bg-accent"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-md border bg-background transition hover:border-primary/40 hover:bg-accent"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function SimulatorInputField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
        inputMode="decimal"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function toSimulatorInput(formState: SimulatorFormState): SimulatorInput {
  return {
    credit: parsePositiveNumber(formState.credit),
    administrativeFeeRate: percentToRate(
      formState.administrativeFeePercent,
    ),
    reserveFundRate: percentToRate(formState.reserveFundPercent),
    termMonths: Math.max(
      1,
      Math.trunc(parsePositiveNumber(formState.termMonths)),
    ),
    monthlyInsuranceRate: percentToRate(formState.monthlyInsurancePercent),
    inccRate: percentToRate(formState.inccPercent),
    cardSaleRate: percentToRate(formState.cardSalePercent),
    embeddedBidRate: percentToRate(formState.embeddedBidPercent),
    cashBidRate: percentToRate(formState.cashBidPercent),
  };
}

function parsePositiveNumber(value: string) {
  const normalized = Number(value.replace(",", "."));

  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0.01;
}

function percentToRate(value: string) {
  const normalized = Number(value.replace(",", "."));

  return Number.isFinite(normalized) && normalized >= 0 ? normalized / 100 : 0;
}

function percentFromRate(rate: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(rate * 100);
}
