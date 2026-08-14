import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { formatCrmLeadEntryDateTime } from "./crm-lead-entry-date.ts";

test("formats recent, old, Meta Ads, and manual leads in Sao Paulo time", () => {
  for (const scenario of [
    { kind: "recent", value: "2026-08-14T15:30:00.000Z", expected: "Entrada: 14/08/2026 às 12:30" },
    { kind: "old", value: "2024-01-10T12:05:00.000Z", expected: "Entrada: 10/01/2024 às 09:05" },
    { kind: "meta", value: "2026-08-08T17:02:22.000Z", expected: "Entrada: 08/08/2026 às 14:02" },
    { kind: "manual", value: "2026-07-03T18:45:00.000Z", expected: "Entrada: 03/07/2026 às 15:45" },
  ]) {
    assert.equal(formatCrmLeadEntryDateTime(scenario.value), scenario.expected, scenario.kind);
  }
});

test("uses Sao Paulo when the UTC timestamp is close to the day boundary", () => {
  assert.equal(
    formatCrmLeadEntryDateTime("2026-08-15T02:30:00.000Z"),
    "Entrada: 14/08/2026 às 23:30",
  );
});

test("returns null instead of inventing a missing or invalid date", () => {
  for (const value of [undefined, null, "", "   ", "not-a-timestamp"]) {
    assert.equal(formatCrmLeadEntryDateTime(value), null);
  }
});

test("renders the entry line as compact, secondary, and overflow-safe", () => {
  const source = readFileSync(
    join(process.cwd(), "components", "crm", "crm-page.tsx"),
    "utf8",
  );

  assert.match(source, /formatCrmLeadEntryDateTime\(lead\.createdAt\)/);
  assert.match(source, /text-\[10px\]/);
  assert.match(source, /text-muted-foreground/);
  assert.match(source, /min-w-0 truncate whitespace-nowrap/);
});
