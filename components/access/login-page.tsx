"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  authenticateUser,
  isUsingDefaultAdminPassword,
  saveCurrentUser,
  type User,
} from "@/modules/access";

const fieldInputClass =
  "h-11 rounded-md border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";

export function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const user = authenticateUser(usuario, senha);

    if (!user) {
      setError("Usuario ou senha invalidos.");
      return;
    }

    saveCurrentUser(user);
    setError("");
    onLogin(user);
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
              Acesso da equipe
            </h1>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-muted-foreground">
          Entre com seu usuario para acessar a plataforma operacional.
        </p>

        <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Usuario
            </span>
            <input
              autoComplete="username"
              className={fieldInputClass}
              onChange={(event) => {
                setUsuario(event.target.value);
                setError("");
              }}
              value={usuario}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Senha
            </span>
            <input
              autoComplete="current-password"
              className={fieldInputClass}
              onChange={(event) => {
                setSenha(event.target.value);
                setError("");
              }}
              type="password"
              value={senha}
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

        <p className="mt-5 rounded-md border bg-background/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
          Acesso local provisório. O administrador padrao e Bruno, usuario
          admin. Altere a senha inicial imediatamente apos entrar.
        </p>
      </section>
    </main>
  );
}

export function DefaultPasswordAlert({ user }: { user: User }) {
  if (!isUsingDefaultAdminPassword(user)) {
    return null;
  }

  return (
    <div className="mb-6 rounded-md border border-brand-gold/40 bg-card px-4 py-3 text-sm text-muted-foreground">
      Senha padrao de administrador ativa. Recomenda-se alterar imediatamente
      para uso interno da equipe.
    </div>
  );
}

