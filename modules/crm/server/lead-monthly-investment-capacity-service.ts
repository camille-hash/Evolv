import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  projectMonthlyInvestmentCapacity,
  type LeadMonthlyInvestmentCapacityProjection,
} from "../monthly-investment-capacity";

type RpcClient = Pick<SupabaseClient, "auth" | "rpc">;

export type LeadMonthlyInvestmentCapacityResult =
  | ({ ok: true } & LeadMonthlyInvestmentCapacityProjection)
  | { error: string; ok: false; status: number };

const genericAccessError =
  "Nao foi possivel consultar a capacidade de investimento mensal.";

export async function getLeadMonthlyInvestmentCapacity(
  accessToken: string | null,
  leadId: string,
): Promise<LeadMonthlyInvestmentCapacityResult> {
  if (!accessToken) {
    return { error: genericAccessError, ok: false, status: 401 };
  }

  try {
    const supabase = createServerSupabaseClient(accessToken);
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return { error: genericAccessError, ok: false, status: 401 };
    }

    const { data, error } = await supabase.rpc(
      "get_lead_monthly_investment_capacity",
      { p_lead_id: leadId },
    );

    if (error) {
      return { error: genericAccessError, ok: false, status: 500 };
    }

    return {
      monthlyInvestmentCapacity: projectMonthlyInvestmentCapacity(data),
      ok: true,
    };
  } catch {
    return { error: genericAccessError, ok: false, status: 500 };
  }
}

function createServerSupabaseClient(accessToken: string): RpcClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase server environment is not configured.");
  }

  return createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}
