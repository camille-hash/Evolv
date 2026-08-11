import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(
  join(process.cwd(), "components", "crm", "crm-lead-detail.tsx"),
  "utf8",
);

test("replaces only the former objective block with monthly investment capacity", () => {
  assert.match(source, /label="Capacidade de investimento mensal"/);
  assert.match(source, /monthlyInvestmentCapacity \?\? "Não informado"/);
  assert.doesNotMatch(source, /label="Objetivo comercial"/);
  assert.doesNotMatch(source, /const leadObjective\s*=/);
});

test("keeps desired credit separate and unchanged", () => {
  assert.match(
    source,
    /label="Credito desejado"[\s\S]{0,160}currencyFormatter\.format\(lead\.valorPretendido\)/,
  );
});

test("does not query the complementary projection for non-Meta leads", () => {
  assert.match(source, /if \(lead\.sourceSystem !== "meta_lead_ads"\)/);
  assert.match(
    source,
    /lead-monthly-investment-capacity\?leadId=\$\{encodeURIComponent\(lead\.id\)\}/,
  );
});

test("loads both Meta declarations from the same single request", () => {
  assert.equal(
    (source.match(/fetch\(\s*`\/api\/crm\/lead-monthly-investment-capacity/g) ?? [])
      .length,
    1,
  );
  assert.match(
    source,
    /declaredBrazilianAndCpfStatus\?: unknown;\s*monthlyInvestmentCapacity\?: unknown;/,
  );
  assert.match(
    source,
    /setLeadMetaDeclarationsState\(\{[\s\S]{0,320}declaredBrazilianAndCpfStatus:[\s\S]{0,320}monthlyInvestmentCapacity:/,
  );
  assert.doesNotMatch(source, /fetch\([^)]*declaredBrazilianAndCpfStatus/);
});

test("accepts only yes or no and translates the compound declaration neutrally", () => {
  assert.match(
    source,
    /payload\?\.declaredBrazilianAndCpfStatus === "yes" \|\|\s*payload\?\.declaredBrazilianAndCpfStatus === "no"/,
  );
  assert.match(
    source,
    /declaredBrazilianAndCpfStatus === "yes"\s*\? "Sim"\s*: declaredBrazilianAndCpfStatus === "no"\s*\? "Não"\s*: null/,
  );
  assert.match(source, /label="Brasileiro e possui CPF"/);
  assert.doesNotMatch(
    source,
    /CPF (?:validado|confirmado)|Documento verificado|Elegível|Regular|Aprovado/i,
  );
});

test("hides absent or invalid declarations and resets them when the lead changes", () => {
  assert.match(
    source,
    /setLeadMetaDeclarationsState\(\{\s*declaredBrazilianAndCpfStatus: null,\s*leadId: lead\.id,\s*monthlyInvestmentCapacity: null,\s*\}\);/,
  );
  assert.match(
    source,
    /\{declaredBrazilianAndCpfLabel \? \([\s\S]{0,180}label="Brasileiro e possui CPF"[\s\S]{0,120}\) : null\}/,
  );
  assert.doesNotMatch(
    source,
    /label="Brasileiro e possui CPF"[\s\S]{0,120}Não informado/,
  );
});
