"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

export function PrimaryJourneyAction({
  onSelectCommercialSimulation,
  onSelectMultiCotas,
  onSelectReferenceCapitalStrategy,
}: {
  onSelectCommercialSimulation: () => void;
  onSelectMultiCotas: () => void;
  onSelectReferenceCapitalStrategy?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  function handleSelect(action: () => void) {
    setIsOpen(false);
    action();
  }

  return (
    <div className="fixed right-5 top-1/2 z-40 -translate-y-1/2">
      <div className="group relative flex items-center">
        <span
          className="pointer-events-none absolute right-[calc(100%+0.75rem)] hidden whitespace-nowrap rounded-md border bg-popover px-3 py-2 text-xs font-medium text-popover-foreground shadow-sm group-hover:block group-focus-within:block"
          role="tooltip"
        >
          Novo Estudo Patrimonial
        </span>
        {isOpen ? (
          <div className="absolute right-[calc(100%+0.75rem)] top-1/2 w-80 -translate-y-1/2 rounded-md border bg-popover p-4 text-popover-foreground shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Novo Estudo Patrimonial
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Escolha qual estrategia deseja iniciar.
            </p>
            <div className="mt-4 grid gap-2">
              <button
                className="rounded-md border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                onClick={() => handleSelect(onSelectCommercialSimulation)}
                type="button"
              >
                <span className="text-sm font-semibold text-foreground">
                  Simulacao Comercial
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  Estrategia utilizando uma unica carta.
                </span>
              </button>
              <button
                className="rounded-md border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                onClick={() => handleSelect(onSelectMultiCotas)}
                type="button"
              >
                <span className="text-sm font-semibold text-foreground">
                  Estrategia Multi-Cotas
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  Planejamento patrimonial utilizando multiplas cartas.
                </span>
              </button>
              {onSelectReferenceCapitalStrategy ? (
                <button
                  className="rounded-md border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => handleSelect(onSelectReferenceCapitalStrategy)}
                  type="button"
                >
                  <span className="text-sm font-semibold text-foreground">
                    Estrategia Patrion Asset
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    Grupo Exclusivo Referencia Capital com composicao
                    obrigatoriamente Multi-Cotas.
                  </span>
                </button>
              ) : null}
            </div>
            <button
              className="mt-3 text-xs font-medium text-muted-foreground transition hover:text-foreground"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              Cancelar
            </button>
          </div>
        ) : null}
        <button
          aria-expanded={isOpen}
          aria-label="Novo Estudo Patrimonial"
          className="grid h-14 w-14 place-items-center rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => setIsOpen((current) => !current)}
          title="Novo Estudo Patrimonial"
          type="button"
        >
          <Plus className="h-6 w-6" aria-hidden />
        </button>
      </div>
    </div>
  );
}
