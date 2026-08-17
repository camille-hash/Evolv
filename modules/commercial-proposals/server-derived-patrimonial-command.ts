import type { ServerDerivedPatrimonialIntent } from "./server-derived-patrimonial";

export type CreateServerDerivedPatrimonialProposalInput = {
  idempotencyKey: string;
  intent: ServerDerivedPatrimonialIntent;
  leadId: string;
};

export function parseServerDerivedPatrimonialProposalInput(value: unknown): CreateServerDerivedPatrimonialProposalInput | null {
  if (!isObject(value) || hasUnknown(value, ["idempotencyKey","intent","leadId"]) || typeof value.idempotencyKey !== "string" || !/^[A-Za-z0-9._:-]{8,128}$/.test(value.idempotencyKey) || typeof value.leadId !== "string" || !value.leadId.trim() || !isObject(value.intent) || hasUnknown(value.intent,["quotas"]) || !Array.isArray(value.intent.quotas)) return null;
  const quotas=[] as ServerDerivedPatrimonialIntent["quotas"];
  for (const quota of value.intent.quotas) {
    if (!isObject(quota) || hasUnknown(quota,["creditAmountCents","contemplationScenarioMonth"]) || !Number.isSafeInteger(quota.creditAmountCents) || ![15000000,17500000,20000000].includes(quota.creditAmountCents as number) || (quota.contemplationScenarioMonth !== undefined && (!Number.isInteger(quota.contemplationScenarioMonth) || (quota.contemplationScenarioMonth as number) < 1 || (quota.contemplationScenarioMonth as number) > 216))) return null;
    quotas.push({ creditAmountCents: quota.creditAmountCents as number, ...(quota.contemplationScenarioMonth === undefined ? {} : { contemplationScenarioMonth: quota.contemplationScenarioMonth as number }) });
  }
  if (quotas.length < 2 || quotas.length > 50) return null;
  return { idempotencyKey:value.idempotencyKey, leadId:value.leadId.trim(), intent:{quotas} };
}
const isObject=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==="object"&&!Array.isArray(value));
const hasUnknown=(value:Record<string,unknown>,allowed:string[])=>Object.keys(value).some(key=>!allowed.includes(key));
