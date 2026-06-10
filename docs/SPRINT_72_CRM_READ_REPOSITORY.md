# Sprint 72 - CRM compartilhado somente leitura via Supabase

## Objetivo

Permitir que a listagem principal do CRM leia leads do Supabase/Postgres em modo somente leitura, mantendo fallback seguro para `localStorage`.

O EVOLV continua com escrita local e rollback imediato.

## Feature flag

A leitura via Supabase so e ativada quando:

```text
NEXT_PUBLIC_USE_SUPABASE_CRM=true
```

Variaveis client-side esperadas:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_USE_SUPABASE_CRM
```

Se a flag estiver ausente ou diferente de `true`, a listagem continua usando `localStorage`.

## Repository criado

Arquivos:

- `modules/crm/repositories/crm-repository.ts`
- `modules/crm/repositories/local-crm-repository.ts`
- `modules/crm/repositories/supabase-crm-repository.ts`
- `modules/crm/repositories/index.ts`

Interface minima:

```ts
type CrmRepository = {
  list(): Promise<CrmLead[]>;
  getById(id: string): Promise<CrmLead | null>;
};
```

## Implementacao localStorage

`LocalCrmRepository` reaproveita:

```text
loadCrmLeads()
```

Ou seja:

- nao altera formato local;
- nao altera a chave `evolv.crm.v1`;
- nao apaga dados;
- nao modifica leads.

## Implementacao Supabase

`SupabaseCrmRepository`:

- le somente a tabela `public.crm_leads`;
- usa apenas `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
- nao usa `SUPABASE_SERVICE_ROLE_KEY`;
- mapeia `snake_case` do banco para `camelCase` do `CrmLead`;
- nao implementa escrita;
- nao altera leads.

## Fallback

O seletor `listCrmLeadsFromRepository()` funciona assim:

1. Se a feature flag nao estiver ativa, usa `localStorage`.
2. Se a feature flag estiver ativa, tenta Supabase.
3. Se Supabase falhar, usa `localStorage`.

Isso permite rollback imediato desligando:

```text
NEXT_PUBLIC_USE_SUPABASE_CRM=false
```

## RLS e seguranca

Se a leitura Supabase falhar por RLS/policy, o app nao tenta contornar com service role.

Nesse caso, a correcao deve ser feita manualmente ou em sprint separada no Supabase, criando uma policy de leitura para `anon` ou para usuario autenticado, conforme o modelo de seguranca definido.

## Escopo preservado

Nao foram alterados:

- importacao PipeRun;
- Simulacao Comercial;
- Multi-Cotas;
- login;
- usuarios;
- Supabase Auth;
- notas;
- atividades;
- mudanca de etapa;
- edicao/criacao/exclusao de leads.

A escrita do CRM continua local/intocada.
