import { createHash } from "node:crypto";

export const commercialProposalSnapshotSchemaV1 = "commercial-proposal/v1" as const;
export const commercialProposalSnapshotAuthorities = [
  "server_derived", "server_verified", "client_structured_legacy",
  "unsupported_for_materialization",
] as const;
export type CommercialProposalSnapshotAuthority = typeof commercialProposalSnapshotAuthorities[number];
export type MoneyV1 = { amountCents: number; currency: "BRL" };
export type InstallmentPhaseV1 = { phaseKey: string; startInstallment: number; endInstallment: number; installmentAmount: MoneyV1 };
export type CommercialProposalCompositionItemV1 = {
  itemKey: string; position: number; displayLabel: string; commercialCatalogCode: string | null;
  credit: MoneyV1; termMonths: number; installmentPhases: InstallmentPhaseV1[];
  insurance: { included: boolean; description: string | null };
  adjustment: { index: string; periodicity: "monthly" | "annual" | "none"; firstAdjustmentInstallment: number | null; projectionApplied: boolean };
  contemplation: { scenarioInstallment: number | null; isGuarantee: false; rules: string[] };
};
export type CommercialProposalSavedSnapshotV1 = {
  schemaVersion: typeof commercialProposalSnapshotSchemaV1;
  proposalKind: "standard_simulation" | "patrimonial_strategy";
  provenance: {
    authority: CommercialProposalSnapshotAuthority; simulationId: string | null; strategyId: string | null;
    strategyVersion: string | null; calculationEngineKey: string; calculationEngineVersion: string;
    financialProductKey: string; financialProductVersion: string; sourceSuggestionId: string | null;
  };
  parties: { customerId: string | null; customerDisplayName: string; consultantDisplayName: string | null };
  product: { productKey: string; productVersion: string; displayName: string; administratorTechnicalId: string | null; administratorReferenceKey: string; administratorDisplayName: string; groupCode: string | null; modelCode: string | null; termMonths: number };
  strategy: { quotaCount: number; totalCredit: MoneyV1; consolidatedInstallmentPhases: InstallmentPhaseV1[] };
  composition: CommercialProposalCompositionItemV1[];
  commercialTerms: { conditions: string[] };
  disclosures: Array<{ disclosureKey: string; category: "material_term" | "commercial_disclosure" | "promotional_presentation"; text: string }>;
  presentationReference: { publicationId: string; publicationVersion: number } | null;
};
export type SnapshotValidationErrorCode = "CP_SNAPSHOT_INVALID" | "CP_COMPOSITION_INVALID" | "CP_COMPOSITION_ITEM_DUPLICATE" | "CP_CREDIT_TOTAL_MISMATCH" | "CP_INSTALLMENT_PHASES_INVALID" | "CP_INSTALLMENT_TOTAL_MISMATCH" | "CP_PRODUCT_REFERENCE_INVALID" | "CP_DISCLOSURE_INVALID";
export type SnapshotValidationResult = { valid: true } | { valid: false; errors: Array<{ code: SnapshotValidationErrorCode; path: string }> };

const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const integer = (v: unknown, min = 0) => Number.isSafeInteger(v) && (v as number) >= min;
const money = (v: unknown, positive = false): v is MoneyV1 => object(v) && v.currency === "BRL" && integer(v.amountCents, positive ? 1 : 0);
const text = (v: unknown) => typeof v === "string" && v.trim().length > 0;

