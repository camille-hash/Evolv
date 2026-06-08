import type {
  NotificationTemplateInput,
  NotificationType,
} from "@/modules/notifications/notification-types";

export const notificationTitles: Record<NotificationType, string> = {
  boleto_due: "Boleto",
  bid_deadline: "Lance",
  assembly_date: "Assembleia",
  contemplation: "Contemplacao",
  generic: "Lembrete",
};

export function buildNotificationMessage(
  type: NotificationType,
  input: NotificationTemplateInput = {},
) {
  const daysUntil = input.daysUntil ?? 0;
  const dateLabel = input.dateLabel ?? "";

  const templates: Record<NotificationType, string> = {
    boleto_due: `Seu boleto vence em ${daysUntil} dias.`,
    bid_deadline: `Prazo para envio de lance encerra em ${daysUntil} dias.`,
    assembly_date: `Assembleia agendada para ${dateLabel}.`,
    contemplation: "Sua carta foi contemplada.",
    generic: input.message ?? "Voce possui um novo lembrete.",
  };

  return templates[type];
}
