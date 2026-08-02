const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const longDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeZone: "UTC",
});

export function formatCurrencyFromCents(cents: number) {
  return currencyFormatter.format(cents / 100);
}

export function formatLongDate(isoDate: string) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return longDateFormatter.format(date);
}

export function formatQuotaCount(count: number) {
  return count === 1 ? "1 cota" : `${count} cotas`;
}

export function formatMonth(month: number) {
  return `Mês ${month}`;
}

export function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
