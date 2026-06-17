# Sprint 101B.4 - Dual Pipeline Domain Wiring

## Resumo executivo

Esta sprint criou uma camada isolada de dominio para o Dual Pipeline em `modules/crm-domain`, sem alterar:

- CRM visual;
- repositories;
- Supabase;
- Auth;
- Recovery;
- drag and drop;
- pipeline board;
- comportamento operacional atual.

O CRM continua funcionando exatamente igual.

O ganho desta sprint e estrutural:

- o codigo agora possui contratos formais para o dominio futuro;
- o codigo agora possui mappers/adaptadores sem depender das novas colunas existirem;
- o codigo agora possui helpers puros para snapshots, Stage Events, Green Flags e Revenue Recognition.

## Arquivos criados

- `modules/crm-domain/types.ts`
- `modules/crm-domain/pipeline-domain.ts`
- `modules/crm-domain/stage-events.ts`
- `modules/crm-domain/green-flags.ts`
- `modules/crm-domain/revenue-recognition.ts`
- `modules/crm-domain/mappers.ts`
- `modules/crm-domain/index.ts`
- `docs/38-sprint-101b4-dual-pipeline-domain-wiring.md`

## Tipos criados

### Pipeline e stage domain

Foram criados tipos para representar:

- `DualPipelineDomain`
- `DualStageDomain`
- estagios de:
  - Prospecao
  - Vendas
  - Administrativo
  - Perdidos

Esses tipos usam o vocabulário do dominio futuro, em `snake_case`, sem depender do formato atual do CRM.

### Snapshot do lead

Foi criado:

- `CrmLeadDualPipelineSnapshot`

Esse snapshot:

- preserva `pipeline` e `etapa` atuais como origem;
- permite usar futuramente:
  - `pipeline_domain`
  - `stage_domain`
  - `last_stage_changed_at`
- informa se o valor veio de:
  - `legacy-current-pipeline`
  - `future-domain-fields`

### Stage Event

Foi criado:

- `CrmStageEventDraft`

Objetivo:

- preparar o shape futuro da tabela `crm_stage_events`;
- representar evento auditavel sem gravar nada.

### Green Flag

Foi criado:

- `CrmGreenFlagDraft`

Objetivo:

- preparar o shape futuro da tabela `crm_green_flags`;
- suportar:
  - dueAt
  - note
  - context
  - resolutionReason
  - status

### Revenue Recognition

Foi criado:

- `RevenueRecognitionSnapshot`

Objetivo:

- representar o estado futuro de reconhecimento comercial/financeiro;
- permitir leitura segura do legado sem ativar regra nova.

## Adaptadores criados

Em `mappers.ts` foram criados adaptadores puros:

- `mapCurrentCrmLeadToDomainSnapshot(...)`
- `mapCurrentCrmStageChangeToFutureStageEvent(...)`
- `mapCurrentCrmLeadToFutureGreenFlag(...)`
- `mapCurrentCrmLeadToRevenueRecognition(...)`

Esses adaptadores:

- partem do `CrmLead` atual;
- aceitam `futureFields` opcionais;
- funcionam mesmo sem as novas colunas existirem;
- nao alteram dados;
- nao gravam nada;
- nao dependem de Supabase.

## Helpers criados

### `pipeline-domain.ts`

Cria a base de leitura do dominio:

- `resolvePipelineDomain(...)`
- `resolveStageDomain(...)`
- `buildDualPipelineSnapshot(...)`
- `isGreenFlagStageDomain(...)`

### `stage-events.ts`

Prepara eventos futuros:

- `buildStageEventDraftFromLeadTransition(...)`
- `buildStageEventDraftFromLegacyChange(...)`
- `buildGreenFlagStageEventDraft(...)`

### `green-flags.ts`

Prepara ciclos Green Flag futuros:

- `buildGreenFlagDraftFromLead(...)`
- `buildGreenFlagRescheduleDraft(...)`

### `revenue-recognition.ts`

Prepara a leitura do estado futuro:

- `buildRevenueRecognitionSnapshot(...)`

Importante:

- nenhuma dessas funcoes grava;
- nenhuma chama repository;
- nenhuma muda comportamento do CRM atual.

## Garantias de escopo

Esta sprint:

- nao alterou `crm-page.tsx`;
- nao alterou `crm-lead-detail.tsx`;
- nao alterou repositories;
- nao alterou drag and drop;
- nao alterou pipeline board;
- nao alterou UI;
- nao executou SQL;
- nao criou migration;
- nao alterou Supabase;
- nao alterou producao.

## Proxima sprint recomendada

Recomendacao mais segura:

**Sprint 101B.5 - Controlled Schema Apply & Validation Window**

Motivo:

- o dominio de codigo ja esta preparado;
- antes de qualquer wiring funcional, o schema e as policies documentadas precisam existir de verdade no banco;
- isso deve acontecer por execucao manual controlada da 101B.2 e 101B.3, com validacao antes de tocar no app.

## Confirmacao final

- Nenhum SQL foi executado.
- Nenhuma migration foi criada.
- Nenhum dado foi alterado.
- Nenhuma alteracao funcional foi percebida pelo usuario.
- O CRM permanece igual.
