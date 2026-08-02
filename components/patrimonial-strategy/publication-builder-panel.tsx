"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Lock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildPatrimonialPublication,
  createPublicationPreview,
  getReferenceCapitalExecutiveMaterialChapters,
  resolveChapterAvailability,
  type PatrimonialPublication,
  type PatrimonialPublicationChapterKey,
  type ReferenceCapitalStrategySnapshot,
} from "@/modules/patrimonial-strategy";

type PublicationBuilderPanelProps = {
  createdBy?: string | null;
  initialPublication?: PatrimonialPublication | null;
  onPreparePublication?: (publication: PatrimonialPublication) => Promise<void> | void;
  onSaveDraft?: (publication: PatrimonialPublication) => Promise<void> | void;
  strategyId: string;
  strategySnapshot: ReferenceCapitalStrategySnapshot;
  strategyTitle: string;
  strategyVersion: number;
};

export function PublicationBuilderPanel({
  createdBy = null,
  initialPublication = null,
  onPreparePublication,
  onSaveDraft,
  strategyId,
  strategySnapshot,
  strategyTitle,
  strategyVersion,
}: PublicationBuilderPanelProps) {
  const initialOptionalKeys = useMemo(
    () =>
      initialPublication?.optionalChapters
        .filter((chapter) => chapter.selected)
        .map((chapter) => chapter.chapterKey) ?? undefined,
    [initialPublication],
  );
  const [selectedOptionalKeys, setSelectedOptionalKeys] = useState<
    PatrimonialPublicationChapterKey[] | undefined
  >(initialOptionalKeys);
  const [feedback, setFeedback] = useState<{
    message: string;
    status: "idle" | "saving" | "success" | "error";
  }>({ message: "", status: "idle" });

  const publication = useMemo(
    () =>
      buildPatrimonialPublication({
        createdBy,
        publicationId: initialPublication?.id,
        publicationVersion: initialPublication?.publicationVersion ?? 1,
        selectedOptionalChapterKeys: selectedOptionalKeys,
        status: initialPublication?.status === "draft" ? "draft" : "ready",
        strategyId,
        strategySnapshot,
        strategyTitle,
        strategyVersion,
        title: initialPublication?.title,
      }),
    [
      createdBy,
      initialPublication?.id,
      initialPublication?.publicationVersion,
      initialPublication?.status,
      initialPublication?.title,
      selectedOptionalKeys,
      strategyId,
      strategySnapshot,
      strategyTitle,
      strategyVersion,
    ],
  );
  const preview = createPublicationPreview(publication);
  const chapters = getReferenceCapitalExecutiveMaterialChapters();

  function toggleOptionalChapter(chapterKey: PatrimonialPublicationChapterKey) {
    setSelectedOptionalKeys((current) => {
      const next = current ?? [];
      return next.includes(chapterKey)
        ? next.filter((key) => key !== chapterKey)
        : [...next, chapterKey];
    });
  }

  async function handleSaveDraft() {
    if (!onSaveDraft) {
      return;
    }

    setFeedback({
      message: "Salvando rascunho da publicacao...",
      status: "saving",
    });

    try {
      const draft = buildPatrimonialPublication({
        createdBy,
        publicationId: publication.id,
        publicationVersion: publication.publicationVersion,
        selectedOptionalChapterKeys: selectedOptionalKeys,
        status: "draft",
        strategyId,
        strategySnapshot,
        strategyTitle,
        strategyVersion,
        title: publication.title,
      });
      await onSaveDraft(draft);
      setFeedback({
        message: "Rascunho da publicacao salvo.",
        status: "success",
      });
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar o rascunho.",
        status: "error",
      });
    }
  }

  async function handlePreparePublication() {
    if (!onPreparePublication) {
      return;
    }

    setFeedback({
      message: "Preparando publicacao...",
      status: "saving",
    });

    try {
      const readyPublication = buildPatrimonialPublication({
        createdBy,
        publicationId: publication.id,
        publicationVersion: publication.publicationVersion,
        selectedOptionalChapterKeys: selectedOptionalKeys,
        status: "ready",
        strategyId,
        strategySnapshot,
        strategyTitle,
        strategyVersion,
        title: publication.title,
      });
      await onPreparePublication(readyPublication);
      setFeedback({
        message: "Publicacao preparada para renderer futuro.",
        status: "success",
      });
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel preparar a publicacao.",
        status: "error",
      });
    }
  }

  return (
    <section className="grid gap-5 rounded-md border bg-card p-5 text-card-foreground">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Material Executivo
          </p>
          <h4 className="mt-2 text-lg font-semibold text-foreground">
            Estrategia Patrimonial Patrion Asset
          </h4>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Produto utilizado: Grupo Exclusivo Referencia Capital.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Cliente: {strategySnapshot.leadContext?.leadName ?? "-"}</span>
            <span>Consultor: {strategySnapshot.leadContext?.responsibleName ?? "-"}</span>
            <span>Versao da estrategia: {strategyVersion}</span>
            <span>Publicacao: v{publication.publicationVersion}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!onSaveDraft || feedback.status === "saving"}
            onClick={handleSaveDraft}
            type="button"
            variant="secondary"
          >
            <Save className="h-4 w-4" aria-hidden />
            Salvar rascunho
          </Button>
          <Button
            disabled={!onPreparePublication || feedback.status === "saving"}
            onClick={handlePreparePublication}
            type="button"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Preparar publicacao
          </Button>
        </div>
      </div>

      {feedback.message ? (
        <p
          className={
            feedback.status === "error"
              ? "rounded-md border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"
              : "rounded-md border bg-background/70 p-3 text-sm text-muted-foreground"
          }
        >
          {feedback.message}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_0.56fr]">
        <div className="grid gap-3">
          {chapters.map((chapter) => {
            const availability = resolveChapterAvailability({
              chapter,
              commercialProposal:
                publication.sourceArtifacts.commercialProposal,
              strategySnapshot,
            });
            const selection = publication.selectedChapters.find(
              (selectedChapter) =>
                selectedChapter.chapterKey === chapter.chapterKey,
            );
            const selected = Boolean(selection);
            const isMandatory = chapter.requirement === "mandatory";

            return (
              <article
                className="rounded-md border bg-background/70 p-4"
                key={chapter.chapterKey}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="text-sm font-semibold text-foreground">
                        {chapter.defaultOrder}. {chapter.title}
                      </h5>
                      <span className="rounded-full border bg-card px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        {isMandatory ? "Obrigatorio" : "Opcional"}
                      </span>
                      <span className="rounded-full border bg-card px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        {availability.available ? "Disponivel" : "Indisponivel"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {chapter.description}
                    </p>
                    {availability.reason ? (
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {availability.reason}
                      </p>
                    ) : null}
                  </div>
                  {isMandatory ? (
                    <span className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" aria-hidden />
                      Incluido
                    </span>
                  ) : (
                    <Button
                      disabled={!availability.available}
                      onClick={() => toggleOptionalChapter(chapter.chapterKey)}
                      type="button"
                      variant={selected ? "secondary" : "ghost"}
                    >
                      {selected ? "Remover" : "Incluir"}
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <aside className="rounded-md border bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Preview estrutural
          </p>
          <div className="mt-4 grid gap-3">
            {preview.map((item) => (
              <div
                className="rounded-md border bg-card px-3 py-2 text-sm"
                key={item.chapterKey}
              >
                <p className="font-medium text-foreground">
                  Pagina/Secao {item.order} - {item.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.requirement === "mandatory"
                    ? "Obrigatorio"
                    : "Opcional selecionado"}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
