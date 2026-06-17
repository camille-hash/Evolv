"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, ChevronDown, ChevronUp, Phone, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CrmStructuredNotesList } from "@/components/crm/crm-structured-notes";
import {
  crmPipelineLabels,
  crmPipelines,
  crmStageLabels,
  buildWhatsappUrl,
  buildTemporaryStructuredNotesFromLead,
  getDefaultStageForPipeline,
  getStagesForPipeline,
  isStageInPipeline,
  resolveCrmLeadCommercialSignal,
  resolveCrmLeadOperationalPriority,
  type CrmCommercialSignal,
  type CrmLead,
  type CrmLeadInput,
  type CrmLeadNote,
  type CrmOperationalPriority,
  type CrmPipeline,
  type CrmStage,
  type CrmStructuredNote,
} from "@/modules/crm";
import type { GeneratedProposalRecord } from "@/modules/proposal/proposal-history";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "percent",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const fieldInputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";

type CrmLeadDetailProps = {
  draft: CrmLeadInput;
  feedbackMessage?: string | null;
  lead: CrmLead;
  onCancel: () => void;
  onClearFeedbackMessage?: () => void;
  onDraftChange: (draft: CrmLeadInput) => void;
  onGenerateSimulation?: (lead: CrmLead) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  proposals: GeneratedProposalRecord[];
};

