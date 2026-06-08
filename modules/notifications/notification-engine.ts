import {
  buildNotificationMessage,
  notificationTitles,
} from "@/modules/notifications/notification-templates";
import type {
  NotificationChannel,
  NotificationPayload,
  NotificationPayloadInput,
  NotificationPreference,
} from "@/modules/notifications/notification-types";

export const defaultNotificationPreference: NotificationPreference = {
  pushEnabled: false,
  pushPermission: "default",
  pushToken: null,
  whatsappEnabled: false,
  whatsappNumber: "",
  emailEnabled: false,
  emailAddress: "",
};

/*
 * Arquitetura compartilhavel:
 * EVOLV pode usar a camada para lembretes patrimoniais e operacionais.
 * LUMINA pode reutilizar a estrutura para consultas e retornos.
 * ARUZZ pode reutilizar para eventos, convites e acompanhamento curatorial.
 * ELEVARE pode reutilizar para tarefas, prazos e projetos.
 *
 * Este modulo apenas prepara payloads futuros. Nao envia push, WhatsApp,
 * e-mail, automacoes, chamadas externas ou dados para Supabase.
 */
export function buildNotificationPayload({
  channel,
  metadata = {},
  recipient = null,
  scheduledFor = null,
  templateInput,
  type,
}: NotificationPayloadInput): NotificationPayload {
  return {
    id: createNotificationId(),
    type,
    channel,
    status: scheduledFor ? "scheduled" : "pending",
    title: notificationTitles[type],
    message: buildNotificationMessage(type, templateInput),
    scheduledFor,
    recipient,
    metadata,
  };
}

export function getEnabledNotificationChannels(
  preference: NotificationPreference,
): NotificationChannel[] {
  const channels: NotificationChannel[] = [];

  if (preference.pushEnabled && preference.pushToken) {
    channels.push("push");
  }

  if (preference.whatsappEnabled && preference.whatsappNumber.trim()) {
    channels.push("whatsapp");
  }

  if (preference.emailEnabled && preference.emailAddress.trim()) {
    channels.push("email");
  }

  return channels;
}

export function buildNotificationPayloadsForEnabledChannels({
  input,
  preference,
}: {
  input: Omit<NotificationPayloadInput, "channel" | "recipient">;
  preference: NotificationPreference;
}) {
  return getEnabledNotificationChannels(preference).map((channel) =>
    buildNotificationPayload({
      ...input,
      channel,
      recipient: getRecipientForChannel(channel, preference),
    }),
  );
}

function getRecipientForChannel(
  channel: NotificationChannel,
  preference: NotificationPreference,
) {
  const recipients: Record<NotificationChannel, string | null> = {
    push: preference.pushToken,
    whatsapp: preference.whatsappNumber.trim() || null,
    email: preference.emailAddress.trim() || null,
  };

  return recipients[channel];
}

function createNotificationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
