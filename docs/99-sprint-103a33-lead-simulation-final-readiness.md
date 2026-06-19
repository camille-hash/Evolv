# Sprint 103A.33 - Lead-Centric Simulation Final Readiness

## Objetivo

Realizar a revisao final do pacote SQL de persistencia lead-centric de simulacoes antes de liberar uma futura execucao manual controlada.

Esta sprint nao executou SQL, nao alterou banco, nao alterou Auth, nao alterou RLS real, nao alterou policies reais e nao alterou codigo da aplicacao.

## Arquivos revisados

- `supabase/sql/20260619_sprint103a30_lead_simulations_apply.sql`
- `supabase/sql/20260619_sprint103a30_lead_simulations_validation.sql`
- `supabase/sql/20260619_sprint103a30_lead_simulations_rollback.sql`
- `docs/98-sprint-103a32-lead-simulation-rls-refinement.md`

## Arquivos criados

- `docs/99-sprint-103a33-lead-simulation-final-readiness.md`

## Arquivos alterados

- Nenhum arquivo existente foi alterado nesta sprint.

## 1. Apply SQL

### Tabela

O apply cria:

```text
public.crm_lead_simulations
```

Status: aprovado.

Motivos:

- nome correto;
- schema correto;
- tabela nova e isolada;
- nao altera tabelas existentes;
- nao executa backfill;
- nao insere seed;
- nao altera `crm_leads`, `crm_tasks`, `crm_lead_notes`, `profiles` ou `organizations`.

### Colunas

O pacote contempla:

- identidade: `id`;
- escopo: `organization_id`, `lead_id`;
- autoria: `created_by`;
- timestamps: `created_at`, `updated_at`;
- classificacao: `simulation_type`, `title`, `status`, `source`;
- snapshots: `technical_input`, `calculation_snapshot`, `presentation_snapshot`, `summary`;
- eventos comerciais: presented, proposal, pdf, sent, archived;
- summary fields: creditos, parcelas, mes de contemplacao, cotas, INCC, ROI, ganho estimado e venda estimada.

Status: aprovado.

### Constraints

O apply contem constraints para:

- `simulation_type`;
- `status`;
- `source`;
- titulo nao vazio;
- snapshots JSONB como objeto;
- snapshots principais nao vazios;
- monetarios nao negativos;
- percentuais nao negativos;
- `quota_count >= 1` quando preenchido;
- `contemplation_month >= 1` quando preenchido;
- consistencia de arquivamento;
- consistencia de autoria em eventos;
- ordem basica de timestamps.

Status: aprovado.

Risco residual:

`draft` exige snapshots principais nao vazios. Isso e aceitavel se `draft` significar "simulacao calculada ainda nao apresentada". Se o produto quiser salvar rascunho antes de rodar engine, essa constraint devera ser revisada em sprint futura.

### Foreign Keys

O apply usa:

- `organization_id -> public.organizations(id) on delete restrict`;
- `lead_id -> public.crm_leads(id) on delete restrict`;
- campos de autoria -> `public.profiles(id) on delete set null`.

Status: aprovado.

Motivos:

- evita cascade destrutivo em historico comercial;
- preserva simulacoes mesmo se profile operacional for removido;
- segue o padrao operacional de `crm_tasks`.

### Indices

O apply cria indices simples, compostos e parciais para:

- organizacao;
- lead;
- autoria;
- data de criacao;
- tipo;
- status;
- lead dentro da organizacao;
- tipo/status dentro da organizacao;
- apresentacao;
- PDF enviado.

Status: aprovado.

Risco residual:

Ha alguma redundancia aceitavel para V1. Pode ser reavaliada em uma futura sprint de performance caso o volume cresca.

### Trigger `updated_at`

O pacote reutiliza:

```text
public.set_updated_at()
```

Trigger:

```text
crm_lead_simulations_set_updated_at
```

Status: aprovado.

Motivos:

- padrao ja usado no EVOLV;
- trigger especifico da nova tabela;
- nao altera triggers existentes.

### Grants

O pacote:

- revoga acesso de `anon`;
- revoga acesso de `public`;
- concede `select`, `insert`, `update` para `authenticated`;
- nao concede `delete`.

Status: aprovado.

## 2. RLS

### Select

Policy:

```text
crm_lead_simulations authenticated select same organization
```

Regra:

```text
organization_id = public.evolv_current_organization_id()
```

Status: aprovado.

### Insert

Policy:

```text
crm_lead_simulations authenticated insert same organization
```

Regra final:

```text
organization_id = public.evolv_current_organization_id()
and exists (
  select 1
  from public.crm_leads lead
  where lead.id = lead_id
    and lead.organization_id = public.evolv_current_organization_id()
)
```

Status: aprovado.

Resultado:

