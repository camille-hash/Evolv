"use client";

import { requireSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import type { OperationsWorkbenchResponse } from "./types";

export async function fetchOperationsWorkbench(accessToken?: string | null) {
  const resolvedAccessToken =
    accessToken ??
    (await requireSupabaseAccessToken(
      "Sessao invalida para carregar a mesa de trabalho.",
    ));
  const response = await fetch("/api/operations/workbench", {
    headers: {
      Authorization: `Bearer ${resolvedAccessToken}`,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<OperationsWorkbenchResponse>)
    | null;

  if (!response.ok || !Array.isArray(payload?.buckets)) {
    throw new Error(
      payload?.error ?? "Nao foi possivel carregar a mesa de trabalho.",
    );
  }

  return {
    buckets: payload.buckets,
    generatedAt: payload.generatedAt ?? new Date().toISOString(),
  };
}
