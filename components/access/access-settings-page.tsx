"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Pencil, RotateCcw, ShieldCheck } from "lucide-react";
import { PiperunImportPage } from "@/components/crm/piperun-import-page";
import { Button } from "@/components/ui/button";
import {
  getEmptyUserInput,
  loadUsers,
  resetUserPassword,
  roleLabels,
  saveAccessUser,
  toggleUserActive,
  type User,
  type UserInput,
} from "@/modules/access";

const fieldInputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";

export function AccessSettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [draft, setDraft] = useState<UserInput>(getEmptyUserInput());
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setUsers(loadUsers());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUsers(saveAccessUser(draft, editingUserId ?? undefined));
    setDraft(getEmptyUserInput());
    setEditingUserId(null);
  }

  function handleEdit(user: User) {
    if (user.role === "admin") {
      return;
    }

    setEditingUserId(user.id);
    setDraft({
      nome: user.nome,
      usuario: user.usuario,
      senha: user.senha,
      role: "sdr",
      ativo: user.ativo,
    });
  }

  function handleCancelEdit() {
    setEditingUserId(null);
    setDraft(getEmptyUserInput());
  }

  return (
    <section className="grid gap-6">
      <section className="executive-surface rounded-md p-5 text-card-foreground sm:p-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Acesso
          </p>
          <h2 className="text-xl font-semibold">Gestao de usuarios</h2>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Controle local e provisório para Bruno e SDRs. Esta camada nao
            substitui autenticacao real e sera evoluida para Supabase Auth no
            futuro.
          </p>
        </div>
      </section>

      <section className="executive-surface rounded-md p-5 text-card-foreground sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
          <div>
            <h3 className="font-semibold">Criar ou editar SDR</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Administradores acessam toda a plataforma. SDRs acessam apenas
              Dashboard e CRM.
            </p>
          </div>
        </div>

        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <Field label="Nome">
            <input
              className={fieldInputClass}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  nome: event.target.value,
                }))
              }
              required
              value={draft.nome}
            />
          </Field>

          <Field label="Usuario">
            <input
              className={fieldInputClass}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  usuario: event.target.value,
                }))
              }
              required
              value={draft.usuario}
            />
          </Field>

          <Field label="Senha">
            <input
              className={fieldInputClass}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  senha: event.target.value,
                }))
              }
              required
              type="password"
              value={draft.senha}
            />
          </Field>

          <Field label="Perfil">
            <select className={fieldInputClass} disabled value={draft.role}>
              <option value="sdr">SDR</option>
            </select>
          </Field>

          <label className="flex items-center gap-3 text-sm font-medium text-foreground">
            <input
              checked={draft.ativo}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  ativo: event.target.checked,
                }))
              }
              type="checkbox"
            />
            Usuario ativo
          </label>

          <div className="flex flex-wrap gap-3 md:col-span-2">
            <Button type="submit">
              {editingUserId ? "Salvar SDR" : "Criar SDR"}
            </Button>
            {editingUserId ? (
              <Button onClick={handleCancelEdit} type="button" variant="ghost">
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="executive-surface rounded-md p-5 text-card-foreground sm:p-6">
        <h3 className="font-semibold">Usuarios cadastrados</h3>
        <div className="mt-5 grid gap-3">
          {users.map((user) => (
            <article
              className="grid gap-4 rounded-md border bg-background/70 p-4 lg:grid-cols-[1fr_auto]"
              key={user.id}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold text-foreground">{user.nome}</h4>
                  <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                    {roleLabels[user.role]}
                  </span>
                  <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                    {user.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Usuario: {user.usuario}
                </p>
              </div>

              {user.role === "sdr" ? (
                <div className="grid gap-2 sm:min-w-[360px]">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => handleEdit(user)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Editar
                    </Button>
                    <Button
                      onClick={() => setUsers(toggleUserActive(user.id))}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      {user.ativo ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      className={fieldInputClass}
                      onChange={(event) =>
                        setPasswordDrafts((currentDrafts) => ({
                          ...currentDrafts,
                          [user.id]: event.target.value,
                        }))
                      }
                      placeholder="Nova senha"
                      type="password"
                      value={passwordDrafts[user.id] ?? ""}
                    />
                    <Button
                      onClick={() => {
                        setUsers(
                          resetUserPassword(
                            user.id,
                            passwordDrafts[user.id] ?? "",
                          ),
                        );
                        setPasswordDrafts((currentDrafts) => ({
                          ...currentDrafts,
                          [user.id]: "",
                        }));
                      }}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                      Redefinir
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Administrador padrao protegido contra exclusao fisica.
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      <PiperunImportPage />
    </section>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}
