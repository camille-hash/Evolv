import assert from "node:assert/strict";
import test from "node:test";
import {
  attachExecutiveMaterialPdfArtifactMetadata,
  buildExecutiveMaterialPdfFileName,
  buildExecutiveMaterialPdfPages,
  buildExecutiveMaterialPdfTextIndex,
  buildPatrimonialPublication,
  buildReferenceCapitalStrategySnapshot,
  calculateReferenceCapitalExclusiveStrategy,
  executiveMaterialPdfRenderer,
  executiveMaterialPdfRendererKey,
  executiveMaterialPdfRendererVersion,
  renderExecutiveMaterialPdf,
  slugify,
  type ReferenceCapitalStrategySnapshot,
} from "../../../index.ts";

function createSnapshot(input?: {
  commercialProposal?: ReferenceCapitalStrategySnapshot["commercialProposal"];
  includeScenarios?: boolean;
  leadName?: string;
  quotaCount?: number;
}) {
  const credits = [150000, 175000, 200000, 150000, 175000] as const;
  const result = calculateReferenceCapitalExclusiveStrategy({
    includeContemplationScenariosInMaterial: input?.includeScenarios ?? false,
    quotas: credits.slice(0, input?.quotaCount ?? 2).map((creditAmount, index) => ({
      creditAmount,
      contemplationScenarioMonth: (index + 1) * 12,
      id: `quota-${index + 1}`,
    })),
  });

  return buildReferenceCapitalStrategySnapshot({
    commercialProposal: input?.commercialProposal ?? null,
    leadContext: {
      commercialContext: {
        objetivo: "Organizacao patrimonial.",
      },
      leadId: "lead-1",
      leadName: input?.leadName ?? "Joao da Conceicao",
      responsibleName: "Camille",
    },
    result,
  });
}

function createPublication(input?: {
  commercialProposal?: ReferenceCapitalStrategySnapshot["commercialProposal"];
  includeScenarios?: boolean;
  quotaCount?: number;
  selectedOptionalChapterKeys?: Parameters<
    typeof buildPatrimonialPublication
  >[0]["selectedOptionalChapterKeys"];
  status?: "draft" | "ready";
}) {
  return buildPatrimonialPublication({
    createdAt: "2026-08-02T12:00:00.000Z",
    createdBy: "profile-1",
    selectedOptionalChapterKeys: input?.selectedOptionalChapterKeys,
    status: input?.status ?? "ready",
    strategyId: "strategy-1",
    strategySnapshot: createSnapshot({
      commercialProposal: input?.commercialProposal,
      includeScenarios: input?.includeScenarios,
      quotaCount: input?.quotaCount,
    }),
    strategyTitle: "Estrategia Patrimonial Patrion Asset",
    strategyVersion: 1,
  });
}

test("declares the executive material PDF renderer contract", () => {
  assert.equal(executiveMaterialPdfRenderer.rendererKey, executiveMaterialPdfRendererKey);
  assert.equal(executiveMaterialPdfRenderer.rendererVersion, executiveMaterialPdfRendererVersion);
  assert.equal(executiveMaterialPdfRenderer.supportedPublicationType, "executive_material");
});

test("rejects draft publications", () => {
  assert.throws(
    () => renderExecutiveMaterialPdf(createPublication({ status: "draft" })),
    /precisa estar pronta/,
  );
});

test("renders a non-empty PDF artifact with metadata", () => {
  const publication = createPublication();
  const artifact = renderExecutiveMaterialPdf(publication);

  assert.equal(artifact.mimeType, "application/pdf");
  assert.equal(artifact.rendererVersion, executiveMaterialPdfRendererVersion);
  assert.equal(artifact.publicationId, publication.id);
  assert.ok(artifact.byteLength > 1000);
  assert.equal(String.fromCharCode(...artifact.bytes.slice(0, 4)), "%PDF");
});

test("renders minimum material content from the publication snapshot", () => {
  const publication = createPublication();
  const text = buildExecutiveMaterialPdfTextIndex(publication).join("\n");

  assert.match(text, /Estratégia Patrimonial Patrion Asset/);
  assert.match(text, /Grupo Exclusivo Referência Capital/);
  assert.match(text, /Crédito total contratado: R\$\s?325\.000,00/);
  assert.match(text, /Parcela-base - meses 25 a 216/);
  assert.match(text, /INCC/);
  assert.match(text, /A contemplação depende das regras/);
});

test("does not render individual scenario months when scenarios are off", () => {
  const publication = createPublication({ includeScenarios: false });
  const text = buildExecutiveMaterialPdfTextIndex(publication).join("\n");

  assert.doesNotMatch(text, /Cenários utilizados na reunião/);
  assert.doesNotMatch(text, /Mês 12/);
  assert.doesNotMatch(text, /Os meses apresentados representam hipóteses/);
});

test("renders individual scenario months and disclaimer when scenarios are on", () => {
  const publication = createPublication({ includeScenarios: true });
  const text = buildExecutiveMaterialPdfTextIndex(publication).join("\n");

  assert.match(text, /Cenários utilizados na reunião/);
  assert.match(text, /Cota 1 \| R\$\s?150\.000,00 \| Mês 12/);
  assert.match(
    text,
    /hipóteses utilizadas durante a reunião e não constituem garantia de contemplação/,
  );
  assert.doesNotMatch(text, /contemplação prevista/i);
});

