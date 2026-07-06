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

const { data: contracts, error: contractsError } = await supabase
  .from("contracts")
  .select("id, contract_number, commission_plan_id, organization_id, status")
  .order("created_at", { ascending: false })
  .limit(400);
if (contractsError) throw contractsError;

const planIds = [...new Set((contracts ?? []).map((row) => row.commission_plan_id).filter(Boolean))];
const { data: plans, error: plansError } = await supabase
  .from("commission_plans")
  .select("id, organization_id, name, status")
  .in("id", planIds);
if (plansError) throw plansError;

const plansById = new Map((plans ?? []).map((row) => [row.id, row]));
const results = (contracts ?? []).map((contract) => {
  const anyOrgPlan = contract.commission_plan_id ? plansById.get(contract.commission_plan_id) ?? null : null;
  const sameOrgPlan = anyOrgPlan && anyOrgPlan.organization_id === contract.organization_id ? anyOrgPlan : null;
  const planFound = Boolean(sameOrgPlan || anyOrgPlan);
  const mdr001 = Boolean(contract.commission_plan_id && !planFound);
  const mdr003 = Boolean(contract.commission_plan_id && anyOrgPlan && anyOrgPlan.organization_id !== contract.organization_id);
  return {
    contract_id: contract.id,
    contract_number: contract.contract_number,
    status: contract.status,
    commission_plan_id: contract.commission_plan_id,
    same_org_plan_name: sameOrgPlan?.name ?? null,
    any_org_plan_name: anyOrgPlan?.name ?? null,
    mdr001,
    mdr003,
  };
});

const focus = results.filter((row) => ["teste", "teste2", "teste3", "OPS-0224-R1-1783337765160"].includes(row.contract_number ?? ""));
const invalid = results.filter((row) => row.mdr001).slice(0, 10);
const noPlan = results.find((row) => row.commission_plan_id === null) ?? null;

console.log(JSON.stringify({ focus, invalid, noPlan }, null, 2));
