export type NotificationType =
  | "boleto_due"
  | "bid_deadline"
  | "assembly_date"
  | "contemplation"
  | "generic";

export type NotificationChannel = "push" | "whatsapp" | "email";

export type NotificationStatus =
  | "pending"
  | "scheduled"
  | "sent"
  | "failed";

export type NotificationPreference = {
  pushEnabled: boolean;
  pushPermission: "default" | "granted" | "denied";
  pushToken: string | null;
  whatsappEnabled: boolean;
  whatsappNumber: string;
  emailEnabled: boolean;
  emailAddress: string;
};

export type NotificationTemplateInput = {
  daysUntil?: number;
  dateLabel?: string;
  message?: string;
};

export type NotificationPayload = {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  title: string;
  message: string;
  scheduledFor: string | null;
  recipient: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

export type NotificationPayloadInput = {
  type: NotificationType;
  channel: NotificationChannel;
  templateInput?: NotificationTemplateInput;
  scheduledFor?: string | null;
  recipient?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};
