import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  projectLeadMetaDeclarations,
  type LeadMetaDeclarations,
} from "../meta-declarations";

export type LeadMetaDeclarationsRpcClient = Pick<SupabaseClient, "auth" | "rpc">;
type RpcClientFactory = (accessToken: string) => LeadMetaDeclarationsRpcClient;

export type LeadMetaDeclarationsResult =
  | ({ ok: true } & LeadMetaDeclarations)
  | { error: string; ok: false; status: number };

const genericAccessError =
  "Nao foi possivel consultar a capacidade de investimento mensal.";

export async function getLeadMetaDeclarations(
  accessToken: string | null,
  leadId: string,
  createRpcClient: RpcClientFactory = createServerSupabaseClient,
): Promise<LeadMetaDeclarationsResult> {
  if (!accessToken) {
    return { error: genericAccessError, ok: false, status: 401 };
  }

  try {
    const supabase = createRpcClient(accessToken);
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return { error: genericAccessError, ok: false, status: 401 };
    }

    const { data, error } = await supabase.rpc(
      "get_lead_meta_declarations",
      { p_lead_id: leadId },
    );

    if (error || !Array.isArray(data) || data.length !== 1) {
      return { error: genericAccessError, ok: false, status: 500 };
    }

    return {
      ...projectLeadMetaDeclarations(data[0]),
      ok: true,
    };
  } catch {
    return { error: genericAccessError, ok: false, status: 500 };
  }
}

function createServerSupabaseClient(
  accessToken: string,
): LeadMetaDeclarationsRpcClient {
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