export function validateCommercialProposalSavedSnapshotV1(value: unknown): SnapshotValidationResult {
  const errors: Array<{ code: SnapshotValidationErrorCode; path: string }> = [];
  const add = (code: SnapshotValidationErrorCode, path: string) => errors.push({ code, path });
  if (!object(value) || value.schemaVersion !== commercialProposalSnapshotSchemaV1) return { valid: false, errors: [{ code: "CP_SNAPSHOT_INVALID", path: "schemaVersion" }] };
  const v = value as unknown as CommercialProposalSavedSnapshotV1;
  if (!(["standard_simulation", "patrimonial_strategy"] as unknown[]).includes(v.proposalKind) || !object(v.provenance) || !commercialProposalSnapshotAuthorities.includes(v.provenance?.authority) || !object(v.parties) || !object(v.product) || !object(v.strategy) || !Array.isArray(v.composition) || !object(v.commercialTerms) || !Array.isArray(v.disclosures)) add("CP_SNAPSHOT_INVALID", "$" );
  if (!v.product || !text(v.product.productKey) || !text(v.product.productVersion) || !text(v.product.administratorReferenceKey) || !text(v.product.administratorDisplayName) || !integer(v.product.termMonths, 1)) add("CP_PRODUCT_REFERENCE_INVALID", "product");
  if (!v.strategy || !integer(v.strategy.quotaCount, 1) || !money(v.strategy.totalCredit, true) || !Array.isArray(v.strategy.consolidatedInstallmentPhases)) add("CP_COMPOSITION_INVALID", "strategy");
  if (!Array.isArray(v.composition) || v.composition.length !== v.strategy?.quotaCount) add("CP_COMPOSITION_INVALID", "composition");
  const keys = new Set<string>(), positions = new Set<number>();
  let total = 0;
  const validatePhases = (phases: InstallmentPhaseV1[], term: number, path: string) => {
    if (!Array.isArray(phases) || phases.length === 0) { add("CP_INSTALLMENT_PHASES_INVALID", path); return; }
    let expected = 1;
    for (const phase of phases) {
      if (!object(phase) || !text(phase.phaseKey) || phase.startInstallment !== expected || !integer(phase.endInstallment, phase.startInstallment) || !money(phase.installmentAmount)) add("CP_INSTALLMENT_PHASES_INVALID", path);
      expected = phase.endInstallment + 1;
    }
    if (expected !== term + 1) add("CP_INSTALLMENT_PHASES_INVALID", path);
  };
  for (const [index, item] of (v.composition ?? []).entries()) {
    if (!object(item) || !text(item.itemKey) || keys.has(item.itemKey)) add("CP_COMPOSITION_ITEM_DUPLICATE", `composition.${index}.itemKey`); else keys.add(item.itemKey);
    if (!integer(item.position, 1) || positions.has(item.position)) add("CP_COMPOSITION_INVALID", `composition.${index}.position`); else positions.add(item.position);
    if (!money(item.credit, true) || !integer(item.termMonths, 1) || item.termMonths !== v.product?.termMonths) add("CP_COMPOSITION_INVALID", `composition.${index}`); else total += item.credit.amountCents;
    validatePhases(item.installmentPhases, item.termMonths, `composition.${index}.installmentPhases`);
    if (!object(item.insurance) || typeof item.insurance.included !== "boolean" || !object(item.adjustment) || !text(item.adjustment.index) || !object(item.contemplation) || item.contemplation.isGuarantee !== false) add("CP_COMPOSITION_INVALID", `composition.${index}`);
  }
  if ([...positions].sort((a,b)=>a-b).some((p,i)=>p !== i+1)) add("CP_COMPOSITION_INVALID", "composition.position");
  if (money(v.strategy?.totalCredit) && total !== v.strategy.totalCredit.amountCents) add("CP_CREDIT_TOTAL_MISMATCH", "strategy.totalCredit");
  if (v.strategy && v.product) validatePhases(v.strategy.consolidatedInstallmentPhases, v.product.termMonths, "strategy.consolidatedInstallmentPhases");
  for (const [i, phase] of (v.strategy?.consolidatedInstallmentPhases ?? []).entries()) {
    const sum = (v.composition ?? []).reduce((n, item) => n + (item.installmentPhases?.find(p => p.phaseKey === phase.phaseKey && p.startInstallment === phase.startInstallment && p.endInstallment === phase.endInstallment)?.installmentAmount.amountCents ?? Number.NaN), 0);
    if (!Number.isSafeInteger(sum) || sum !== phase.installmentAmount.amountCents) add("CP_INSTALLMENT_TOTAL_MISMATCH", `strategy.consolidatedInstallmentPhases.${i}`);
  }
  const disclosureKeys = new Set<string>();
  for (const [i,d] of (v.disclosures ?? []).entries()) { if (!object(d) || !text(d.disclosureKey) || disclosureKeys.has(d.disclosureKey) || !text(d.text) || !(["material_term","commercial_disclosure","promotional_presentation"] as unknown[]).includes(d.category)) add("CP_DISCLOSURE_INVALID", `disclosures.${i}`); else disclosureKeys.add(d.disclosureKey); }
  return errors.length ? { valid: false, errors } : { valid: true };
}

export function buildCommercialProposalSavedSnapshotV1(input: CommercialProposalSavedSnapshotV1): CommercialProposalSavedSnapshotV1 {
  const result = structuredClone(input);
  result.composition.sort((a,b)=>a.position-b.position);
  result.composition.forEach(item=>item.installmentPhases.sort((a,b)=>a.startInstallment-b.startInstallment));
  result.strategy.consolidatedInstallmentPhases.sort((a,b)=>a.startInstallment-b.startInstallment);
  result.disclosures.sort((a,b)=>a.disclosureKey.localeCompare(b.disclosureKey));
  const validation = validateCommercialProposalSavedSnapshotV1(result);
  if (!validation.valid) throw Object.assign(new Error(validation.errors[0].code), { code: validation.errors[0].code, errors: validation.errors });
  return result;
}

export function parseCommercialProposalSavedSnapshot(value: unknown) {
  if (!object(value) || value.schemaVersion === undefined) return { kind: "legacy" as const, snapshot: value };
  if (value.schemaVersion !== commercialProposalSnapshotSchemaV1) return { kind: "unsupported" as const, code: "CP_SNAPSHOT_SCHEMA_UNSUPPORTED" as const };
  const validation = validateCommercialProposalSavedSnapshotV1(value);
  return validation.valid ? { kind: "v1" as const, snapshot: value as unknown as CommercialProposalSavedSnapshotV1 } : { kind: "invalid_v1" as const, code: "CP_SNAPSHOT_INVALID" as const, errors: validation.errors };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (object(value)) return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
export function commercialTermsHashPayload(v: CommercialProposalSavedSnapshotV1) {
  return { commercialTerms: v.commercialTerms, composition: v.composition, disclosures: v.disclosures.filter(d=>d.category !== "promotional_presentation"), product: v.product, strategy: v.strategy };
}
export function calculateCommercialTermsHash(v: CommercialProposalSavedSnapshotV1) { return createHash("sha256").update(canonical(commercialTermsHashPayload(v))).digest("hex"); }
