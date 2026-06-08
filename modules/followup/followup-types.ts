export type FollowUpEventType =
  | "boleto"
  | "assembleia"
  | "lance"
  | "contemplacao"
  | "personalizado";

export type FollowUpNotificationSettings = {
  pushEnabled: boolean;
  pushPermission: "default" | "granted" | "denied";
  pushToken: string | null;
};

export type FollowUpEvent = {
  id: string;
  titulo: string;
  tipo: FollowUpEventType;
  data: string;
  observacoes: string;
  concluido: boolean;
  notificationSettings?: FollowUpNotificationSettings;
};

export type FollowUpEventDraft = {
  id?: string | null;
  titulo: string;
  tipo: FollowUpEventType;
  data: string;
  observacoes: string;
  concluido?: boolean;
};

export type FollowUpSummary = {
  pendingCount: number;
  nextEvent: FollowUpEvent | null;
  daysUntilNextEvent: number | null;
};
