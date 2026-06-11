# Sprint 73 - Escrita compartilhada dos leads no Supabase

## Objetivo

Permitir que edicoes dos dados principais dos leads sejam persistidas em `public.crm_leads` quando o CRM compartilhado estiver habilitado, mantendo fallback local e rollback por feature flag.

## Feature flag

A escrita compartilhada usa a mesma flag da leitura:

```text
NEXT_PUBLIC_USE_SUPABASE_CRM=true
```

Se a flag estiver ausente ou diferente de `true`, o CRM continua usando `localStorage`.

## Repository expandido

A interface `CrmRepository` agora possui:

```ts
list(): Promise<CrmLead[]>
getById(id: string): Promise<CrmLead | null>
updateLead(id: string, patch: Partial<CrmLead>): Promise<CrmLead | null>
```

## Implementacao local

`LocalCrmRepository` continua usando:

- `evolv.crm.v1`;
- `loadCrmLeads()`;
- `saveCrmLeads()`.

Nenhuma chave local foi apagada ou renomeada.

## Implementacao Supabase

`SupabaseCrmRepository.updateLead()`:

- atualiza somente `public.crm_leads`;
- mapeia `camelCase` para `snake_case`;
- atualiza `updated_at`;
- usa `NEXT_PUBLIC_SUPABASE_URL`;
- usa `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
- nao usa `SUPABASE_SERVICE_ROLE_KEY`;
- nao altera notas, atividades ou importacao PipeRun.

## Fallback

Se o update no Supabase falhar, o codigo:

1. registra aviso no console;
2. informa que pode ser necessaria policy de update em `public.crm_leads`;
3. usa fallback para `localStorage`.

O app nao tenta contornar RLS com service role.

## Fluxos alterados

Foram alterados apenas os fluxos principais de atualizacao de lead em `components/crm/crm-page.tsx`:

- salvar edicao de lead existente;
- mover lead entre pipeline/etapa.

Criacao de lead, notas, atividades, historico local e importacao PipeRun permanecem no comportamento anterior.

## Rollback

Para rollback imediato:

```text
NEXT_PUBLIC_USE_SUPABASE_CRM=false
```

Ou remover a variavel.

Com isso, leitura e update voltam ao `localStorage`.

## Fora do escopo

Nao foram migrados:

- login;
- usuarios;
- Supabase Auth;
- Simulacao Comercial;
- Multi-Cotas;
- PipeRun;
- importacao PipeRun;
- notas;
- atividades;
- relatorios;
- qualquer calculo financeiro.

## Confirmacoes

- Nenhum lead foi apagado.
- Nenhum dado local foi apagado.
- Service role nao foi usada no browser.
- A escrita compartilhada esta restrita aos dados principais de `crm_leads`.
- Rollback continua possivel pela feature flag.
