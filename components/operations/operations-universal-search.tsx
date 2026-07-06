"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchOperations } from "@/modules/operations/search-client";
import type {
  OperationsSearchCategory,
  OperationsSearchGroup,
  OperationsSearchResponse,
} from "@/modules/operations/search-types";

const minSearchLength = 2;
const debounceMs = 250;

export function OperationsUniversalSearch() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<OperationsSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const normalizedQuery = query.trim();
  const shouldSearch = normalizedQuery.length >= minSearchLength;

  useEffect(() => {
    if (!shouldSearch) {
      return;
    }

    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);
      setError(null);

      void searchOperations(normalizedQuery)
        .then((result) => {
          if (isActive) {
            setResponse(result);
          }
        })
        .catch((loadError) => {
          if (isActive) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Nao foi possivel pesquisar na operacao.",
            );
            setResponse(null);
          }
        })
        .finally(() => {
          if (isActive) {
            setIsLoading(false);
          }
        });
    }, debounceMs);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [normalizedQuery, shouldSearch]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const groups = response?.groups ?? [];
  const totalResults = response?.totalResults ?? 0;
  const isPanelVisible = isOpen && normalizedQuery.length > 0;
  const helperText = useMemo(() => {
    if (!normalizedQuery) {
      return "Busque clientes, contratos, administradoras, receitas e recebimentos.";
    }

    if (normalizedQuery.length < minSearchLength) {
      return "Digite pelo menos 2 caracteres para pesquisar.";
    }

    if (isLoading) {
      return "Pesquisando na operacao...";
    }

    if (error) {
      return error;
    }

    if (totalResults === 0) {
      return "Nenhum resultado encontrado para esta busca.";
    }

    return `${totalResults} resultado(s) encontrado(s).`;
  }, [error, isLoading, normalizedQuery, totalResults]);

  return (
    <div className="relative w-full max-w-2xl" ref={containerRef}>
      <label className="block">
        <span className="sr-only">Busca universal da operacao</span>
        <input
          className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          onChange={(event) => {
            const nextValue = event.target.value;
            setQuery(nextValue);
            if (nextValue.trim().length < minSearchLength) {
              setResponse(null);
              setError(null);
              setIsLoading(false);
            }
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar clientes, contratos, administradoras e recebimentos"
          type="search"
          value={query}
        />
      </label>
      <p className="mt-2 px-1 text-xs text-slate-500">{helperText}</p>

      {isPanelVisible ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {error ? (
            <div className="p-4 text-sm text-rose-700">{error}</div>
          ) : groups.length ? (
            <div className="max-h-[28rem] overflow-y-auto p-3">
              <div className="grid gap-3">
                {groups.map((group) => (
                  <SearchGroupPanel
                    group={group}
                    key={group.id}
                    onNavigate={() => setIsOpen(false)}
                  />
                ))}
              </div>
            </div>
          ) : shouldSearch && !isLoading ? (
            <div className="p-4 text-sm text-slate-600">
              Nenhum resultado encontrado para esta busca.
            </div>
          ) : (
            <div className="p-4 text-sm text-slate-600">
              Continue digitando para pesquisar na operacao.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SearchGroupPanel({
  group,
  onNavigate,
}: {
  group: OperationsSearchGroup;
  onNavigate: () => void;
}) {
  return (
    <section className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {group.label}
        </h2>
        <span className="text-xs text-slate-400">
          {group.items.length} item(ns)
        </span>
      </div>
      <div className="grid gap-2">
        {group.items.map((item) => (
          <Link
            className="rounded-xl border border-transparent bg-white px-4 py-3 transition hover:border-slate-200 hover:bg-slate-50"
            href={item.href}
            key={`${group.id}-${item.id}`}
            onClick={onNavigate}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p>
              </div>
              <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
                {resolveCategoryLabel(item.type)}
              </span>
            </div>
            {item.identifier ? (
              <p className="mt-2 text-xs text-slate-400">{item.identifier}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}

function resolveCategoryLabel(type: OperationsSearchCategory) {
  if (type === "clients") {
    return "Cliente";
  }

  if (type === "contracts") {
    return "Contrato";
  }

  if (type === "administrators") {
    return "Administradora";
  }

  if (type === "revenues") {
    return "Receita";
  }

  return "Recebimento";
}
