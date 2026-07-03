"use client";

import { createClient } from "@supabase/supabase-js";

let browserSupabaseClient: ReturnType<typeof createClient> | null = null;

export async function readSupabaseAccessToken() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    return null;
  }

  browserSupabaseClient ??= createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });

  const { data, error } = await browserSupabaseClient.auth.getSession();

  if (error || !data.session?.access_token) {
    return null;
  }

  return data.session.access_token;
}

export async function requireSupabaseAccessToken(
  message = "Sessao invalida.",
) {
  const accessToken = await readSupabaseAccessToken();

  if (!accessToken) {
    throw new Error(message);
  }

  return accessToken;
}
