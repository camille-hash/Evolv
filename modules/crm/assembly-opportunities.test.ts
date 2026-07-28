import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAssemblyOpportunities,
  calculateDaysUntilAssembly,
  resolveAssemblyOpportunityPriority,
  type AssemblyOpportunityCandidate,
} from "./assembly-opportunities.ts";

const now = new Date("2026-07-27T15:00:00.000Z");

function candidate(
  input: Partial<AssemblyOpportunityCandidate> = {},
): AssemblyOpportunityCandidate {
  return {
    administratorName: "Administradora",
    assemblyDate: "2026-08-01T15:00:00.000Z",
    assemblyId: "assembly-1",
    assemblyStatus: "scheduled",
    bidResults: [],
    clientName: "Cliente A",
    contractId: "contract-1",
    contractName: "Contrato 1",
    contractStatus: "active",
    creditAmount: 100_000,
    ...input,
  };
}

test("calcula dias corridos no timezone operacional", () => {
  assert.equal(
    calculateDaysUntilAssembly("2026-07-28T02:00:00.000Z", now),
    0,
  );
  assert.equal(
    calculateDaysUntilAssembly("2026-07-28T03:00:00.000Z", now),
    1,
  );
});

test("classifica prioridades da janela D-10", () => {
  assert.equal(resolveAssemblyOpportunityPriority(0), "critical");
  assert.equal(resolveAssemblyOpportunityPriority(1), "critical");
  assert.equal(resolveAssemblyOpportunityPriority(2), "high");
  assert.equal(resolveAssemblyOpportunityPriority(5), "high");
  assert.equal(resolveAssemblyOpportunityPriority(6), "medium");
  assert.equal(resolveAssemblyOpportunityPriority(10), "medium");
});

test("inclui hoje e D+10 e exclui D+11", () => {
  const result = buildAssemblyOpportunities(
    [
      candidate({
        assemblyDate: "2026-07-27T18:00:00.000Z",
        assemblyId: "today",
      }),
      candidate({
        assemblyDate: "2026-08-06T18:00:00.000Z",
        assemblyId: "day-10",
      }),
      candidate({
        assemblyDate: "2026-08-07T18:00:00.000Z",
        assemblyId: "day-11",
      }),
    ],
    now,
  );

  assert.deepEqual(
    result.map((item) => item.assemblyId),
    ["today", "day-10"],
  );
});

test("exclui assembleia concluida ou cancelada", () => {
  assert.equal(
    buildAssemblyOpportunities(
      [
        candidate({ assemblyStatus: "completed" }),
        candidate({ assemblyId: "cancelled", assemblyStatus: "cancelled" }),
      ],
      now,
    ).length,
    0,
  );
});

test("draft nao impede, mas lance operacional ou resultado impedem", () => {
  const result = buildAssemblyOpportunities(
    [
      candidate({ assemblyId: "draft", bidResults: ["draft"] }),
      candidate({ assemblyId: "submitted", bidResults: ["submitted"] }),
      candidate({
        assemblyId: "not-contemplated",
        bidResults: ["not_contemplated"],
      }),
    ],
    now,
  );

  assert.deepEqual(result.map((item) => item.assemblyId), ["draft"]);
});

test("ordena por urgencia, credito e cliente e mantem id estavel", () => {
  const result = buildAssemblyOpportunities(
    [
      candidate({
        assemblyId: "lower-credit",
        clientName: "Zeta",
        creditAmount: 100_000,
      }),
      candidate({
        assemblyId: "alpha",
        clientName: "Alpha",
        creditAmount: 200_000,
      }),
      candidate({
        assemblyId: "beta",
        clientName: "Beta",
        creditAmount: 200_000,
      }),
    ],
    now,
  );

  assert.deepEqual(
    result.map((item) => item.assemblyId),
    ["alpha", "beta", "lower-credit"],
  );
  assert.equal(result[0]?.id, "ASSEMBLY_D_MINUS_10:alpha");
});
