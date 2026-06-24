import type {
  CrmLead,
  CrmLeadProfile,
  CrmLeadSimulation,
} from "@/modules/crm";

export type ClientContext = {
  nome: string;
  telefone: string;
  email: string;
  perfil: string;
  patrimonioAtual: number;
  metaPatrimonial: number;
  rendaAtual: number;
  metaRenda: number;
  prazoMeta: number;
  observacoes: string;
};

export type ClientStrategicProfileBridge = {
  currentMoment: CrmLeadProfile["currentMoment"];
  primaryGoal: CrmLeadProfile["primaryGoal"];
  strategicNotes: string | null;
  strategicTopics: CrmLeadProfile["strategicTopics"];
};

export type ClientCommercialArtifactSummary = {
  commercialCredit: number | null;
  createdAt: string;
  id: string;
  monthlyPayment: number | null;
  simulationType: CrmLeadSimulation["simulationType"];
  title: string;
};

export type ClientRecord = {
  context: ClientContext;
  convertedAt: string;
  convertedByName: string;
  convertedByUserId: string | null;
  createdAt: string;
  id: string;
  latestCommercialSimulation: ClientCommercialArtifactSummary | null;
  latestMultiCotasStudy: ClientCommercialArtifactSummary | null;
  leadId: string;
  strategicProfile: ClientStrategicProfileBridge;
  updatedAt: string;
};

export type ClientConversionEvent = {
  clientId: string;
  contextSnapshot: ClientContext;
  convertedAt: string;
  convertedByName: string;
  convertedByUserId: string | null;
  id: string;
  latestCommercialSimulation: ClientCommercialArtifactSummary | null;
  latestMultiCotasStudy: ClientCommercialArtifactSummary | null;
  leadId: string;
  leadName: string;
  strategicProfile: ClientStrategicProfileBridge;
};

export type ConvertLeadToClientInput = {
  convertedBy: {
    name: string;
    userId: string | null;
  };
  latestCommercialSimulation?: Pick<
    CrmLeadSimulation,
    | "commercialCredit"
    | "createdAt"
    | "id"
    | "monthlyPayment"
    | "simulationType"
    | "title"
    | "totalCredit"
    | "updatedCredit"
  > | null;
  latestMultiCotasStudy?: Pick<
    CrmLeadSimulation,
    | "commercialCredit"
    | "createdAt"
    | "id"
    | "monthlyPayment"
    | "simulationType"
    | "title"
    | "totalCredit"
    | "updatedCredit"
  > | null;
  lead: Pick<CrmLead, "email" | "id" | "nome" | "telefone">;
  strategicProfile?: Pick<
    CrmLeadProfile,
    "currentMoment" | "primaryGoal" | "strategicNotes" | "strategicTopics"
  > | null;
};

