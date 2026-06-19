# Sprint 103A.30 - Lead-Centric Simulation SQL Package Creation

## Objetivo

Criar os arquivos SQL necessarios para implantacao futura da persistencia lead-centric de simulacoes em:

```text
public.crm_lead_simulations
```

Esta sprint cria artefatos SQL revisaveis, mas nenhum SQL foi executado.

## Arquivos criados

- `supabase/sql/20260619_sprint103a30_lead_simulations_apply.sql`
- `supabase/sql/20260619_sprint103a30_lead_simulations_validation.sql`
- `supabase/sql/20260619_sprint103a30_lead_simulations_rollback.sql`
- `docs/96-sprint-103a30-lead-centric-simulation-sql-package-creation.md`

## Arquivos alterados

- Nenhum arquivo existente foi alterado.

## Resumo do apply

O apply cria a tabela:

```text
public.crm_lead_simulations
```

Com:

- identidade e escopo: `id`, `organization_id`, `lead_id`;
- auditoria: `created_by`, `created_at`, `updated_at`;
- classificacao: `simulation_type`, `title`, `status`, `source`;
- snapshots obrigatorios: `technical_input`, `calculation_snapshot`, `presentation_snapshot`;
- `summary jsonb not null default '{}'::jsonb`;
- eventos comerciais: presented, proposal, pdf, sent, archived;
- summary fields relacionais para credito, parcelas, cotas, INCC, ROI e ganho estimado;
- trigger `crm_lead_simulations_set_updated_at` reutilizando `public.set_updated_at()`;
- indices operacionais;
- RLS habilitado;
- grants apenas `select`, `insert`, `update` para `authenticated`;
- policies organization-scoped.

## Resumo de constraints

O apply inclui checks para:

- `simulation_type in ('commercial', 'multi_cotas')`;
- `status in ('draft', 'presented', 'proposal_generated', 'pdf_generated', 'pdf_sent', 'archived')`;
- `source in ('manual', 'lead_detail', 'simulator', 'multi_cotas')`;
- titulo nao vazio;
- snapshots JSONB como objetos e nao vazios;
- valores monetarios nao negativos;
- percentuais nao negativos;
- `quota_count >= 1` quando preenchido;
- `contemplation_month >= 1` quando preenchido;
- consistencia de arquivamento;
- consistencia de autoria em eventos;
- ordem basica de timestamps.

## Resumo de FKs

O pacote usa:

- `organization_id -> public.organizations(id) on delete restrict`;
- `lead_id -> public.crm_leads(id) on delete restrict`;
- autoria operacional via `public.profiles(id) on delete set null` para:
  - `created_by`;
  - `presented_by`;
  - `proposal_generated_by`;
  - `pdf_generated_by`;
  - `pdf_sent_by`;
  - `archived_by`.

## Resumo de RLS

O apply:

- habilita RLS;
- revoga acesso de `anon`;
- revoga acesso de `public`;
- concede `select`, `insert`, `update` para `authenticated`;
- nao concede `delete`;
- nao cria policy para `anon`;
- cria policies:
  - `crm_lead_simulations authenticated select same organization`;
  - `crm_lead_simulations authenticated insert same organization`;
  - `crm_lead_simulations authenticated update same organization`.

Todas usam:

```text
organization_id = public.evolv_current_organization_id()
```

## Validacao planejada

O arquivo de validation e read-only e valida:

- tabela existe;
- colunas existem;
- constraints existem;
- FKs existem;
- indices existem;
- RLS habilitado;
- policies esperadas existem;
- nao existe delete policy;
- nao existe anon policy;
- grants de `authenticated`;
- ausencia de grants para `anon` e `public`;
- ausencia de grant delete para `authenticated`;
- helper `public.evolv_current_organization_id()` existe;
- trigger `crm_lead_simulations_set_updated_at` existe;
- row count inicial;
- contagens referenciais de tabelas existentes.

## Rollback planejado

O rollback:

- remove somente policies de `crm_lead_simulations`;
- remove trigger especifico de `crm_lead_simulations`;
- dropa somente `public.crm_lead_simulations`;
- nao altera `crm_leads`;
- nao altera `crm_tasks`;
- nao altera `crm_lead_notes`;
- nao altera `profiles`;
- nao altera `organizations`;
- nao altera helper functions;
- nao altera Auth/RLS/policies de outras tabelas.

Aviso obrigatorio:

Rollback destrutivo so deve ser usado antes de simulacoes reais serem criadas, ou apos backup/export verificado e aprovacao explicita.

## Riscos identificados

- Rollback destrutivo se usado apos dados reais.
- JSONB snapshots podem ficar inconsistentes se o futuro service nao validar contratos por tipo.
- Summary fields podem divergir dos snapshots se nao forem derivados da mesma fonte server-side.
- RLS depende de `public.evolv_current_organization_id()` estar correta e validada.
- O pacote cria grants para `authenticated`; a UI ainda nao deve usar a tabela diretamente sem service/server action.

## Confirmacoes

- Nenhum SQL foi executado.
- Nenhuma migration foi aplicada.
- Nenhum banco foi alterado.
- Nenhum Auth/RLS/policy existente foi alterado.
- Nenhum codigo TypeScript/React foi alterado.
- CRM, Simulador, Multi-Cotas, Timeline e PDF nao foram alterados.

## Recomendacao para Sprint 103A.31

Executar uma revisao de readiness do pacote SQL criado nesta sprint, verificando apply, validation e rollback antes de qualquer janela manual de execucao.
