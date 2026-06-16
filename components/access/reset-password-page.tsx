"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  ensureSupabaseRecoverySession,
  updateSupabasePasswordForRecovery,
} from "@/modules/access";

const fieldInputClass =
  "h-11 rounded-md border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";

const securePasswordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const recoverySessionErrorMessage =
  "Nao foi possivel validar sua sessao de recuperacao. Solicite um novo link e tente novamente.";

export function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function validateRecoverySession() {
      setCheckingSession(true);
      setSessionError("");

      try {
        const result = await ensureSupabaseRecoverySession();

        if (!isMounted) {
          return;
        }

        if (!result.ok) {
          setSessionReady(false);
          setSessionError(result.error);
          return;
        }

        setSessionReady(true);
      } catch {
        if (!isMounted) {
          return;
        }

        setSessionReady(false);
        setSessionError(recoverySessionErrorMessage);
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    }

    void validateRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!sessionReady) {
      setError(sessionError || recoverySessionErrorMessage);
      return;
    }

    if (!newPassword.trim()) {
      setError("Informe a nova senha.");
      return;
    }

    if (!securePasswordPattern.test(newPassword)) {
      setError(
        "A nova senha deve ter no minimo 8 caracteres, pelo menos uma letra e pelo menos um numero.",
      );
      return;
    }

    if (newPassword !== confirmation) {
      setError("A confirmacao deve ser igual a nova senha.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateSupabasePasswordForRecovery(newPassword);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setNewPassword("");
      setConfirmation("");
      setSuccessMessage("Senha redefinida com sucesso. Voce ja pode voltar ao login.");
    } catch {
      setError("Nao foi possivel redefinir sua senha. Solicite um novo link e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBackToLogin() {
    window.location.assign("/");
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
              Redefinir senha
            </h1>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-muted-foreground">
          Informe uma nova senha para concluir a recuperacao de acesso pelo Supabase Auth.
        </p>

        {checkingSession ? (
          <p className="mt-5 rounded-md border border-primary/20 bg-primary/8 px-3 py-2 text-sm text-muted-foreground">
            Validando sua sessao de recuperacao...
          </p>
        ) : null}

        {!checkingSession && sessionError ? (
          <p className="mt-5 rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
            {sessionError}
          </p>
        ) : null}

        <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Nova senha
            </span>
            <input
              autoComplete="new-password"
              className={fieldInputClass}
              disabled={checkingSession || !sessionReady || isSubmitting || Boolean(successMessage)}
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
              disabled={checkingSession || !sessionReady || isSubmitting || Boolean(successMessage)}
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

          {successMessage ? (
            <p className="rounded-md border border-primary/20 bg-primary/8 px-3 py-2 text-sm text-muted-foreground">
              {successMessage}
            </p>
          ) : null}

          <Button
            className="h-11"
            disabled={checkingSession || !sessionReady || isSubmitting || Boolean(successMessage)}
            type="submit"
          >
            {checkingSession ? "Validando sessao..." : isSubmitting ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </form>

        <Button
          className="mt-4 w-full"
          onClick={handleBackToLogin}
          type="button"
          variant="secondary"
        >
          Voltar ao login
        </Button>
      </section>
    </main>
  );
}
