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
