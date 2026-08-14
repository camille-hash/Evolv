const leadEntryDateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
  year: "numeric",
});

export function formatCrmLeadEntryDateTime(
  value: string | null | undefined,
) {
  if (!value?.trim()) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = leadEntryDateTimeFormatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const day = read("day");
  const month = read("month");
  const year = read("year");
  const hour = read("hour");
  const minute = read("minute");

  if (!day || !month || !year || !hour || !minute) {
    return null;
  }

  return `Entrada: ${day}/${month}/${year} às ${hour}:${minute}`;
}
