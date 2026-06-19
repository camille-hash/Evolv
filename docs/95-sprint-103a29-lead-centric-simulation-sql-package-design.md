# Sprint 103A.29 - Lead-Centric Simulation SQL Package Design

## Objetivo

Desenhar o pacote SQL futuro para persistencia lead-centric de simulacoes em:

```text
public.crm_lead_simulations
```

Esta sprint e exclusivamente de design SQL. Nenhum arquivo `.sql`, migration, tabela, policy, index, endpoint, repository, service, UI ou alteracao em banco foi criado.

## Contexto

A Sprint 103A.28 recomendou uma tabela unica V1:

- `crm_lead_simulations`;
- `simulation_type`;
- snapshots JSONB obrigatorios;
- summary fields relacionais;
- RLS organization-scoped;
- sem hard delete em V1.

## Desenho da tabela

Tabela futura:

```text
public.crm_lead_simulations
```

Finalidade:

Armazenar simulacoes comerciais e Multi-Cotas vinculadas obrigatoriamente a um lead.

### Colunas recomendadas

| Coluna | Tipo SQL recomendado | Nulabilidade | Default | Observacao |
| --- | --- | --- | --- | --- |
| `id` | uuid | not null | `gen_random_uuid()` | Primary key. |
| `organization_id` | uuid | not null | none | Resolvido server-side. |
| `lead_id` | uuid | not null | none | Lead dono da simulacao. |
| `created_by` | uuid | null | none | Profile criador. Pode usar set null se profile for removido. |
| `created_at` | timestamptz | not null | `now()` | Criacao auditavel. |
| `updated_at` | timestamptz | not null | `now()` | Atualizado por trigger. |
| `simulation_type` | text | not null | none | `commercial` ou `multi_cotas`. |
| `title` | text | not null | none | Nome operacional. |
| `status` | text | not null | `'draft'` | Estado operacional atual. |
| `source` | text | not null | `'lead_dossier'` | Origem do fluxo. |
| `technical_input` | jsonb | not null | none | Parametros usados. |
| `calculation_snapshot` | jsonb | not null | none | Resultado tecnico. |
| `presentation_snapshot` | jsonb | not null | none | Resultado apresentado. |
| `summary` | jsonb | not null | `'{}'::jsonb` | Resumo flexivel, nao substitui summary fields. |
| `total_credit` | numeric(14,2) | null | none | Credito bruto/base total. |
| `updated_credit` | numeric(14,2) | null | none | Credito atualizado pelo INCC. |
| `commercial_credit` | numeric(14,2) | null | none | Credito comercial disponivel ao cliente. |
| `monthly_payment` | numeric(14,2) | null | none | Parcela antes da contemplacao, quando aplicavel. |
| `post_contemplation_payment` | numeric(14,2) | null | none | Parcela pos-contemplacao, quando aplicavel. |
| `contemplation_month` | integer | null | none | Mes principal de contemplacao. |
| `quota_count` | integer | null | none | Numero de cartas/cotas. |
| `incc_rate` | numeric(8,6) | null | none | Taxa em decimal, ex: 0.04. |
| `estimated_roi` | numeric(12,6) | null | none | ROI em decimal. |
| `estimated_gain` | numeric(14,2) | null | none | Ganho estimado. |
| `estimated_sale_value` | numeric(14,2) | null | none | Venda estimada, se aplicavel. |
| `presented_at` | timestamptz | null | none | Quando apresentada. |
| `presented_by` | uuid | null | none | Quem apresentou. |
| `proposal_generated_at` | timestamptz | null | none | Quando proposta foi gerada. |
| `proposal_generated_by` | uuid | null | none | Quem gerou proposta. |
| `pdf_generated_at` | timestamptz | null | none | Quando PDF foi gerado. |
| `pdf_generated_by` | uuid | null | none | Quem gerou PDF. |
| `pdf_sent_at` | timestamptz | null | none | Quando PDF foi enviado. |
| `pdf_sent_by` | uuid | null | none | Quem enviou PDF. |
| `archived_at` | timestamptz | null | none | Arquivamento logico. |
| `archived_by` | uuid | null | none | Quem arquivou. |

## Chaves e relacionamentos

### Foreign keys recomendadas