export function CrmLeadDetail({
  draft,
  feedbackMessage,
  lead,
  onCancel,
  onClearFeedbackMessage,
  onDraftChange,
  onGenerateSimulation,
  onSave,
  proposals,
}: CrmLeadDetailProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSuccessMessage, setNoteSuccessMessage] = useState<string | null>(null);
  const [notesState, setNotesState] = useState<{
    leadId: string;
    notes: CrmLeadNote[];
  } | null>(null);
  const leadDisplayName = useMemo(() => getLeadDisplayName(lead), [lead]);
  const whatsappUrl = buildWhatsappUrl(lead.telefone);
  const structuredNotes = buildTemporaryStructuredNotesFromLead(lead);
  const persistedNotes =
    notesState?.leadId === lead.id ? notesState.notes : [];
  const persistedStructuredNotes = persistedNotes.map(mapLeadNoteToStructuredNote);
  const visibleHistoryNotes = persistedStructuredNotes.length
    ? persistedStructuredNotes
    : structuredNotes.history.length
      ? structuredNotes.history
      : structuredNotes.latestMovements;
  const latestMovement =
    persistedStructuredNotes[0] ?? structuredNotes.latestMovements[0];
  const commercialSignal = resolveCrmLeadCommercialSignal(lead);
  const operationalPriority = resolveCrmLeadOperationalPriority(lead);
  const leadObjective =
    lead.produtoInteresse ||
    lead.tituloOportunidade ||
    currencyFormatter.format(lead.valorPretendido);

  useEffect(() => {
    let isActive = true;

    async function loadNotes() {
      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        return;
      }

      const response = await fetch(`/api/crm/lead-notes?leadId=${lead.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).catch(() => null);

      if (!response?.ok) {
        return;
      }

      const payload = (await response.json().catch(() => null)) as {
        notes?: CrmLeadNote[];
      } | null;

      if (isActive && Array.isArray(payload?.notes)) {
        setNotesState({
          leadId: lead.id,
          notes: payload.notes,
        });
      }
    }

    void loadNotes();

    return () => {
      isActive = false;
    };
  }, [lead.id]);

  useEffect(() => {
    if (!noteSuccessMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNoteSuccessMessage(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [noteSuccessMessage]);

  useEffect(() => {
    if (!feedbackMessage || !onClearFeedbackMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onClearFeedbackMessage();
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [feedbackMessage, onClearFeedbackMessage]);

  function updateDraft(patch: Partial<CrmLeadInput>) {
    onDraftChange({
      ...draft,
      ...patch,
    });
  }

  function handlePipelineChange(pipeline: CrmPipeline) {
    updateDraft({
      pipeline,
      etapa: isStageInPipeline(pipeline, draft.etapa)
        ? draft.etapa
        : getDefaultStageForPipeline(pipeline),
    });
  }

  function handleOpenWhatsapp() {
    if (!whatsappUrl) {
      return;
    }

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  function handleOpenNoteModal() {
    setNoteError(null);
    setNoteSuccessMessage(null);
    setIsNoteModalOpen(true);
  }

  function handleCloseNoteModal() {
    if (isSavingNote) {
      return;
    }

    setIsNoteModalOpen(false);
    setNoteError(null);
  }

  async function handleSaveNote() {
    const content = noteContent.trim();

    if (!content) {
      setNoteError("Escreva uma observacao interna antes de salvar.");
      return;
    }

    setIsSavingNote(true);
    setNoteError(null);

    try {
      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        throw new Error("Sessao indisponivel.");
      }

      const response = await fetch("/api/crm/lead-notes", {
        body: JSON.stringify({
          content,
          leadId: lead.id,
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        note?: CrmLeadNote;
      } | null;

      if (!response.ok || !payload?.note) {
        throw new Error(payload?.error ?? "Nao foi possivel salvar a nota.");
      }

      setNotesState({
        leadId: lead.id,
        notes: [payload.note, ...persistedNotes],
      });
      setNoteContent("");
      setIsHistoryOpen(true);
      setIsNoteModalOpen(false);
      setNoteSuccessMessage("Nota adicionada com sucesso.");
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar a nota.",
      );
    } finally {
      setIsSavingNote(false);
    }
  }

  return (
    <section className="grid gap-4">
      <section className="executive-surface rounded-md p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Dossie executivo
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              {leadDisplayName}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full border bg-background px-2 py-1 text-muted-foreground">
                {crmPipelineLabels[lead.pipeline]}
              </span>
              <span className="rounded-full border bg-background px-2 py-1 text-muted-foreground">
                {crmStageLabels[lead.etapa]}
              </span>
              <span className="rounded-full border bg-background px-2 py-1 text-muted-foreground">
                {currencyFormatter.format(lead.valorPretendido)}
              </span>
              <CommercialSignalBadge
                signal={commercialSignal.signal}
                summary={commercialSignal.summary}
              >
                Sinal comercial: {commercialSignal.label}
              </CommercialSignalBadge>
              <OperationalPriorityBadge
                priority={operationalPriority.priority}
                summary={operationalPriority.summary}
              >
                Prioridade operacional: {operationalPriority.label}
              </OperationalPriorityBadge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {commercialSignal.summary} - {operationalPriority.summary}
            </p>
          </div>

          <Button onClick={onCancel} type="button" variant="ghost">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar ao pipeline
          </Button>
        </div>
      </section>

      <form className="grid gap-4" onSubmit={onSave}>
        {feedbackMessage ? (
          <SuccessFeedback message={feedbackMessage} />
        ) : null}

        {noteSuccessMessage ? (
          <SuccessFeedback message={noteSuccessMessage} />
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <ExecutiveDossierCard
            description="Dados estaveis para entender rapidamente quem esta do outro lado."
            eyebrow="Quem e"
            title={leadDisplayName}
          >
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <LeadInfo label="Telefone" value={lead.telefone || "-"} />
              <LeadInfo label="E-mail" value={lead.email || "-"} />
              <LeadInfo label="Origem" value={lead.origem || "-"} />
              <LeadInfo label="Cidade / Pais" value={lead.pais || "-"} />
              <LeadInfo label="Objetivo comercial" value={leadObjective} />
              <LeadInfo
                label="Credito desejado"
                value={currencyFormatter.format(lead.valorPretendido)}
              />
            </div>
          </ExecutiveDossierCard>

          <ExecutiveDossierCard
            description="Primeira leitura do relacionamento, derivada temporariamente das informacoes atuais."
            eyebrow="Relacionamento"
            title="Contexto Estrategico"
          >
            <CrmStructuredNotesList
              emptyText="Nenhum contexto estrategico registrado ainda."
              notes={structuredNotes.strategicContext}
            />
          </ExecutiveDossierCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_0.95fr_1.1fr]">
          <ExecutiveDossierCard
            description="Um unico sinal recente para leitura rapida."
            eyebrow="Agora"
            title="Ultima Movimentacao"
          >
            {latestMovement ? (
              <div className="rounded-md border bg-background/70 p-4 text-sm">
                <p className="leading-6 text-foreground">
                  {latestMovement.content}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {dateFormatter.format(new Date(latestMovement.timestamp))}
                </p>
              </div>
            ) : (
              <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
                Nenhuma movimentacao recente disponivel.
              </p>
            )}
          </ExecutiveDossierCard>

          <ExecutiveDossierCard
            description="Espaco reservado para evolucao futura de tarefas comerciais."
            eyebrow="Acao"
            title="Proxima Acao"
          >
            <div className="rounded-md border bg-background/70 p-4 text-sm">
              <div className="mb-3 flex flex-wrap gap-2">
                <OperationalPriorityBadge
                  priority={operationalPriority.priority}
                  summary={operationalPriority.summary}
                >
                  {operationalPriority.label}
                </OperationalPriorityBadge>
              </div>
              <p className="font-medium text-foreground">
                {lead.proximaAcao || "Nenhuma acao programada."}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Use este espaco para orientar o proximo contato quando houver uma
                acao definida.
              </p>
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <LeadInfo label="Responsavel" value={lead.consultor || "-"} />
              <LeadInfo
                label="Valor desejado"
                value={currencyFormatter.format(lead.valorPretendido)}
              />
            </div>
          </ExecutiveDossierCard>

          <ExecutiveDossierCard
            description="Acoes comerciais existentes, sem mudanca de comportamento."
            eyebrow="Atalhos"
            title="Acoes Comerciais"
          >
            <div className="mt-4 grid gap-2">
              <Button
                disabled={!onGenerateSimulation}
                onClick={() => onGenerateSimulation?.(lead)}
                type="button"
                variant="secondary"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Gerar simulacao
              </Button>
              <Button disabled type="button" variant="secondary">
                <Plus className="h-4 w-4" aria-hidden />
                Gerar proposta
              </Button>
              <Button disabled type="button" variant="ghost">
                <Phone className="h-4 w-4" aria-hidden />
                Ligar
              </Button>
              <Button
                disabled={!whatsappUrl}
                onClick={handleOpenWhatsapp}
                type="button"
                variant="ghost"
              >
                <Send className="h-4 w-4" aria-hidden />
                WhatsApp
              </Button>
            </div>
          </ExecutiveDossierCard>
        </div>

        <section className="executive-surface rounded-md p-5 text-card-foreground">
          <button
            aria-expanded={isHistoryOpen}
            className="flex w-full items-start justify-between gap-4 text-left"
            onClick={() => setIsHistoryOpen((current) => !current)}
            type="button"
          >
            <span>
              <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Historico
              </span>
              <span className="mt-1 block text-sm font-semibold text-foreground">
                Historico Completo
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                Secao recolhivel para consultar o contexto completo quando
                necessario.
              </span>
            </span>
            {isHistoryOpen ? (
              <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleOpenNoteModal} type="button" variant="secondary">
              <Plus className="h-4 w-4" aria-hidden />
              Adicionar Nota
            </Button>
          </div>
          {isHistoryOpen ? (
            <div className="mt-4">
              <CrmStructuredNotesList
                emptyText="Historico estruturado sera conectado em sprint futura. Nesta versao, os dados existentes permanecem preservados nos campos atuais."
                notes={visibleHistoryNotes}
              />
            </div>
          ) : null}
        </section>

        <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <ExecutiveDossierCard
            description="Ajustes operacionais do lead, preservando os campos existentes."
            eyebrow="Edicao"
            title="Dados Comerciais"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome">
                <input
                  className={fieldInputClass}
                  onChange={(event) => updateDraft({ nome: event.target.value })}
                  placeholder="Nome do lead"
                  required
                  value={draft.nome}
                />
              </Field>

              <Field label="Telefone">
                <input
                  className={fieldInputClass}
                  onChange={(event) =>
                    updateDraft({ telefone: event.target.value })
                  }
                  placeholder="(00) 00000-0000"
                  value={draft.telefone}
                />
              </Field>

              <Field label="E-mail">
                <input
                  className={fieldInputClass}
                  onChange={(event) => updateDraft({ email: event.target.value })}
                  placeholder="cliente@email.com"
                  type="email"
                  value={draft.email}
                />
              </Field>

              <Field label="Origem">
                <input
                  className={fieldInputClass}
                  onChange={(event) => updateDraft({ origem: event.target.value })}
                  placeholder="Indicacao, trafego, evento..."
                  value={draft.origem}
                />
              </Field>

              <Field label="Consultor">
                <input
                  className={fieldInputClass}
                  onChange={(event) =>
                    updateDraft({ consultor: event.target.value })
                  }
                  placeholder="Responsavel"
                  value={draft.consultor}
                />
              </Field>

              <Field label="Valor / credito desejado">
                <input
                  className={fieldInputClass}
                  min={0}
                  onChange={(event) =>
                    updateDraft({ valorPretendido: Number(event.target.value) })
                  }
                  type="number"
                  value={draft.valorPretendido}
                />
              </Field>

              <Field label="Funil">
                <select
                  className={fieldInputClass}
                  onChange={(event) =>
                    handlePipelineChange(event.target.value as CrmPipeline)
                  }
                  value={draft.pipeline}
                >
                  {crmPipelines.map((pipeline) => (
                    <option key={pipeline.key} value={pipeline.key}>
                      {pipeline.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Etapa">
                <select
                  className={fieldInputClass}
                  onChange={(event) =>
                    updateDraft({ etapa: event.target.value as CrmStage })
                  }
                  value={draft.etapa}
                >
                  {getStagesForPipeline(draft.pipeline).map((stage) => (
                    <option key={stage.key} value={stage.key}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Observacoes atuais">
              <textarea
                className={cn(fieldInputClass, "min-h-32 resize-y")}
                onChange={(event) =>
                  updateDraft({ observacoes: event.target.value })
                }
                placeholder="Perfil, objetivos, objecoes, contexto familiar e combinados."
                value={draft.observacoes}
              />
            </Field>
          </ExecutiveDossierCard>

          <ExecutiveDossierCard
            description="Artefatos comerciais ja existentes no EVOLV."
            eyebrow="Card 6"
            title="Propostas e Simulacoes"
          >
            <div className="grid gap-3">
              {proposals.length ? (
                proposals.map((proposal) => (
                  <GeneratedProposalItem
                    key={`${proposal.generatedAt}-${proposal.fileName ?? "pdf"}`}
                    proposal={proposal}
                  />
                ))
              ) : (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  Nenhuma proposta gerada nesta sessao.
                </p>
              )}
            </div>
          </ExecutiveDossierCard>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit">
            <Plus className="h-4 w-4" aria-hidden />
            Salvar lead
          </Button>
          <Button onClick={onCancel} type="button" variant="ghost">
            Cancelar edicao
          </Button>
        </div>
      </form>

      {isNoteModalOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"
          role="dialog"
        >
          <div className="w-full max-w-lg rounded-md border bg-background p-5 shadow-xl">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Nota interna
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">
                Adicionar Nota
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Registre uma observacao interna para manter o contexto comercial
                do lead.
              </p>
            </div>

            <label className="mt-5 grid gap-2 text-sm font-medium text-foreground">
              <span>Observacao interna</span>
              <textarea
                className={cn(fieldInputClass, "min-h-36 resize-y")}
                disabled={isSavingNote}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder="Ex.: cliente pediu retorno apos reuniao com a familia."
                value={noteContent}
              />
            </label>

            {noteError ? (
              <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {noteError}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button
                disabled={isSavingNote}
                onClick={handleCloseNoteModal}
                type="button"
                variant="ghost"
              >
                Cancelar
              </Button>
              <Button
                disabled={isSavingNote || !noteContent.trim()}
                onClick={handleSaveNote}
                type="button"
              >
                {isSavingNote ? "Salvando..." : "Salvar Nota"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

async function readSupabaseAccessToken() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    return null;
  }

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

function mapLeadNoteToStructuredNote(note: CrmLeadNote): CrmStructuredNote {
  return {
    author: "EVOLV",
    content: note.content,
    id: note.id,
    kind: "history",
    timestamp: note.createdAt,
  };
}

function getLeadDisplayName(lead: Pick<CrmLead, "nome" | "telefone" | "email">) {
  const normalizedName =
    typeof lead.nome === "string" ? lead.nome.trim() : "";

  if (
    normalizedName &&
    normalizedName.toLowerCase() !== "undefined" &&
    normalizedName.toLowerCase() !== "null"
  ) {
    return normalizedName;
  }

  const fallbackReference = lead.telefone?.trim() || lead.email?.trim() || "";

  return fallbackReference
    ? `Lead sem nome (${fallbackReference})`
    : "Lead sem nome";
}

function SuccessFeedback({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
      {message}
    </p>
  );
}

function ExecutiveDossierCard({
  children,
  description,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <article className="executive-surface min-w-0 rounded-md p-5 text-card-foreground">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {eyebrow}
      </p>
      <SectionHeader description={description} title={title} />
      <div className="mt-4">{children}</div>
    </article>
  );
}

function GeneratedProposalItem({
  proposal,
}: {
  proposal: GeneratedProposalRecord;
}) {
  return (
    <div className="rounded-md border bg-card p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">
            {proposal.recommendedScenario}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {dateFormatter.format(new Date(proposal.generatedAt))}
          </p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {percentFormatter.format(proposal.roiPercent)}
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        <LeadInfo
          label="Credito"
          value={currencyFormatter.format(proposal.commercialCredit)}
        />
        <LeadInfo label="Arquivo" value={proposal.fileName || "-"} />
      </div>
    </div>
  );
}

function SectionHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function LeadInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function CommercialSignalBadge({
  children,
  signal,
  summary,
}: {
  children: React.ReactNode;
  signal: CrmCommercialSignal;
  summary: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-1 text-muted-foreground",
        getCommercialSignalClassName(signal),
      )}
      title={summary}
    >
      {children}
    </span>
  );
}

function OperationalPriorityBadge({
  children,
  priority,
  summary,
}: {
  children: React.ReactNode;
  priority: CrmOperationalPriority;
  summary: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-1 text-muted-foreground",
        getOperationalPriorityClassName(priority),
      )}
      title={summary}
    >
      {children}
    </span>
  );
}

function getCommercialSignalClassName(signal: CrmCommercialSignal) {
  if (signal === "hot") {
    return "border-[#d9a184] bg-[#f5e8df] text-[#9a4f32]";
  }

  if (signal === "warm") {
    return "border-[#d9c28a] bg-[#f7f0df] text-[#80662f]";
  }

  if (signal === "cold") {
    return "border-[#c8d4dc] bg-[#edf3f6] text-[#546977]";
  }

  if (signal === "abandoned") {
    return "border-[#d2b2b2] bg-[#f6eeee] text-[#8a4b4b]";
  }

  return "border-border bg-background text-muted-foreground";
}

function getOperationalPriorityClassName(priority: CrmOperationalPriority) {
  if (priority === "overdue") {
    return "border-[#d9a184] bg-[#f5e8df] text-[#9a4f32]";
  }

  if (priority === "today") {
    return "border-[#d9c28a] bg-[#f7f0df] text-[#80662f]";
  }

  if (
    priority === "missing_action" ||
    priority === "missing_date" ||
    priority === "missing_description"
  ) {
    return "border-[#d2b2b2] bg-[#f6eeee] text-[#8a4b4b]";
  }

  if (priority === "soon") {
    return "border-[#b7c8bd] bg-[#edf5ef] text-[#3f6d4e]";
  }

  return "border-border bg-background text-muted-foreground";
}
