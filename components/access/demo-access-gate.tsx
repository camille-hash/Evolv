"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

const DEMO_ACCESS_STORAGE_KEY = "evolv.demo.access.granted";
const demoAccessPassword = process.env.NEXT_PUBLIC_DEMO_ACCESS_PASSWORD;

export function DemoAccessGate({ children }: { children: ReactNode }) {
  const requiresPassword = Boolean(demoAccessPassword);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [accessGranted, setAccessGranted] = useState(() => {
    if (!requiresPassword) {
      return true;
    }

    if (typeof window === "undefined") {
      return false;
    }

    return (
      window.sessionStorage.getItem(DEMO_ACCESS_STORAGE_KEY) === "true"
    );
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password === demoAccessPassword) {
      window.sessionStorage.setItem(DEMO_ACCESS_STORAGE_KEY, "true");
      setAccessGranted(true);
      setError("");
      return;
    }

    setError("Senha invalida.");
  }

  if (accessGranted) {
    return children;
  }

  return (
    <main className="grid min-h-screen place-items-center p-5">
      <section className="executive-surface w-full max-w-md rounded-md p-7 text-card-foreground sm:p-8">
        <div className="flex items-center gap-3">
          <div className="brand-mark" aria-hidden>
            EV
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              EVOLV Intelligence
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">
              Acesso restrito
            </h1>
          </div>
        </div>

        <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Senha
            </span>
            <input
              autoComplete="current-password"
              className="h-11 rounded-md border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              type="password"
              value={password}
            />
          </label>

          {error ? (
            <p className="rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button className="h-11" type="submit">
            Entrar
          </Button>
        </form>
      </section>
    </main>
  );
}