- `organization_id -> public.organizations(id) on delete restrict`;
- `lead_id -> public.crm_leads(id) on delete restrict`;
- `created_by -> public.profiles(id) on delete set null`;
- `presented_by -> public.profiles(id) on delete set null`;
- `proposal_generated_by -> public.profiles(id) on delete set null`;
- `pdf_generated_by -> public.profiles(id) on delete set null`;
- `pdf_sent_by -> public.profiles(id) on delete set null`;
- `archived_by -> public.profiles(id) on delete set null`.

### Decisao: profiles em vez de auth.users

Usar `public.profiles` para autoria operacional.

Motivos:

- o EVOLV ja usa `profiles` como camada operacional;
- `profiles.organization_id` sustenta isolamento organizacional;
- facilita exibir nomes/roles no CRM;
- segue o padrao ja usado em `crm_tasks`.

`auth.users` continua sendo origem de autenticacao, mas nao deve ser a FK direta principal de autoria comercial.

## Constraints recomendadas

### `simulation_type`

```text
simulation_type in ('commercial', 'multi_cotas')
```

Usar `text + check constraint`, nao enum PostgreSQL na V1.

### `status`

```text
status in (
  'draft',
  'presented',
  'proposal_generated',
  'pdf_generated',
  'pdf_sent',
  'archived'
)
```

### `source`

Valores iniciais recomendados:

```text
source in (
  'lead_dossier',
  'commercial_simulator',
  'multi_cotas',
  'proposal_flow'
)
```

Se houver risco de rigidez excessiva, `source` pode iniciar como text livre com documentacao, mas a recomendacao V1 e check constraint.

### Campos textuais

- `btrim(title) <> ''`;
- `btrim(source) <> ''`.

### Valores monetarios nao negativos

Aplicar check `>= 0` quando campo nao for null:

- `total_credit`;
- `updated_credit`;
- `commercial_credit`;
- `monthly_payment`;
- `post_contemplation_payment`;
- `estimated_gain`;
- `estimated_sale_value`.

Observacao:

`estimated_gain` pode ser negativo em cenarios futuros de perda? Para V1 comercial, manter nao negativo. Se o produto passar a modelar perda, revisar.

### Percentuais

Aplicar:

- `incc_rate >= 0`;
- `estimated_roi >= 0`.

Nao limitar superiormente na V1 para evitar bloquear cenarios excepcionais. Validacoes de negocio mais finas devem ficar no service.

### `quota_count`

```text
quota_count is null or quota_count >= 1
```

Para `simulation_type = 'multi_cotas'`, recomendacao futura:

```text
simulation_type <> 'multi_cotas' or quota_count is not null
```

Porem, na V1, pode ser mais seguro validar isso server-side para evitar check complexo antes do payload estabilizar.

### `contemplation_month`

```text
contemplation_month is null or contemplation_month >= 1
```

### Arquivamento

Recomendacao:

```text
status <> 'archived'
or (archived_at is not null and archived_by is not null)
```

### Apresentacao

Recomendacao:

```text
presented_at is null or presented_by is not null
```

### Proposta/PDF

Recomendacoes:

```text
proposal_generated_at is null or proposal_generated_by is not null
pdf_generated_at is null or pdf_generated_by is not null
pdf_sent_at is null or pdf_sent_by is not null
pdf_sent_at is null or pdf_generated_at is not null
```

### Consistencia basica de timestamps

Recomendacoes:

- `updated_at >= created_at`;
- `presented_at >= created_at`, se preenchido;
- `proposal_generated_at >= created_at`, se preenchido;
- `pdf_generated_at >= created_at`, se preenchido;
- `pdf_sent_at >= created_at`, se preenchido.

Esses checks podem ser adicionados no pacote apply se nao ficarem excessivamente verbosos.

## Estrategia JSONB / snapshots

### Campos JSONB

- `technical_input jsonb not null`;
- `calculation_snapshot jsonb not null`;
- `presentation_snapshot jsonb not null`;
- `summary jsonb not null default '{}'::jsonb`.

### Decisao sobre default

Recomendacao:

- `technical_input`: sem default; deve ser enviado pelo service;
- `calculation_snapshot`: sem default; deve ser enviado pelo service;
- `presentation_snapshot`: sem default; deve ser enviado pelo service;
- `summary`: default `{}` permitido.

Motivo:

Os tres snapshots principais sao essenciais e nao devem nascer vazios por acidente. `summary` pode ser flexivel e complementar.

### Constraints minimas JSONB

Recomendadas:

```text
jsonb_typeof(technical_input) = 'object'
jsonb_typeof(calculation_snapshot) = 'object'
jsonb_typeof(presentation_snapshot) = 'object'
jsonb_typeof(summary) = 'object'
technical_input <> '{}'::jsonb
calculation_snapshot <> '{}'::jsonb
presentation_snapshot <> '{}'::jsonb
```

