import type { CrmMyDayView } from "../crm-my-day";

export async function fetchCrmMyDay(accessToken: string) {
  const response = await fetch("/api/crm/my-day", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    myDay?: CrmMyDayView;
  } | null;

  if (!response.ok || !payload?.myDay) {
    throw new Error(payload?.error ?? "Nao foi possivel carregar o Meu Dia.");
  }

  return payload.myDay;
}
