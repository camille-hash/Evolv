"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { fetchAdministrators } from "@/modules/administrators/client";
import type { Administrator } from "@/modules/administrators/types";

export function AdministratorSelect({
  disabled = false,
  label = "Administradora",
  onChange,
  value,
}: {
  disabled?: boolean;
  label?: string;
  onChange: (administratorId: string | null) => void;
  value: string | null;
}) {
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadAdministrators() {
      setIsLoading(true);
      setError(null);

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setIsLoading(false);
          setError("Nao foi possivel carregar as administradoras.");
        }
        return;
      }

      try {
        const loadedAdministrators = await fetchAdministrators(accessToken, {
          status: "active",
        });

        if (isActive) {
          setAdministrators(loadedAdministrators);
        }
      } catch {
        if (isActive) {
          setError("Nao foi possivel carregar as administradoras.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadAdministrators();

    return () => {
      isActive = false;
    };
  }, []);

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
          {isLoading ? "Carregando..." : "Selecione uma administradora"}
        </option>
        {administrators.map((administrator) => (
          <option key={administrator.id} value={administrator.id}>
            {administrator.name}
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
