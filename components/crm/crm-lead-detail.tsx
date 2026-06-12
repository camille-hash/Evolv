"use client";

import { type FormEvent } from "react";
import { ArrowLeft, Phone, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  crmPipelineLabels,
  crmPipelines,
  crmStageLabels,
  buildWhatsappUrl,
  getDefaultStageForPipeline,
  getStagesForPipeline,
  isStageInPipeline,
  type CrmLead,
  type CrmLeadInput,
  type CrmPipeline,
  type CrmStage,
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
  lead: CrmLead;
  onCancel: () => void;
  onDraftChange: (draft: CrmLeadInput) => void;
  onGenerateSimulation?: (lead: CrmLead) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  proposals: GeneratedProposalRecord[];
};

export function CrmLeadDetail({
  draft,
  lead,
  onCancel,
  onDraftChange,
  onGenerateSimulation,
  onSave,
  proposals,
}: CrmLeadDetailProps) {
  const whatsappUrl = buildWhatsappUrl(lead.telefone);

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

  return (
    <section className="executive-surface rounded-md p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Dossie operacional
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">
            {lead.nome}
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
          </div>
        </div>

        <Button onClick={onCancel} type="button" variant="ghost">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar ao pipeline
        </Button>
      </div>

      <div className="mt-5 grid gap-3 rounded-md border bg-background/72 p-4 text-sm sm:grid-cols-3">
        <LeadInfo label="Telefone" value={lead.telefone || "-"} />
        <LeadInfo label="E-mail" value={lead.email || "-"} />
        <LeadInfo label="Origem" value={lead.origem || "-"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <form className="grid gap-4" onSubmit={onSave}>
          <article className="rounded-md border bg-background/70 p-4">
            <SectionHeader
              description="Informacoes editaveis usadas na rotina comercial."
              title="Dados do lead"
            />

            <div className="mt-4 grid gap-4 md:grid-cols-2">
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
          </article>

          <article className="rounded-md border bg-background/70 p-4">
            <SectionHeader
              description="Contexto registrado para apoiar o proximo contato."
              title="Historico e observacoes"
            />

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <LeadInfo
                label="Criado em"
                value={dateFormatter.format(new Date(lead.createdAt))}
              />
              <LeadInfo
                label="Atualizado em"
                value={dateFormatter.format(new Date(lead.updatedAt))}
              />
            </div>

            <div className="mt-4">
              <Field label="Observacoes">
                <textarea
                  className={cn(fieldInputClass, "min-h-28 resize-y")}
                  onChange={(event) =>
                    updateDraft({ observacoes: event.target.value })
                  }
                  placeholder="Contexto comercial, objecoes e combinados."
                  value={draft.observacoes}
                />
              </Field>
            </div>
          </article>

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

        <aside className="grid content-start gap-4">
          <article className="rounded-md border bg-background/70 p-4">
            <SectionHeader
              description="Espaco preparado para os proximos passos comerciais."
              title="Acoes comerciais"
            />

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

            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              CTAs reservados para integracao futura. Nenhuma acao automatica
              foi ativada nesta etapa.
            </p>
          </article>

          <article className="rounded-md border bg-background/70 p-4">
            <SectionHeader
              description="Leitura rapida da oportunidade atual."
              title="Resumo operacional"
            />

            <div className="mt-4 grid gap-3 text-sm">
              <LeadInfo label="Funil" value={crmPipelineLabels[lead.pipeline]} />
              <LeadInfo label="Etapa" value={crmStageLabels[lead.etapa]} />
              <LeadInfo
                label="Valor desejado"
                value={currencyFormatter.format(lead.valorPretendido)}
              />
              <LeadInfo label="Consultor" value={lead.consultor || "-"} />
            </div>
          </article>

          <article className="rounded-md border bg-background/70 p-4">
            <SectionHeader
              description="Memoria local das propostas geradas nesta sessao."
              title="Propostas geradas"
            />

            <div className="mt-4 grid gap-3">
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
          </article>
        </aside>
      </div>
    </section>
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
