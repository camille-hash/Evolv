"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit3, Save, Trash2, X } from "lucide-react";
import {
  consolidatePortfolio,
  createEmptyPortfolioLetter,
  createEmptyPortfolioProperty,
  deletePortfolioLetter,
  deletePortfolioProperty,
  emptyPortfolioSnapshot,
  loadPortfolioSnapshot,
  upsertPortfolioLetter,
  upsertPortfolioProperty,
  type PortfolioLetter,
  type PortfolioProperty,
  type PortfolioSnapshot,
} from "@/modules/portfolio";

type PropertyFormState = {
  id: string;
  nome: string;
  valorAtual: string;
  rendaMensal: string;
  observacoes: string;
};

type LetterFormState = {
  id: string;
  administradora: string;
  valorCredito: string;
  contemplada: boolean;
  observacoes: string;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export function PortfolioPage() {
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot>(
    emptyPortfolioSnapshot,
  );
  const [propertyForm, setPropertyForm] = useState<PropertyFormState>(
    toPropertyFormState(createEmptyPortfolioProperty()),
  );
  const [letterForm, setLetterForm] = useState<LetterFormState>(
    toLetterFormState(createEmptyPortfolioLetter()),
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSnapshot(loadPortfolioSnapshot());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const consolidation = useMemo(
    () => consolidatePortfolio(snapshot),
    [snapshot],
  );

  return (
    <section className="grid gap-6">
      <section className="executive-surface rounded-md p-6 text-card-foreground sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Carteira patrimonial
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              Snapshot consolidado
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Registro local dos ativos que compoem a primeira leitura
              patrimonial do cliente.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Persistido em localStorage.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PortfolioMetric
            label="Imoveis"
            value={String(consolidation.totalImoveis)}
          />
          <PortfolioMetric
            label="Cartas"
            value={String(consolidation.totalCartas)}
          />
          <PortfolioMetric
            label="Patrimonio consolidado"
            value={currencyFormatter.format(
              consolidation.patrimonioConsolidado,
            )}
          />
          <PortfolioMetric
            label="Renda passiva consolidada"
            value={currencyFormatter.format(
              consolidation.rendaPassivaConsolidada,
            )}
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <PortfolioEditor
          actions={
            <>
              <SecondaryAction onClick={resetPropertyForm}>
                <X className="h-4 w-4" aria-hidden />
                Limpar
              </SecondaryAction>
              <PrimaryAction onClick={saveProperty}>
                <Save className="h-4 w-4" aria-hidden />
                Salvar imovel
              </PrimaryAction>
            </>
          }
          title="Imoveis"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <PortfolioInput
              label="Nome"
              onChange={(nome) => updatePropertyForm({ nome })}
              value={propertyForm.nome}
            />
            <PortfolioInput
              inputMode="decimal"
              label="Valor Atual"
              onChange={(valorAtual) => updatePropertyForm({ valorAtual })}
              value={propertyForm.valorAtual}
            />
            <PortfolioInput
              inputMode="decimal"
              label="Renda Mensal"
              onChange={(rendaMensal) => updatePropertyForm({ rendaMensal })}
              value={propertyForm.rendaMensal}
            />
            <PortfolioTextarea
              label="Observacoes"
              onChange={(observacoes) => updatePropertyForm({ observacoes })}
              value={propertyForm.observacoes}
            />
          </div>

          <div className="mt-5 grid gap-3">
            {snapshot.properties.length > 0 ? (
              snapshot.properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onDelete={() => removeProperty(property.id)}
                  onEdit={() => setPropertyForm(toPropertyFormState(property))}
                />
              ))
            ) : (
              <EmptyPortfolioState text="Nenhum imovel cadastrado." />
            )}
          </div>
        </PortfolioEditor>

        <PortfolioEditor
          actions={
            <>
              <SecondaryAction onClick={resetLetterForm}>
                <X className="h-4 w-4" aria-hidden />
                Limpar
              </SecondaryAction>
              <PrimaryAction onClick={saveLetter}>
                <Save className="h-4 w-4" aria-hidden />
                Salvar carta
              </PrimaryAction>
            </>
          }
          title="Cartas"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <PortfolioInput
              label="Administradora"
              onChange={(administradora) =>
                updateLetterForm({ administradora })
              }
              value={letterForm.administradora}
            />
            <PortfolioInput
              inputMode="decimal"
              label="Valor Credito"
              onChange={(valorCredito) => updateLetterForm({ valorCredito })}
              value={letterForm.valorCredito}
            />
            <label className="flex h-10 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium md:col-span-2">
              <input
                checked={letterForm.contemplada}
                className="h-4 w-4 accent-primary"
                onChange={(event) =>
                  updateLetterForm({ contemplada: event.target.checked })
                }
                type="checkbox"
              />
              Carta contemplada
            </label>
            <PortfolioTextarea
              label="Observacoes"
              onChange={(observacoes) => updateLetterForm({ observacoes })}
              value={letterForm.observacoes}
            />
          </div>

          <div className="mt-5 grid gap-3">
            {snapshot.letters.length > 0 ? (
              snapshot.letters.map((letter) => (
                <LetterCard
                  key={letter.id}
                  letter={letter}
                  onDelete={() => removeLetter(letter.id)}
                  onEdit={() => setLetterForm(toLetterFormState(letter))}
                />
              ))
            ) : (
              <EmptyPortfolioState text="Nenhuma carta cadastrada." />
            )}
          </div>
        </PortfolioEditor>
      </section>
    </section>
  );

  function updatePropertyForm(partialState: Partial<PropertyFormState>) {
    setPropertyForm((current) => ({ ...current, ...partialState }));
  }

  function updateLetterForm(partialState: Partial<LetterFormState>) {
    setLetterForm((current) => ({ ...current, ...partialState }));
  }

  function saveProperty() {
    const nextSnapshot = upsertPortfolioProperty(
      snapshot,
      toPortfolioProperty(propertyForm),
    );

    setSnapshot(nextSnapshot);
    resetPropertyForm();
  }

  function saveLetter() {
    const nextSnapshot = upsertPortfolioLetter(
      snapshot,
      toPortfolioLetter(letterForm),
    );

    setSnapshot(nextSnapshot);
    resetLetterForm();
  }

  function removeProperty(propertyId: string) {
    setSnapshot(deletePortfolioProperty(snapshot, propertyId));
  }

  function removeLetter(letterId: string) {
    setSnapshot(deletePortfolioLetter(snapshot, letterId));
  }

  function resetPropertyForm() {
    setPropertyForm(toPropertyFormState(createEmptyPortfolioProperty()));
  }

  function resetLetterForm() {
    setLetterForm(toLetterFormState(createEmptyPortfolioLetter()));
  }
}

