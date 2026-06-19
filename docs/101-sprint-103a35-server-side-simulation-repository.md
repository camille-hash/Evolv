# Sprint 103A.35 - Server-Side Simulation Repository

## Objetivo

Criar a camada server-side minima para persistir e consultar simulacoes vinculadas a leads em `public.crm_lead_simulations`, sem conectar UI, Simulador Comercial ou Multi-Cotas.

## Arquivos criados

- `modules/crm/crm-lead-simulations.ts`
- `modules/crm/server/crm-lead-simulations-service.ts`
- `app/api/crm/lead-simulations/route.ts`
- `docs/101-sprint-103a35-server-side-simulation-repository.md`

## Arquivos alterados

- `modules/crm/index.ts`

## Padroes existentes reutilizados

A implementacao segue o padrao ja usado em:

- `modules/crm/server/crm-tasks-service.ts`
- `modules/crm/server/crm-lead-notes-service.ts`
- `app/api/crm/tasks/route.ts`
- `app/api/crm/lead-notes/route.ts`

Padroes reutilizados:

- API route server-side;
- Bearer token no header `Authorization`;
- Supabase client server-side com publishable/anon key e JWT do usuario;
- `persistSession: false`;
- `supabase.auth.getUser(accessToken)`;
- leitura de `profiles`;
- validacao de `is_active`, `role` e `organization_id`;
- validacao do lead antes da escrita;
- RLS respeitado pelo client autenticado;
- sem service role.

## Contrato implementado

Tipos criados:

- `CrmLeadSimulation`
- `CrmLeadSimulationType`
- `CreateCrmLeadSimulationInput`
- `CrmLeadSimulationSnapshot`
- `CrmLeadSimulationSummary`
- `CrmLeadSimulationPersistentStatus`
- `CrmLeadSimulationSource`
- `LeadSimulationCommercialEvent`

Valores aceitos:

```text
simulationType:
- commercial
- multi_cotas

source:
- lead_detail
- simulator
- multi_cotas
- api
```

## Service criado

Arquivo:

```text
modules/crm/server/crm-lead-simulations-service.ts
```

Funcoes principais:

- `listLeadSimulationsByLeadId(accessToken, leadId)`
- `getLeadSimulationById(accessToken, simulationId)`
- `createLeadSimulation(accessToken, input)`
- `markLeadSimulationCommercialEvent(accessToken, simulationId, event)`

Eventos comerciais preparados:

- `presented`
- `proposal_generated`
- `pdf_generated`
- `pdf_sent`
- `archived`

Observacao:

Os eventos comerciais possuem funcao server-side preparada, mas nao foram expostos em endpoint especifico nesta sprint. Isso preserva o escopo e evita criar fluxos visuais ou mutacoes publicas ainda nao usadas.

## Endpoints criados

Arquivo:

```text
app/api/crm/lead-simulations/route.ts
```

Endpoints:

```text
GET /api/crm/lead-simulations?leadId=<leadId>
```

Retorna simulacoes do lead em `created_at desc`.

```text
GET /api/crm/lead-simulations?simulationId=<simulationId>
```

Retorna uma simulacao por id, validando organizacao.

```text
POST /api/crm/lead-simulations
```

Cria simulacao vinculada ao lead.

Payload aceito no POST:

- `leadId`
- `simulationType`
- `title`
- `source`
- `technicalInput`
- `calculationSnapshot`
- `presentationSnapshot`
- `summary`

Campos nao aceitos como confiaveis do client:

- `organizationId`
- `createdBy`
- `presentedBy`
- `proposalGeneratedBy`
- `pdfGeneratedBy`
- `pdfSentBy`
- `archivedBy`

## Regras de seguranca

O server resolve:

- sessao Supabase Auth;
- usuario autenticado;
- profile;
- `organization_id`;
- autoria;
- pertencimento do lead a organizacao.

O repository/service:

- nao usa service role;
- respeita RLS;
- nao cria policy;
- nao altera RLS;
- nao altera Auth;
- nao confia em `organization_id` vindo da UI;
- nao confia em `created_by` vindo da UI.

## Regras de autoria

Na criacao:

- `organization_id` vem de `profile.organization_id`;
- `created_by` vem de `profile.id`;
- `status` inicial e `draft`;
- `source` default e `api`.

Nos eventos comerciais preparados:

- `presented_by`;
- `proposal_generated_by`;
- `pdf_generated_by`;
- `pdf_sent_by`;
- `archived_by`;

sao sempre preenchidos server-side com `profile.id`.

## Validacoes server-side

Antes de inserir:

- lead obrigatorio;
- titulo obrigatorio;
- `simulationType` valido;
- `source` valido;
- `technicalInput` nao vazio;
- `calculationSnapshot` nao vazio;
- `presentationSnapshot` nao vazio;
- profile ativo;
- role `admin` ou `sdr`;
- lead existe;
- lead pertence a mesma organizacao do profile.

Summary fields derivados:

- `total_credit`
- `updated_credit`
- `commercial_credit`
- `monthly_payment`
- `post_contemplation_payment`
- `contemplation_month`
- `quota_count`
- `incc_rate`
- `estimated_roi`
- `estimated_gain`
- `estimated_sale_value`

Os campos sao derivados do objeto `summary` usando nomes camelCase do contrato frontend/server:

- `totalCredit`
- `updatedCredit`
- `commercialCredit`
- `monthlyPayment`
- `postContemplationPayment`
- `contemplationMonth`
- `quotaCount`
- `inccRate`
- `estimatedRoi`
- `estimatedGain`
- `estimatedSaleValue`

## Limitacoes conhecidas

- Nenhuma UI foi conectada.
- Simulador Comercial ainda nao grava em `crm_lead_simulations`.
- Multi-Cotas ainda nao grava em `crm_lead_simulations`.
- Eventos comerciais estao preparados no service, mas sem endpoint proprio nesta sprint.
- Timeline Operacional ainda nao consome `crm_lead_simulations`.
- PDF/proposta ainda nao atualizam timestamps da tabela.
- A camada assume que a tabela e as policies da 103A.34 ja foram aplicadas manualmente.

## Validacoes executadas

```text
npm.cmd run typecheck
```

Resultado: passou.

```text
npm.cmd run lint
```

Resultado: passou com 4 warnings preexistentes em `components/crm/crm-page.tsx`:

- `handleSubmit` nao usado;
- `handleCancelEdit` nao usado;
- `handlePipelineChange` nao usado;
- `LeadForm` nao usado.

```text
npm.cmd run build
```

Resultado: passou.

## Confirmacoes

- Nenhum SQL foi criado.
- Nenhum SQL foi executado.
- Nenhum banco foi alterado.
- Nenhum schema foi alterado.
- Nenhum Auth foi alterado.
- Nenhum RLS foi alterado.
- Nenhuma policy foi alterada.
- Nenhuma UI foi alterada.
- Simulador Comercial nao foi conectado.
- Multi-Cotas nao foi conectado.
- Timeline nao foi alterada.
- PDF nao foi alterado.

## Recomendacao para Sprint 103A.36

Recomenda-se:

```text
Sprint 103A.36 - Lead-Centric Simulation Server-Side Validation
```

Objetivo sugerido:

- validar manualmente os endpoints com usuario autenticado;
- criar checklist de smoke test server-side;
- testar GET por lead;
- testar GET por simulationId;
- testar POST com payload valido;
- testar payload sem snapshots;
- testar lead de outra organizacao quando houver ambiente seguro para isso;
- manter UI e simuladores ainda desconectados.