Nao validar estrutura interna profunda via SQL na V1.

Motivo:

O contrato por tipo deve ser validado em TypeScript/server-side. SQL deve garantir existencia e tipo basico.

## Summary fields

Campos relacionais recomendados:

- `total_credit numeric(14,2)`;
- `updated_credit numeric(14,2)`;
- `commercial_credit numeric(14,2)`;
- `monthly_payment numeric(14,2)`;
- `post_contemplation_payment numeric(14,2)`;
- `contemplation_month integer`;
- `quota_count integer`;
- `incc_rate numeric(8,6)`;
- `estimated_roi numeric(12,6)`;
- `estimated_gain numeric(14,2)`;
- `estimated_sale_value numeric(14,2)`.

Esses campos devem ser derivados server-side do mesmo payload usado nos snapshots.

## Indices recomendados

### Indices V1 obrigatorios

- `crm_lead_simulations_organization_id_idx` on `(organization_id)`;
- `crm_lead_simulations_lead_id_idx` on `(lead_id)`;
- `crm_lead_simulations_created_by_idx` on `(created_by)`;
- `crm_lead_simulations_created_at_idx` on `(created_at desc)`;
- `crm_lead_simulations_simulation_type_idx` on `(simulation_type)`;
- `crm_lead_simulations_status_idx` on `(status)`;
- `crm_lead_simulations_org_lead_created_at_idx` on `(organization_id, lead_id, created_at desc)`;
- `crm_lead_simulations_org_type_created_at_idx` on `(organization_id, simulation_type, created_at desc)`;
- `crm_lead_simulations_org_status_created_at_idx` on `(organization_id, status, created_at desc)`.

### Indices de eventos

- `crm_lead_simulations_presented_at_idx` on `(presented_at desc)` where `presented_at is not null`;
- `crm_lead_simulations_pdf_sent_at_idx` on `(pdf_sent_at desc)` where `pdf_sent_at is not null`.

### Indices opcionais futuros

- `(organization_id, commercial_credit)`;
- `(organization_id, estimated_roi)`;
- `(organization_id, proposal_generated_at desc)` where `proposal_generated_at is not null`;
- GIN em JSONB apenas se consultas profundas se tornarem reais.

## RLS futura

### Diretrizes

- habilitar RLS na criacao;
- revogar `anon`;
- revogar `public`;
- conceder apenas `select`, `insert`, `update` para `authenticated`;
- nao conceder delete;
- nao criar policy para anon;
- nao usar `using (true)` ou `with check (true)`.

### Policies conceituais

#### SELECT

```text
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
)
```

#### INSERT

```text
to authenticated
with check (
  organization_id = public.evolv_current_organization_id()
)
```

#### UPDATE

```text
to authenticated
using (
  organization_id = public.evolv_current_organization_id()
)
with check (
  organization_id = public.evolv_current_organization_id()
)
```

#### DELETE

Nao criar policy de delete na V1.

## Insert/update strategy

### Criacao

O client nao deve chamar Supabase diretamente para inserir simulacao.

Fluxo recomendado:

```text
Frontend
-> API/server action
-> validar sessao
-> resolver profile
-> resolver organization_id
-> validar lead pertence a organizacao
-> montar snapshots
-> derivar summary fields
-> inserir crm_lead_simulations
```

### Campos proibidos para client

O client nao deve enviar como fonte confiavel:

- `organization_id`;
- `created_by`;
- `presented_by`;
- `proposal_generated_by`;
- `pdf_generated_by`;
- `pdf_sent_by`;
- `archived_by`;
- `status` final sem validacao server-side.

### Updates

Atualizacoes tambem devem passar por server-side.

Casos V1:

- marcar apresentada;
- registrar proposta gerada;
- registrar PDF gerado;
- registrar PDF enviado;
- arquivar.

Cada update deve:

- validar sessao;
- validar organizacao;
- validar lead/simulacao;
- preencher usuario server-side;
- atualizar status/timestamp de forma consistente.

## Validation queries planejadas

O futuro arquivo validation deve conter apenas SELECT/WITH.

Validar:

1. Tabela existe:
   - `to_regclass('public.crm_lead_simulations') is not null`.
2. Colunas esperadas existem.
3. Constraints esperadas existem:
   - simulation type;
   - status;
   - source;
   - JSONB object/not empty;
   - monetary non-negative;
   - archive consistency.