function PortfolioEditor({
  actions,
  children,
  title,
}: {
  actions: React.ReactNode;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="executive-surface rounded-md p-5 text-card-foreground sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function PropertyCard({
  onDelete,
  onEdit,
  property,
}: {
  onDelete: () => void;
  onEdit: () => void;
  property: PortfolioProperty;
}) {
  return (
    <article className="rounded-md border bg-background/70 p-4">
      <PortfolioCardHeader
        title={property.nome || "Imovel sem nome"}
        onDelete={onDelete}
        onEdit={onEdit}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <PortfolioDetail
          label="Valor atual"
          value={currencyFormatter.format(property.valorAtual)}
        />
        <PortfolioDetail
          label="Renda mensal"
          value={currencyFormatter.format(property.rendaMensal)}
        />
      </div>
      {property.observacoes ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {property.observacoes}
        </p>
      ) : null}
    </article>
  );
}

function LetterCard({
  letter,
  onDelete,
  onEdit,
}: {
  letter: PortfolioLetter;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <article className="rounded-md border bg-background/70 p-4">
      <PortfolioCardHeader
        title={letter.administradora || "Carta sem administradora"}
        onDelete={onDelete}
        onEdit={onEdit}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <PortfolioDetail
          label="Credito"
          value={currencyFormatter.format(letter.valorCredito)}
        />
        <PortfolioDetail
          label="Status"
          value={letter.contemplada ? "Contemplada" : "Nao contemplada"}
        />
      </div>
      {letter.observacoes ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {letter.observacoes}
        </p>
      ) : null}
    </article>
  );
}

function PortfolioCardHeader({
  onDelete,
  onEdit,
  title,
}: {
  onDelete: () => void;
  onEdit: () => void;
  title: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h4 className="font-semibold text-foreground">{title}</h4>
      <div className="flex gap-2">
        <IconAction label="Editar" onClick={onEdit}>
          <Edit3 className="h-4 w-4" aria-hidden />
        </IconAction>
        <IconAction label="Excluir" onClick={onDelete}>
          <Trash2 className="h-4 w-4" aria-hidden />
        </IconAction>
      </div>
    </div>
  );
}

function PortfolioMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border bg-background/70 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
    </article>
  );
}

function PortfolioDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}

function EmptyPortfolioState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function PrimaryAction({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SecondaryAction({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium transition hover:border-primary/40 hover:bg-accent"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function IconAction({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function PortfolioInput({
  inputMode = "text",
  label,
  onChange,
  value,
}: {
  inputMode?: "decimal" | "text";
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        className="h-10 rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        inputMode={inputMode === "text" ? undefined : inputMode}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function PortfolioTextarea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium md:col-span-2">
      {label}
      <textarea
        className="min-h-24 rounded-md border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function toPortfolioProperty(formState: PropertyFormState): PortfolioProperty {
  return {
    id: formState.id,
    nome: formState.nome,
    valorAtual: parsePositiveNumber(formState.valorAtual),
    rendaMensal: parsePositiveNumber(formState.rendaMensal),
    observacoes: formState.observacoes,
  };
}

function toPortfolioLetter(formState: LetterFormState): PortfolioLetter {
  return {
    id: formState.id,
    administradora: formState.administradora,
    valorCredito: parsePositiveNumber(formState.valorCredito),
    contemplada: formState.contemplada,
    observacoes: formState.observacoes,
  };
}

function toPropertyFormState(property: PortfolioProperty): PropertyFormState {
  return {
    id: property.id,
    nome: property.nome,
    valorAtual: property.valorAtual ? String(property.valorAtual) : "",
    rendaMensal: property.rendaMensal ? String(property.rendaMensal) : "",
    observacoes: property.observacoes,
  };
}

function toLetterFormState(letter: PortfolioLetter): LetterFormState {
  return {
    id: letter.id,
    administradora: letter.administradora,
    valorCredito: letter.valorCredito ? String(letter.valorCredito) : "",
    contemplada: letter.contemplada,
    observacoes: letter.observacoes,
  };
}

function parsePositiveNumber(value: string) {
  const normalized = Number(value.replace(",", "."));

  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}