- exige organizacao atual;
- exige lead da organizacao atual;
- impede vinculo cross-organization entre simulacao e lead.

### Update

Policy:

```text
crm_lead_simulations authenticated update same organization
```

Regra final:

- `using`: valida linha atual;
- `with check`: valida nova linha.

Ambas exigem:

```text
organization_id = public.evolv_current_organization_id()
and lead_id pertence a public.crm_leads da organizacao atual
```

Status: aprovado.

Resultado:

- usuario autenticado so atualiza simulacoes da propria organizacao;
- novo `organization_id`, se enviado, deve continuar igual a organizacao atual;
- novo `lead_id`, se enviado, deve pertencer a mesma organizacao;
- update nao consegue criar vinculo com lead de outra organizacao.

### Ausencias importantes

Confirmado no desenho:

- sem policy para `anon`;
- sem delete policy;
- sem policy ampla `using (true)`;
- sem policy ampla `with check (true)`.

Status: aprovado.

## 3. Validation SQL

O validation e read-only e valida:

- tabela;
- colunas;
- constraints;
- FKs;
- FK para `crm_leads`;
- indices;
- RLS;
- policies;
- grants;
- ausencia de anon policy;
- ausencia de delete policy;
- ausencia de policy ampla `true`;
- helper `public.evolv_current_organization_id()`;
- helper `public.set_updated_at()`;
- trigger `crm_lead_simulations_set_updated_at`;
- validacao de lead/organization nas policies de insert/update;
- valores finais de `source`;
- contagens referenciais.

Status: aprovado.

Observacao:

O validation deve ser executado somente apos o apply, porque consulta `public.crm_lead_simulations`. Isso e esperado para um pacote de validacao pos-apply.

## 4. Rollback SQL

O rollback:

- remove somente policies de `crm_lead_simulations`;
- remove somente trigger de `crm_lead_simulations`;
- dropa somente `public.crm_lead_simulations`;
- nao remove helpers globais;
- nao remove tabelas existentes;
- nao altera `crm_leads`, `profiles`, `organizations`, `crm_tasks` ou `crm_lead_notes`;
- nao altera Auth;
- nao altera RLS/policies de outras tabelas.

Status: aprovado.

Risco residual:

Rollback e destrutivo para dados de simulacao. So deve ser usado antes de dados reais ou apos backup/export validado e aprovacao explicita.

## 5. Compatibilidade

O pacote nao altera:

- `organizations`;
- `profiles`;
- `crm_leads`;
- `crm_tasks`;
- `crm_lead_notes`;
- Auth;
- RLS existente;
- policies existentes;
- Timeline;
- Simulador;
- Multi-Cotas;
- PDF;
- TypeScript/React;
- repositories;
- endpoints;
- services.

Status: aprovado.

## Problemas encontrados

Nenhum problema bloqueador foi encontrado na revisao final.

## Riscos residuais

1. `draft` exige snapshots nao vazios. Aceitavel para V1, mas deve ser lembrado se surgir fluxo de rascunho pre-calculo.
2. Rollback e destrutivo apos dados reais.
3. A tabela so deve ser usada por service/server-side futuro; a UI nao deve enviar campos confiaveis como `organization_id` e `created_by`.
4. A validacao pos-apply nao substitui smoke test funcional futuro quando o app passar a gravar simulacoes.

## Parecer final

```text
APROVADO PARA EXECUCAO MANUAL CONTROLADA
```

Condicoes operacionais para a futura execucao:

1. Abrir apply, validation e rollback antes da janela.
2. Confirmar backup/export ou janela sem dados reais.
3. Executar apply manualmente no Supabase SQL Editor.
4. Executar validation manualmente.
5. Se validation falhar, nao iniciar desenvolvimento sobre a tabela.
6. Executar rollback somente se a falha exigir reversao e antes de dados reais, ou apos backup/export aprovado.

## Confirmacoes

- Nenhum SQL foi executado nesta sprint.
- Nenhum apply foi executado.
- Nenhum validation foi executado.
- Nenhum rollback foi executado.
- Nenhum banco foi alterado.
- Nenhuma migration foi criada.
- Nenhum schema real foi alterado.
- Nenhum Auth foi alterado.
- Nenhum RLS real foi alterado.
- Nenhuma policy real foi alterada.
- Nenhum CRM, Simulador, Multi-Cotas, Timeline ou PDF foi alterado.
- Nenhum codigo TypeScript/React foi alterado.

## Recomendacao para Sprint 103A.34

Recomenda-se:

```text
Sprint 103A.34 - Lead-Centric Simulation Controlled Apply Window
```

Objetivo sugerido:

- execucao manual controlada do apply pela operadora;
- execucao manual da validation;
- registro de evidencias sanitizadas;
- rollback apenas se necessario;
- nenhuma integracao de UI ainda.