test("supports five quotas without changing snapshot order", () => {
  const publication = createPublication({
    includeScenarios: true,
    quotaCount: 5,
  });
  const text = buildExecutiveMaterialPdfTextIndex(publication).join("\n");

  assert.match(text, /Cota 5/);
  assert.match(text, /Mês 60/);
  assert.equal(publication.contentSnapshot.result.quotas.length, 5);
});

test("keeps Commercial Proposal absent from the PDF when not selected", () => {
  const publication = createPublication({
    selectedOptionalChapterKeys: ["patrimonial_consulting"],
  });
  const text = buildExecutiveMaterialPdfTextIndex(publication).join("\n");

  assert.doesNotMatch(text, /Commercial Proposal:/);
});

test("renders commercial proposal context without internal identifiers", () => {
  const publication = createPublication({
    commercialProposal: {
      artifactId: "proposal-1",
      status: "approved",
      version: 2,
    },
    selectedOptionalChapterKeys: ["patrimonial_consulting"],
  });
  const text = buildExecutiveMaterialPdfTextIndex(publication).join("\n");

  assert.match(text, /Consultoria Patrimonial/);
  assert.match(text, /Versão comercial associada: 2/);
  assert.match(text, /Status comercial: approved/);
  assert.doesNotMatch(text, /proposal-1/);
});

test("generates sanitized filename with accents removed", () => {
  const publication = createPublication();

  assert.equal(slugify("Joao da Conceicao"), "joao-da-conceicao");
  assert.equal(
    buildExecutiveMaterialPdfFileName(publication),
    "estrategia-patrimonial-patrion-joao-da-conceicao-2026-08-02-v1.pdf",
  );
});

test("attaches artifact metadata without persisting PDF bytes", () => {
  const publication = createPublication();
  const artifact = renderExecutiveMaterialPdf(publication);
  const renderedPublication = attachExecutiveMaterialPdfArtifactMetadata({
    artifact,
    publication,
  });
  const metadata = renderedPublication.renderedArtifacts?.[0];

  assert.equal(renderedPublication.status, "rendered");
  assert.equal(metadata?.artifactId, artifact.artifactId);
  assert.equal("bytes" in (metadata ?? {}), false);
});

test("keeps historical PDF content stable after strategy mutation", () => {
  const snapshot = createSnapshot();
  const publication = buildPatrimonialPublication({
    createdAt: "2026-08-02T12:00:00.000Z",
    strategyId: "strategy-1",
    strategySnapshot: snapshot,
    strategyTitle: "Estrategia Patrimonial Patrion Asset",
    strategyVersion: 1,
  });
  const before = buildExecutiveMaterialPdfTextIndex(publication).join("\n");

  snapshot.result.consolidated.totalCreditCents = 1;

  const after = buildExecutiveMaterialPdfTextIndex(publication).join("\n");
  assert.equal(before, after);
});

test("uses client-facing semantics for selected strategy credits", () => {
  const publication = createPublication();
  const pages = buildExecutiveMaterialPdfPages(publication);
  const text = pages.map((page) => [page.title, ...page.body].join("\n")).join("\n");

  assert.match(text, /Estrutura da Estratégia/);
  assert.match(text, /somente as cotas efetivamente utilizadas nesta estratégia/);
  assert.match(text, /Cota \| Código \| Crédito/);
  assert.doesNotMatch(text, /Créditos oficiais/);
});

test("keeps technical identifiers out of the executive material text", () => {
  const publication = createPublication({
    selectedOptionalChapterKeys: ["calculation_memory"],
  });
  const text = buildExecutiveMaterialPdfTextIndex(publication).join("\n");
  const artifact = renderExecutiveMaterialPdf(publication);
  const rawPdf = Buffer.from(artifact.bytes).toString("latin1");

  assert.doesNotMatch(text, /strategy:/i);
  assert.doesNotMatch(text, /publication:/i);
  assert.doesNotMatch(text, /renderer/i);
  assert.doesNotMatch(text, /snapshot/i);
  assert.doesNotMatch(
    text,
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  );
  assert.doesNotMatch(rawPdf, /Renderer STR-005/);
});

test("does not render technical calculation memory placeholders", () => {
  const publication = createPublication({
    selectedOptionalChapterKeys: ["calculation_memory"],
  });
  const text = buildExecutiveMaterialPdfTextIndex(publication).join("\n");

  assert.doesNotMatch(text, /Memória de Cálculo/);
  assert.doesNotMatch(text, /Memoria tecnica/);
  assert.doesNotMatch(text, /Engine:/);
});

test("keeps the cover title singular and institutional", () => {
  const publication = createPublication();
  const pages = buildExecutiveMaterialPdfPages(publication);
  const cover = pages[0];

  assert.equal(cover?.title, "Estratégia Patrimonial Patrion Asset");
  assert.equal(
    cover?.body.filter((line) => line === "Estratégia Patrimonial").length,
    0,
  );
  assert.match(
    cover?.body.join("\n") ?? "",
    /Planejamento patrimonial estruturado utilizando o Grupo Exclusivo Referência Capital/,
  );
});
