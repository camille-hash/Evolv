import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envText = fs.readFileSync(".env.local", "utf8");
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match) continue;
  const key = match[1];
  let value = match[2];
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  if (!(key in process.env)) process.env[key] = value;
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

const recentIds = [
  "8144b439-317c-46b8-9b1a-008405058c41",
  "4b178327-68a5-4cd7-afd0-3ddb26458178",
  "9986756e-d89c-4436-af91-7e09b97e58fa",
  "f924459e-8c0c-4fa6-a3e8-59cb5f110124",
  "48151cc0-5093-4516-a6cc-3cd491144cc3"
];

const { data: contracts, error: contractsError } = await supabase
  .from("contracts")
  .select("id, contract_number, status, commission_plan_id, organization_id")
  .in("id", recentIds);
if (contractsError) throw contractsError;

const planIds = [...new Set((contracts ?? []).map((row) => row.commission_plan_id).filter(Boolean))];
const { data: plans, error: plansError } = await supabase
  .from("commission_plans")
  .select("id, name, status, organization_id, administrator_id")
  .in("id", planIds);
if (plansError) throw plansError;

const { data: snapshots, error: snapshotsError } = await supabase
  .from("contract_commission_snapshots")
  .select("id, contract_id, source_commission_plan_id, source_commission_plan_name, superseded_at")
  .in("contract_id", recentIds)
  .is("superseded_at", null);
if (snapshotsError) throw snapshotsError;

const planById = new Map((plans ?? []).map((row) => [row.id, row]));
const snapshotByContractId = new Map((snapshots ?? []).map((row) => [row.contract_id, row]));

const result = (contracts ?? []).map((contract) => {
  const plan = contract.commission_plan_id ? planById.get(contract.commission_plan_id) ?? null : null;
  const snapshot = snapshotByContractId.get(contract.id) ?? null;
  return {
    contract_id: contract.id,
    contract_number: contract.contract_number,
    status: contract.status,
    commission_plan_id: contract.commission_plan_id,
    commission_plan_name: plan?.name ?? null,
    plan_status: plan?.status ?? null,
    snapshot_id: snapshot?.id ?? null,
    snapshot_commission_plan_id: snapshot?.source_commission_plan_id ?? null,
    snapshot_commission_plan_name: snapshot?.source_commission_plan_name ?? null,
    same_plan_between_contract_and_snapshot:
      snapshot?.source_commission_plan_id
        ? snapshot.source_commission_plan_id === contract.commission_plan_id
        : null,
  };
});

console.log(JSON.stringify(result, null, 2));