4. FKs existem:
   - organizations;
   - crm_leads;
   - profiles.
5. Indexes esperados existem.
6. Trigger `updated_at` existe, se usada.
7. RLS habilitado.
8. Policies esperadas existem.
9. Nenhuma policy anon existe.
10. Nenhuma policy delete existe.
11. Grants:
    - authenticated tem select/insert/update;
    - anon nao tem grants;
    - public nao tem grants.
12. Helper functions existem:
    - `public.evolv_current_organization_id()`;
    - `public.evolv_current_role()`, se usado.
13. Row count inicial esperado.
14. `crm_leads` nao foi alterada.
15. `crm_tasks`, `crm_lead_notes`, `profiles` e `organizations` nao foram alteradas indevidamente.

### Validacao de anon

Planejar validacao documental:

- ausência de grants anon;
- ausencia de policies anon.

Nao tentar executar insert anon no SQL de validacao se isso exigir troca de role ou ambiente inseguro.

### Validacao de organizacao

Planejar teste manual futuro:

- usuario autenticado da organizacao A ve apenas simulacoes da A;
- insert falha se `organization_id` nao corresponder ao helper;
- service nunca aceita `organization_id` do client.

## Rollback futuro

### Antes de dados reais

Rollback pode:

- dropar policies de `crm_lead_simulations`;
- dropar trigger especifica;
- dropar tabela `crm_lead_simulations`;
- nao tocar em `crm_leads`;
- nao tocar em `crm_tasks`;
- nao tocar em `crm_lead_notes`;
- nao tocar em `profiles`;
- nao tocar em `organizations`;
- nao tocar em helper functions;
- nao tocar em Auth/RLS de outras tabelas.

### Depois de dados reais

Rollback nao deve ser drop simples.

Deve ser:

- backup;
- export;
- arquivamento;
- migration corretiva;
- ou plano manual aprovado.

Documento futuro de rollback deve conter aviso explicito:

```text
Rollback destrutivo so pode ser usado antes de simulacoes reais serem criadas ou apos backup aprovado.
```

## Riscos identificados

### RLS permissivo por acidente

Risco:

Criar policy com `using (true)`.

Mitigacao:

Validation deve procurar policies amplas e confirmar expression organization-scoped.

### JSONB vazio

Risco:

Salvar simulacao sem snapshot util.

Mitigacao:

Checks SQL basicos + validacao server-side por tipo.

### Summary fields divergentes

Risco:

Resumo relacional nao bater com snapshot.

Mitigacao:

Service deve derivar ambos da mesma fonte.

### FK cascade destrutivo

Risco:

Perder historico ao deletar lead/organization.

Mitigacao:

Usar restrict/no cascade para organization e lead.

### Ausencia de contrato TypeScript

Risco:

Payload por tipo virar informal.

Mitigacao:

Antes da implementacao, criar tipos para snapshots `commercial` e `multi_cotas`.

### Timestamps inconsistentes

Risco:

PDF enviado antes de gerado, apresentado sem autor, arquivado sem autor.

Mitigacao:

Checks SQL basicos e updates server-side transacionais.

## Pacote futuro recomendado

Na Sprint 103A.30, se aprovada, criar:

- `supabase/sql/20260619_sprint103a30_crm_lead_simulations_schema_apply.sql`;
- `supabase/sql/20260619_sprint103a30_crm_lead_simulations_schema_validation.sql`;
- `supabase/sql/20260619_sprint103a30_crm_lead_simulations_schema_rollback.sql`;
- `docs/96-sprint-103a30-lead-centric-simulation-sql-package-creation.md`.

## Fora do escopo desta sprint

- arquivo SQL;
- migration;
- tabela;
- policy;
- index;
- endpoint;
- repository;
- service;
- UI;
- banco;
- Auth;
- RLS real;
- CRM;
- Simulador;
- Multi-Cotas;
- Timeline;
- PDF.

## Conclusao

O pacote SQL futuro deve criar `public.crm_lead_simulations` como tabela unica, authenticated-only, organization-scoped, sem anon, sem hard delete, com snapshots JSONB obrigatorios e summary fields relacionais.

A criacao e atualizacao devem ser exclusivamente server-side, com autoria e organizacao resolvidas pelo EVOLV.

## Recomendacao para Sprint 103A.30

Criar o pacote SQL documental/executavel futuro em arquivos separados de apply, validation e rollback, sem executar SQL.
