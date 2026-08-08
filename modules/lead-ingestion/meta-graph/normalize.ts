import type { LeadIngestionRawInput } from "../types.ts";
import type { MetaGraphLead } from "./types.ts";

const canonicalAliases = {
  email: ["email"],
  firstName: ["first_name", "first name"],
  fullName: ["full_name", "full name", "name", "nome_completo"],
  lastName: ["last_name", "last name"],
  phone: ["phone_number", "phone number", "phone", "telefone"],
} as const;

export function normalizeMetaGraphLead(
  lead: MetaGraphLead,
  transportPayload: Record<string, unknown>,
): LeadIngestionRawInput {
  const fields = collectFields(lead.fieldData);
  const fullName = first(fields, canonicalAliases.fullName) ??
    joinName(
      first(fields, canonicalAliases.firstName),
      first(fields, canonicalAliases.lastName),
    );
  const knownNames = new Set(Object.values(canonicalAliases).flat());

  return {
    adId: lead.adId ?? transportPayload.adId,
    createdTime: lead.createdTime ?? transportPayload.createdTime,
    customAnswers: lead.fieldData.flatMap((field) => {
      const name = normalizeName(field.name);
      return !name || knownNames.has(name as never)
        ? []
        : field.values.map((value) => ({ key: name, value }));
    }),
    email: first(fields, canonicalAliases.email),
    eventType: "leadgen",
    externalAccountId: transportPayload.pageId,
    externalId: lead.id,
    formId: lead.formId ?? transportPayload.formId,
    fullName,
    occurredAt: lead.createdTime ?? transportPayload.createdTime,
    pageId: transportPayload.pageId,
    phone: first(fields, canonicalAliases.phone),
    sourcePayload: {
      ...transportPayload,
      graphLeadId: lead.id,
    },
    sourceSystem: "meta_lead_ads",
  };
}
function collectFields(fieldData: MetaGraphLead["fieldData"]) {
  const fields = new Map<string, string[]>();

  for (const field of fieldData) {
    const name = normalizeName(field.name);
    if (!name) continue;
    const values = field.values.map((value) => value.trim()).filter(Boolean);
    fields.set(name, [...(fields.get(name) ?? []), ...values]);
  }

  return fields;
}

function first(fields: Map<string, string[]>, aliases: readonly string[]) {
  for (const alias of aliases) {
    const value = fields.get(alias)?.[0];
    if (value) return value;
  }
  return undefined;
}

function joinName(firstName?: string, lastName?: string) {
  const value = [firstName, lastName].filter(Boolean).join(" ").trim();
  return value || undefined;
}

function normalizeName(value: string) {
  const name = value.trim().toLowerCase();
  return name || undefined;
}
