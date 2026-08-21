import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const detailSource = readFileSync(
  join(process.cwd(), "components", "crm", "crm-lead-detail.tsx"),
  "utf8",
);
const panelSource = readFileSync(
  join(process.cwd(), "components", "contracts", "proposal-materialization-panel.tsx"),
  "utf8",
);

test("hidrata propostas persistidas ao abrir o lead e novamente após refresh", () => {
  assert.match(detailSource, /fetchLeadCommercialProposals\(\s*accessToken,\s*lead\.id/);
  assert.match(detailSource, /setCommercialProposalsState\(\{\s*leadId: lead\.id,\s*proposals/);
  assert.match(detailSource, /\[commercialProposalsReloadKey, lead\.id\]/);
  assert.match(detailSource, /addEventListener\(leadCommercialProposalsChangedEvent, reload\)/);
});

test("expõe aba Propostas sempre visível com contagem de linhagens", () => {
  assert.match(detailSource, /\{ key: "proposals", label: "Propostas" \}/);
  assert.match(detailSource, /proposalCount=\{commercialProposalLineages\.length\}/);
  assert.match(detailSource, /item\.key === "proposals" && proposalCount > 0/);
});

test("distingue loading, erro recuperável e vazio persistente verdadeiro", () => {
  assert.match(detailSource, /aria-label="Carregando propostas comerciais"/);
  assert.match(detailSource, /Tentar novamente/);
  assert.match(detailSource, /Nenhuma proposta comercial registrada para este lead\./);
  assert.doesNotMatch(detailSource, /Nenhuma proposta gerada nesta sessao\./);
});

test("abre somente a versão corrente da linhagem no painel C7", () => {
  assert.match(detailSource, /lineages\.map\(\(\{ current: proposal, versions \}\)/);
  assert.match(detailSource, /ProposalMaterializationPanel onChanged=\{onChanged\} proposal=\{proposal\}/);
  assert.match(detailSource, /Histórico de versões/);
});

test("atalho Última proposta comercial abre a aba principal", () => {
  assert.match(detailSource, /Última proposta comercial/);
  assert.match(detailSource, /onOpen=\{\(\) => setActiveDossierTab\("proposals"\)\}/);
  assert.match(detailSource, /Número/);
  assert.match(detailSource, /Crédito total/);
});

test("painel comunica os três estados do smoke C7 e atualiza a lista", () => {
  assert.match(panelSource, /Aguardando aprovação/);
  assert.match(panelSource, /Pronta para gerar contratos/);
  assert.match(panelSource, /Contratos gerados · \{experience\.contracts\.length\} contratos em rascunho/);
  assert.match(panelSource, /onChanged\?\.\(\)/);
});

test("V1 prioriza decisão e não renderiza o comparador legado", () => {
  assert.match(detailSource, /ProposalMaterializationPanel[\s\S]{0,240}isFormalCommercialProposalV1/);
  assert.match(detailSource, /LeadCommercialProposalV1Detail/);
  assert.match(detailSource, /Resumo do produto/);
  assert.match(detailSource, /Composição comercial/);
  assert.match(detailSource, /Condições comerciais/);
  assert.doesNotMatch(detailSource, /Snapshot persistido/);
});

test("usa linguagem de accordion e CTA decisório", () => {
  assert.match(detailSource, /Recolher detalhes/);
  assert.match(detailSource, /Ver detalhes/);
  assert.doesNotMatch(detailSource, /Fechar proposta/);
  assert.match(panelSource, /Aprovar proposta/);
  assert.match(panelSource, /Gerar contratos/);
});
