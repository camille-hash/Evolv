# Sprint 101B.3 - Dual Pipeline RLS + Policies

## Objetivo da sprint

Esta sprint documenta a estrategia de RLS + policies para o dominio Dual Pipeline do EVOLV, sem executar SQL e sem alterar producao.

O objetivo e preparar o pacote tecnico que permitira, numa sprint futura de apply manual, proteger corretamente:

- `public.crm_stage_events`
- `public.crm_green_flags`

com acesso:

- apenas para `authenticated`;
- sempre limitado por `organization_id`;
- sem uso de `anon`;
- sem policies permissivas do tipo `using (true)`.

## Estado inicial

Estado auditado nesta sprint:

- branch atual: `main`;
- `git status` inicial: working tree clean;
- os SQLs da 101B.1 e 101B.2 existem apenas como artefatos documentais;
- nenhum SQL da 101B.1/101B.2 foi executado;
- nenhuma alteracao real foi aplicada no Supabase;
- `crm_leads` ja possui padrao organization-scoped documentado em migrations anteriores;
- as novas tabelas do Dual Pipeline ainda nao existem no banco real, porque o apply da 101B.2 nao foi executado.

## Premissas de seguranca

1. O EVOLV deve continuar sem acesso `anon` para o novo dominio Dual Pipeline.
2. O escopo de acesso deve ser sempre baseado em `organization_id`.
3. `crm_stage_events` deve respeitar a organizacao do lead relacionado.
4. `crm_green_flags` deve respeitar a organizacao do proprio registro e do lead relacionado.
5. Nenhuma policy deve usar `using (true)` ou `with check (true)`.
6. Delete nao deve nascer aberto por padrao.
7. O padrao de sessao/profile do projeto deve ser reaproveitado:
   - `public.evolv_current_organization_id()`
   - `public.evolv_current_role()`

## Tabelas protegidas

### `public.crm_stage_events`

Uso esperado:

- trilha auditavel oficial de transicoes;
- No Show;
- entrada e remarcacao de Green Flag;
- eventos comerciais futuros.

Operacoes recomendadas:

- `SELECT`: sim
- `INSERT`: sim
- `UPDATE`: nao
- `DELETE`: nao

Motivo:

- evento auditavel deve ser append-only por padrao;
- qualquer correcao futura deve ser tratada por evento compensatorio, nao por edicao/destruicao silenciosa.

### `public.crm_green_flags`

Uso esperado:

- ciclos de retomada;
- due date / due_at;
- nota/contexto;
- resolucao e remarcacao.

Operacoes recomendadas:

- `SELECT`: sim
- `INSERT`: sim
- `UPDATE`: sim
- `DELETE`: nao

Motivo:

- Green Flag precisa evoluir de `active` para `rescheduled`, `resolved`, `lost` etc.;
- nao deve ser apagado como padrao, porque o historico e parte do valor do dominio.

## Estrategia organization-scoped

A estrategia recomendada segue o padrao ja existente de `crm_leads`:

- sempre comparar `organization_id = public.evolv_current_organization_id()`;
- exigir que a funcao retorne valor nao nulo;
- cruzar o `lead_id` com `public.crm_leads` para evitar insercao em organizacao errada;
- quando houver referencia opcional a `crm_stage_events`, validar que ela pertence a mesma organizacao.

## Policies propostas

## 1. `crm_stage_events`

### Select

Permitir leitura apenas quando:

- usuario autenticado tiver `organization_id`;
- `crm_stage_events.organization_id = public.evolv_current_organization_id()`.

### Insert

Permitir insercao apenas quando:

- `organization_id = public.evolv_current_organization_id()`;
- `lead_id` existir em `crm_leads`;
- o lead pertencer a mesma organizacao do usuario.

### Update

Nao criar policy.

### Delete

Nao criar policy.

## 2. `crm_green_flags`

### Select

Permitir leitura apenas quando:

- usuario autenticado tiver `organization_id`;
- `crm_green_flags.organization_id = public.evolv_current_organization_id()`.

### Insert

Permitir insercao apenas quando:

- `organization_id = public.evolv_current_organization_id()`;
- `lead_id` existir e pertencer a mesma organizacao;
- se `stage_event_id` vier preenchido, ele tambem pertencer a mesma organizacao.

### Update

Permitir update apenas quando:

- registro atual pertence a organizacao do usuario;
- valor final continua pertencendo a mesma organizacao;
- `lead_id` continua amarrado a lead da mesma organizacao;
- `stage_event_id`, se presente, continua amarrado a evento da mesma organizacao.

### Delete

Nao criar policy nesta fase.

## Como validar manualmente

Depois de uma futura execucao manual dos SQLs:

1. Confirmar que `crm_stage_events` e `crm_green_flags` existem.
2. Confirmar que RLS esta habilitada nas duas tabelas.
3. Confirmar que nao existe policy para `anon`.
4. Confirmar que nao existe policy com `using (true)` ou `with check (true)`.
5. Confirmar que os grants para `authenticated` estao limitados ao necessario.
6. Confirmar que `crm_stage_events` nao possui `UPDATE`/`DELETE` liberados.
7. Confirmar que `crm_green_flags` nao possui `DELETE` liberado.
8. Confirmar que nenhuma policy quebra o relacionamento com `crm_leads`.

## Ordem futura de execucao

1. Revisar SQL de apply da 101B.2.
2. Executar manualmente o apply da 101B.2.
3. Executar validation da 101B.2.
4. Revisar SQL documental da 101B.3.
5. Executar manualmente `20260617_sprint101b3_dual_pipeline_rls_policies.sql`.
6. Executar manualmente `20260617_sprint101b3_dual_pipeline_rls_validation.sql`.
7. Conferir manualmente aba Policies no Supabase.
8. Somente depois partir para sprint de wiring funcional.

## Riscos

### Criticos

- criar policy ampla por conveniencia;
- liberar `anon`;
- permitir insert sem validar `lead_id` da mesma organizacao.

### Altos

- liberar `UPDATE` em `crm_stage_events`;
- permitir `stage_event_id` em Green Flag apontando para evento de outra organizacao;
- esquecer grants minimos para `authenticated`.

### Medios

- permitir updates em `crm_green_flags` sem `with check` consistente;
- misturar role admin e sdr sem necessidade nesta fase.

## Rollback

O rollback documental desta sprint:

- revoga grants concedidos a `authenticated`;
- remove policies das duas tabelas;
- preserva RLS habilitada;
- nao altera dados;
- nao toca em `crm_leads`;
- nao toca em Auth, profiles ou organizacoes.

## Confirmacao explicita

- Nenhum SQL foi executado nesta sprint.
- Nenhuma migration foi aplicada.
- Nenhuma alteracao real foi feita no Supabase.
- Nenhuma alteracao foi feita em UI, CRM, auth ou recovery.

## Proxima sprint recomendada

**Sprint 101B.4 - Dual Pipeline Domain Wiring**

Pre-condicao:

- SQL da 101B.2 aplicado manualmente e validado;
- SQL da 101B.3 aplicado manualmente e validado;
- tabelas novas existentes e protegidas;
- sem acesso anon ao novo dominio.
