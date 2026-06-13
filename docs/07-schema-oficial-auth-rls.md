# Schema Oficial Auth + RLS

Este documento consolida as decisoes oficiais da Sprint 88 para orientar a migracao do EVOLV para Supabase Auth, profiles e RLS sem ambiguidade de schema.

## Decisoes Oficiais

- Padrao oficial de empresa: `organizations` / `organization_id`.
- Padrao oficial de profile: `profiles.id = auth.users.id`.
- CRM oficial: `crm_leads` com `organization_id`, `assigned_profile_id` e campos atuais em portugues/snake_case.
- Roles oficiais iniciais: `admin` e `sdr`.
- RLS deve comecar por `profiles` e `crm_leads`.
- Migrations antigas devem ser tratadas como legado e nao devem ser editadas.

## Padrao De Empresa

O EVOLV deve usar `organizations` como entidade raiz de tenant e `organization_id` como chave de isolamento em tabelas operacionais.

Nao usar `companies` ou `company_id` em novas tabelas de Auth/CRM. Esses nomes aparecem em migrations antigas e passam a ser considerados legado.

## Padrao De Profiles

O EVOLV deve usar:

```sql
profiles.id = auth.users.id
```

Esse padrao reduz duplicidade entre usuario autenticado e perfil operacional, simplifica RLS com `auth.uid()` e evita uma tabela `public.users` paralela ao Supabase Auth.

## Schema Oficial De `profiles`

Campos minimos:

- `id uuid primary key references auth.users(id) on delete cascade`
- `organization_id uuid not null references organizations(id) on delete cascade`
- `name text not null`
- `email text not null`
- `role text not null check (role in ('admin', 'sdr'))`
- `is_active boolean not null default true`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

`must_change_password` nao deve ser o pilar principal do novo Auth. A troca de senha inicial deve ser tratada pelo fluxo de convite/recuperacao do Supabase Auth ou por uma decisao posterior de produto.

## Schema Oficial De `crm_leads`

Campos minimos:

- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null references organizations(id) on delete cascade`
- `assigned_profile_id uuid null references profiles(id) on delete set null`
- `external_id text null`
- `source_system text null default 'evolv'`
- `nome text not null`
- `telefone text null`
- `email text null`
- `pais text null`
- `origem text null`
- `consultor text null`
- `valor_pretendido numeric not null default 0`
- `observacoes text null`
- `pipeline text null`
- `etapa text null`
- `tags text[] not null default '{}'`
- `produto_interesse text null`
- `temperatura text not null default 'morna'`
- `status text not null default 'ativa'`
- `proxima_acao text null`
- `data_proxima_acao date null`
- `closed_at timestamptz null`
- `titulo_oportunidade text null`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

## Roles Oficiais

Roles iniciais:

- `admin`: acesso administrativo e operacional completo dentro da propria organizacao.
- `sdr`: acesso operacional restrito ao CRM e rotinas permitidas pela UI.

Nao criar `consultor` nesta fase. Se a operacao exigir separacao futura entre closer, SDR e administrador, essa role deve entrar por decisao formal posterior.

## Ordem De RLS

Prioridade recomendada:

1. `profiles`
2. `crm_leads`
3. `crm_notes`, `crm_activities` e `crm_stage_changes`
4. `crm_import_batches` e tabelas de auditoria
5. propostas/simulacoes compartilhadas
6. demais modulos patrimoniais

## Regras Proibidas

- Nao usar `companies` em novas tabelas de Auth/CRM.
- Nao usar `company_id` em novas tabelas de Auth/CRM.
- Nao criar `public.users` para Auth.
- Nao criar nova `crm_leads` divergente.
- Nao reescrever CRM sem decisao formal.
- Nao expor policies abertas como `using (true)`.
- Nao usar `service_role` no browser.
- Nao editar migrations antigas para corrigir drift.

## Estrategia De Migration

A migration consolidada da Sprint 89 deve ser aditiva e conservadora:

- cria/garante `organizations`;
- cria/garante `profiles` no padrao `auth.users`;
- cria/garante `crm_leads` no schema oficial;
- cria indices obrigatorios;
- habilita RLS em `profiles` e `crm_leads`;
- cria policies minimas para usuarios autenticados com profile ativo;
- nao apaga dados;
- nao dropa tabelas;
- nao conecta Supabase Auth na UI.

Em bancos que ja receberam migrations antigas, o schema legado pode exigir backfill e validacao posterior antes de tornar constraints historicas totalmente estritas. Essa etapa deve ser tratada em sprint separada, com plano de rollback.
