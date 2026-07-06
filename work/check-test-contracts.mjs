import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envText = fs.readFileSync(".env.local", "utf8");
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match) continue;
  const key = match[1];
  let value = match[2];
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  if (!(key in process.env)) process.env[key] = value;
}
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });

const contractNumbers = ["teste", "teste2", "teste3"];
const { data: contracts, error: contractsError } = await supabase
  .from("contracts")
  .select("id, contract_number, status, commission_plan_id, organization_id, activated_at")
  .in("contract_number", contractNumbers);
if (contractsError) throw contractsError;
const ids = (contracts ?? []).map((c) => c.id);
const { data: snapshots, error: snapshotsError } = await supabase
  .from("contract_commission_snapshots")
  .select("id, contract_id, source_commission_plan_id, source_commission_plan_name, superseded_at")
  .in("contract_id", ids)
  .is("superseded_at", null);
if (snapshotsError) throw snapshotsError;
const { data: schedule, error: scheduleError } = await supabase
  .from("contract_commission_schedule_items")
  .select("id, contract_id, expected_amount, trigger_event_id, triggered_at")
  .in("contract_id", ids);
if (scheduleError) throw scheduleError;
const { data: expected, error: expectedError } = await supabase
  .from("expected_revenue_entries")
  .select("id, contract_id, expected_amount")
  .in("contract_id", ids);
if (expectedError) throw expectedError;

const snapshotsByContract = new Map((snapshots ?? []).map((s) => [s.contract_id, s]));
const result = (contracts ?? []).map((contract) => {
  const scheduleItems = (schedule ?? []).filter((row) => row.contract_id === contract.id);
  const expectedEntries = (expected ?? []).filter((row) => row.contract_id === contract.id);
  return {
    contract_id: contract.id,
    contract_number: contract.contract_number,
    status: contract.status,
    commission_plan_id: contract.commission_plan_id,
    snapshot_commission_plan_id: snapshotsByContract.get(contract.id)?.source_commission_plan_id ?? null,
    snapshot_commission_plan_name: snapshotsByContract.get(contract.id)?.source_commission_plan_name ?? null,
    schedule_items: scheduleItems.length,
    schedule_triggered_items: scheduleItems.filter((row) => row.triggered_at || row.trigger_event_id).length,
    expected_revenue_entries: expectedEntries.length,
    expected_revenue_total: expectedEntries.reduce((sum, row) => sum + Number(row.expected_amount ?? 0), 0),
  };
});
console.log(JSON.stringify(result, null, 2));
