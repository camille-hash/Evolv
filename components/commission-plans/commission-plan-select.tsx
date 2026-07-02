"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { fetchCommissionPlans } from "@/modules/commission-plans/client";
import type { CommissionPlan } from "@/modules/commission-plans/types";

export function CommissionPlanSelect({
  administratorId = null,
  disabled = false,
  label = "Plano de comissao",
  onChange,
  value,
}: {
  administratorId?: string | null;
  disabled?: boolean;
  label?: string;
  onChange: (commissionPlanId: string | null) => void;
  value: string | null;
}) {
  const [commissionPlans, setCommissionPlans] = useState<CommissionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadCommissionPlans() {
      setIsLoading(true);
      setError(null);

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setIsLoading(false);
          setError("Nao foi possivel carregar os planos de comissao.");
        }
        return;
      }

      try {
        const loadedCommissionPlans = await fetchCommissionPlans(accessToken, {
          administratorId,
          status: "active",
        });

        if (isActive) {
          setCommissionPlans(loadedCommissionPlans);
        }
      } catch {
        if (isActive) {
          setError("Nao foi possivel carregar os planos de comissao.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadCommissionPlans();

    return () => {
      isActive = false;
    };
  }, [administratorId]);

  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      {label}
      <select
        className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled || isLoading}
        onChange={(event) => onChange(event.target.value || null)}
        value={value ?? ""}
      >
        <option value="">
          {isLoading ? "Carregando..." : "Selecione um plano de comissao"}
        </option>
        {commissionPlans.map((commissionPlan) => (
          <option key={commissionPlan.id} value={commissionPlan.id}>
            {commissionPlan.name}
          </option>
        ))}
      </select>
      {error ? (
        <span className="text-xs font-normal text-muted-foreground">
          {error}
        </span>
      ) : null}
    </label>
  );
}

async function readSupabaseAccessToken() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    return null;
  }

  return data.session.access_token;
}
