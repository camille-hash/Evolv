export const crmLeadProfilePrimaryGoals = [
  "Construcao Patrimonial",
  "Renda Passiva",
  "Aposentadoria",
  "Sucessao",
  "Protecao Patrimonial",
  "Diversificacao",
  "Outro",
] as const;

export type CrmLeadProfilePrimaryGoal =
  (typeof crmLeadProfilePrimaryGoals)[number];

export const crmLeadProfileCurrentMoments = [
  "Descoberta",
  "Estruturacao",
  "Expansao",
  "Consolidacao",
  "Protecao",
] as const;

export type CrmLeadProfileCurrentMoment =
  (typeof crmLeadProfileCurrentMoments)[number];

export const crmLeadProfileStrategicTopics = [
  "Imoveis",
  "Consorcio",
  "Renda Passiva",
  "Investimentos",
  "Empresas",
  "Sucessao",
  "Tributacao",
  "Credito",
  "Planejamento Familiar",
] as const;

export type CrmLeadProfileStrategicTopic =
  (typeof crmLeadProfileStrategicTopics)[number];

export type CrmLeadProfile = {
  createdAt: string;
  currentMoment: CrmLeadProfileCurrentMoment | null;
  id: string;
  leadId: string;
  primaryGoal: CrmLeadProfilePrimaryGoal | null;
  strategicNotes: string | null;
  strategicTopics: CrmLeadProfileStrategicTopic[];
  updatedAt: string;
};

export type CreateCrmLeadProfileInput = {
  currentMoment?: CrmLeadProfileCurrentMoment | null;
  leadId: string;
  primaryGoal?: CrmLeadProfilePrimaryGoal | null;
  strategicNotes?: string | null;
  strategicTopics?: CrmLeadProfileStrategicTopic[];
};

export type UpdateCrmLeadProfileInput = CreateCrmLeadProfileInput;

export function isCrmLeadProfilePrimaryGoal(
  value: unknown,
): value is CrmLeadProfilePrimaryGoal {
  return (
    typeof value === "string" &&
    crmLeadProfilePrimaryGoals.includes(value as CrmLeadProfilePrimaryGoal)
  );
}

export function isCrmLeadProfileCurrentMoment(
  value: unknown,
): value is CrmLeadProfileCurrentMoment {
  return (
    typeof value === "string" &&
    crmLeadProfileCurrentMoments.includes(value as CrmLeadProfileCurrentMoment)
  );
}

export function isCrmLeadProfileStrategicTopic(
  value: unknown,
): value is CrmLeadProfileStrategicTopic {
  return (
    typeof value === "string" &&
    crmLeadProfileStrategicTopics.includes(
      value as CrmLeadProfileStrategicTopic,
    )
  );
}
