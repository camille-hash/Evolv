"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  authenticateUser,
  changeUserPassword,
  clearLoginAttempts,
  getLoginAttemptBlockStatus,
  isSupabaseAuthEnabled,
  isUsingDefaultAdminPassword,
  registerFailedLoginAttempt,
  requestSupabasePasswordReset,
  saveCurrentUser,
  signInWithSupabaseAuth,
  type User,
} from "@/modules/access";

const fieldInputClass =
  "h-11 rounded-md border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";

const securePasswordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const invalidLoginMessage = "Usuario ou senha invalidos.";
const blockedLoginMessage =
  "Muitas tentativas invalidas. Tente novamente em alguns minutos.";

export function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const usingSupabaseAuth = isSupabaseAuthEnabled();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage("");

    if (usingSupabaseAuth) {
      setIsSubmitting(true);

      try {
        const result = await signInWithSupabaseAuth(usuario, senha);

        if (!result.user) {
          setError(result.error ?? invalidLoginMessage);
          return;
        }

        setError("");
        onLogin(result.user);
      } catch {
        setError("Nao foi possivel acessar agora. Tente novamente em instantes.");
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    const blockStatus = getLoginAttemptBlockStatus(usuario);

    if (blockStatus.blocked) {
      setError(formatBlockedLoginMessage(blockStatus.remainingMinutes));
      return;
    }

    const user = authenticateUser(usuario, senha);

    if (!user) {
      const nextBlockStatus = registerFailedLoginAttempt(usuario);

      setError(
        nextBlockStatus.blocked
          ? formatBlockedLoginMessage(nextBlockStatus.remainingMinutes)
          : invalidLoginMessage,
      );
      return;
    }

    clearLoginAttempts(usuario);
    saveCurrentUser(user);
    setError("");
    onLogin(user);
  }

  async function handlePasswordReset() {
    setError("");
    setSuccessMessage("");

    if (!usuario.trim()) {
      setError("Informe seu e-mail para solicitar a recuperacao de senha.");
      return;
    }

    setIsSubmitting(true);

    try {
      await requestSupabasePasswordReset(usuario);
      setSuccessMessage(
        "Se o e-mail estiver cadastrado, voce recebera instrucoes para redefinir sua senha.",
      );
    } catch {
      setSuccessMessage(
        "Se o e-mail estiver cadastrado, voce recebera instrucoes para redefinir sua senha.",
      );
    } finally {
      setIsSubmitting(false);
    }
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
          {usingSupabaseAuth
            ? "Entre com seu e-mail para acessar a plataforma operacional."
            : "Entre com seu usuario para acessar a plataforma operacional."}
        </p>

        <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {usingSupabaseAuth ? "E-mail" : "Usuario"}
            </span>
            <input
              autoComplete={usingSupabaseAuth ? "email" : "username"}
              className={fieldInputClass}
              onChange={(event) => {
                setUsuario(event.target.value);
                setError("");
              }}
              type={usingSupabaseAuth ? "email" : "text"}
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

          {successMessage ? (
            <p className="rounded-md border border-primary/20 bg-primary/8 px-3 py-2 text-sm text-muted-foreground">
              {successMessage}
            </p>
          ) : null}

          <Button className="h-11" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        {usingSupabaseAuth ? (
          <div className="mt-5 grid gap-3">
            <button
              className="text-left text-xs font-medium text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              onClick={handlePasswordReset}
              type="button"
            >
              Esqueci minha senha
            </button>
            <p className="rounded-md border bg-background/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
              Acesso protegido por Supabase Auth. A recuperacao de senha envia
              instrucoes apenas se o e-mail estiver cadastrado.
            </p>
          </div>
        ) : (
          <p className="mt-5 rounded-md border bg-background/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
            Acesso local provisorio. Usuarios iniciais: Camille (admin), Bruno
            (bruno) e SDRs (sdr1 a sdr5). Altere a senha inicial imediatamente
            apos entrar.
          </p>
        )}
      </section>
    </main>
  );
}

export function RequiredPasswordChangePage({
  onPasswordChanged,
  user,
}: {
  onPasswordChanged: (user: User) => void;
  user: User;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!securePasswordPattern.test(newPassword)) {
      setError(
        "A nova senha deve ter no minimo 8 caracteres, pelo menos uma letra e pelo menos um numero.",
      );
      return;
    }

    if (newPassword === user.senha) {
      setError("A nova senha nao pode ser igual a senha atual.");
      return;
    }

    if (newPassword !== confirmation) {
      setError("A confirmacao deve ser igual a nova senha.");
      return;
    }

    const updatedUser = changeUserPassword(user.id, newPassword);

    if (!updatedUser) {
      setError("Nao foi possivel salvar a nova senha.");
      return;
    }

    setError("");
    onPasswordChanged(updatedUser);
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
              Alterar senha de acesso
            </h1>
          </div>
        </div>

        <p className="mt-5 rounded-md border bg-background/70 px-3 py-2 text-sm leading-6 text-muted-foreground">
          Por seguranca, altere sua senha antes de acessar a plataforma.
        </p>

        <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Nova senha
            </span>
            <input
              autoComplete="new-password"
              className={fieldInputClass}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setError("");
              }}
              type="password"
              value={newPassword}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Confirmar nova senha
            </span>
            <input
              autoComplete="new-password"
              className={fieldInputClass}
              onChange={(event) => {
                setConfirmation(event.target.value);
                setError("");
              }}
              type="password"
              value={confirmation}
            />
          </label>

          {error ? (
            <p className="rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button className="h-11" type="submit">
            Salvar nova senha
          </Button>
        </form>
      </section>
    </main>
  );
}

export function DefaultPasswordAlert({ user }: { user: User }) {
  if (!isUsingDefaultAdminPassword(user) && !user.mustChangePassword) {
    return null;
  }

  return (
    <div className="mb-6 rounded-md border border-brand-gold/40 bg-card px-4 py-3 text-sm text-muted-foreground">
      Senha temporaria ativa. Recomenda-se alterar imediatamente para uso
      interno da equipe.
    </div>
  );
}

function formatBlockedLoginMessage(remainingMinutes: number) {
  return `${blockedLoginMessage} Tempo aproximado: ${remainingMinutes} min.`;
}
