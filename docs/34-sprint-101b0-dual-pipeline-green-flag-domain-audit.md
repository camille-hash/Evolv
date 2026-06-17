# Sprint 101B.0 - Dual Pipeline & Green Flag Domain Audit

## 1. Resumo executivo

O CRM atual do EVOLV opera com um modelo simples e funcional:

- cada lead possui **um unico `pipeline`**;
- cada lead possui **uma unica `etapa`**;
- a movimentacao entre funis e etapas ocorre por **mutacao do mesmo lead**, sem duplicacao;
- o historico de mudanca de etapa existe no frontend/localStorage e registra origem e destino;
- o schema oficial atual de `crm_leads` ainda nao possui campos dedicados para Green Flag, deadline comercial ou reconhecimento formal de venda concluida.

O desenho atual atende a operacao basica, mas **nao representa com seguranca o dominio desejado para a Sprint 101B**:

- Prospecao e Vendas ainda estao modelados como dois grupos do mesmo funil operacional, e nao como um fluxo com regra formal de transicao;
- `Agendamento`, `No Show` e `Primeira Reuniao` dependem de regra operacional, mas hoje sao apenas etapas simples;
- `Green Flag` existe apenas como etapa, sem `due date`, nota, responsavel ou status proprio;
- `Venda concluida` ainda nao existe como marco tecnico confiavel ligado ao primeiro boleto pago.

Conclusao: **a Sprint 101B nao deve começar por UI**. O proximo passo seguro e **101B.1 - schema/proposal**, porque a camada atual nao possui estrutura suficiente para Green Flag, deadlines e revenue recognition sem risco de gambiarra ou perda de semantica.

## 2. Estado atual do CRM

### 2.1 Modelo operacional em uso hoje

O fluxo atual do CRM usa:

1. `components/crm/crm-page.tsx`
2. `modules/crm/crm-engine.ts`
3. `modules/crm/crm-pipeline-engine.ts`
4. `modules/crm/repositories/*`

O frontend trata Prospecao e Vendas como grupos operacionais separados, mas o dado persistido continua sendo:

- `lead.pipeline`
- `lead.etapa`

Sem duplicacao de lead e sem entidade intermediaria entre SDR e closer.

### 2.2 Grupos operacionais renderizados hoje

No `crm-page.tsx`, os grupos ativos relevantes sao:

- **Prospecao**:
  - `novos`
  - `abertura`
  - `conexao`
  - `qualificados`
  - `agendamento`
  - `no-show`
- **Vendas**:
  - `primeira-reuniao`
  - `segunda-reuniao`
  - `contorno-objecoes`
  - `green-flag`
  - `documentacao`

Observacao importante:

- o pipeline horizontal atual ja transmite sensacao de jornada continua;
- porem, isso ainda e **composicao visual**;
- nao existe regra de dominio separando formalmente “fim da Prospeccao” e “inicio de Vendas”.

## 3. Estado atual de pipeline/etapa no codigo

## 3.1 Definicoes centrais

Hoje `pipeline` e `etapa` sao definidos principalmente em:

- `modules/crm/crm-engine.ts`
- `modules/crm/crm-pipeline-engine.ts`
- `components/crm/crm-page.tsx`

Em `crm-engine.ts`, os pipelines padrao sao:

- `prospecting`
- `sales`
- `administrative`
- `lost`

As etapas padrao sao:

### Prospecao

- `novos`
- `abertura`
- `conexao`
- `qualificados`
- `no-show`
- `agendamento`

### Vendas

- `primeira-reuniao`
- `segunda-reuniao`
- `contorno-objecoes`
- `green-flag`
- `documentacao`

### Administrativo

- `emissao-contrato`
- `etapa-pagamento`
- `aguardando-assinatura`
- `aprovacao-administradora`

### Perdidos

- `tentativas-contato`
- `apresentou-nao-comprou`
- `cliente-nao-compareceu`
- `nao-esta-no-momento`
- `fechou-concorrente`

## 3.2 Labels atuais

Os labels centrais sao derivados de:

- `crmPipelineLabels`
- `crmStageLabels`

Ou seja: o sistema ja possui um ponto unico razoavelmente claro para rotulos, mas ainda sem camadas especificas para:

- transicao SDR -> closer;
- Green Flag com semantica propria;
- Venda concluida por primeiro boleto pago.

## 3.3 Normalizacao atual

O sistema possui normalizacao de aliases em `crm-engine.ts`, incluindo mapeamentos como:

- `Prospecao` -> `prospecting`
- `Vendas` -> `sales`
- `Perdidos` -> `lost`
- `Green flag` -> `green-flag`
- `No show` -> `no-show`
- `1a reuniao` -> `primeira-reuniao`

Isso e bom para compatibilidade de importacao e leitura de dados antigos, mas **nao substitui um desenho de dominio**.

## 3.4 Movimento de lead hoje

O movimento operacional ocorre em `handleMoveLead()` no `components/crm/crm-page.tsx`.

Fluxo atual:

1. resolve movimento com `resolveCrmLeadMovement(...)`;
2. registra historico com `recordCrmStageChange(...)`;
3. atualiza o mesmo lead com novo `pipeline` e nova `etapa`;
4. persiste por repository.

Diagnostico:

- hoje o sistema **ja suporta transicoes sem duplicar lead**;
- isso e positivo e deve ser preservado;
- a separacao SDR/closer deve continuar sendo feita **por etapa/pipeline real e regras de visibilidade**, nao por duplicacao desnecessaria de registro.

## 4. Estado atual de pipeline/etapa no banco/schema

## 4.1 Tipo local atual

Em `modules/crm/crm-types.ts`, `CrmLead` possui hoje:

- `pipeline`
- `etapa`
- `status`
- `proximaAcao`
- `dataProximaAcao`
- `closedAt`
- `observacoes`

Nao possui:

- `pipeline_real`
- `etapa_real`
- `green_flag_due_date`
- `green_flag_note`
- `green_flag_status`
- `green_flag_owner_profile_id`
- `first_invoice_paid`
- `sales_closed_at`

## 4.2 Schema Supabase atual de `crm_leads`

Pelo repository atual (`modules/crm/repositories/supabase-crm-repository.ts`) e pela migration oficial (`supabase/migrations/20260613_auth_profiles_crm_official_schema.sql`), `crm_leads` possui hoje, entre outros:

- `organization_id`
- `assigned_profile_id`
- `external_id`
- `source_system`
- `nome`
- `telefone`
- `email`
- `origem`
- `consultor`
- `valor_pretendido`
- `observacoes`
- `pipeline`
- `etapa`
- `temperatura`
- `status`
- `proxima_acao`
- `data_proxima_acao`
- `closed_at`
- `titulo_oportunidade`
- `metadata`

Diagnostico:

- o schema atual e suficiente para o CRM compartilhado atual;
- **nao e suficiente** para modelar corretamente Green Flag e revenue recognition.

## 4.3 Stage changes no codigo vs stage changes no banco

No frontend/local:

- `modules/crm/crm-detail-storage.ts` persiste `CrmStageChange` em `evolv.crm.stage-changes.v1`;
- o tipo local guarda:
  - `fromPipeline`
  - `fromStage`
  - `toPipeline`
  - `toStage`
  - `createdAt`

No legado SQL antigo (`supabase/migrations/20260610_crm_shared_schema.sql`):

- `crm_stage_changes` foi desenhada apenas com:
  - `etapa_anterior`
  - `etapa_nova`
  - `created_at`

Diagnostico:

- o **modelo local e mais rico** do que a tabela legada antiga;
- nao ha evidencia, nesta sprint, de que `crm_stage_changes` atual no banco ja esteja consolidada como estrutura oficial para dual pipeline;
- portanto, **nao e seguro assumir que `crm_stage_changes` ja comporta dual pipeline em producao**.

Resposta objetiva:

- **no frontend local: sim, comporta parcialmente**, porque guarda pipeline de origem e destino;
- **no schema legado de banco: nao de forma confiavel**, porque o desenho antigo registra apenas etapa.

## 5. Quais valores reais existem nos 763 leads

Esta sprint foi apenas documental e **nao consultou o banco ao vivo**.

Portanto, ha duas camadas de evidencia:

### 5.1 Confirmado por codigo/documentacao local

O arquivo auditado do PipeRun e a documentacao local (`docs/51_PIPERUN_IMPORT_AUDIT.md`) mostram uma base de **763 registros de origem**, com distribuicao auditada:

#### Funis de origem no PipeRun

- `Prospeccao`: 424
- `Perdidos`: 278
- `Vendas`: 61

#### Etapas de origem encontradas

- `Abertura`: 234
- `Nao conseguiu mais retorno`: 189
- `Conexao`: 72
- `Agendamento`: 62
- `Telefone Incorreto`: 51
- `1a Reuniao`: 38
- `Novos`: 37
- `Nao esta no momento de investir`: 21
- `Qualificados`: 12
- `Cliente nao compareceu a reuniao`: 12
- `Contorno de objecoes`: 12
- `No show`: 7
- `2a Reuniao`: 5
- `Fechou com concorrente`: 5
- `Documentacao`: 4
- `Green flag`: 2

### 5.2 Nao confirmado ao vivo nesta sprint

Nao foi confirmado, nesta sprint, se a distribuicao **atual do banco `crm_leads`** ainda reflete exatamente essa contagem, porque:

- nenhum SQL foi executado;
- nenhuma consulta remota ao Supabase foi feita;
- nao houve leitura live da tabela de producao.

Conclusao segura:

- os **valores de origem documentados** dos 763 registros sao conhecidos;
- a **distribuicao atual em producao** deve ser tratada como **nao confirmada nesta sprint**.

## 6. Como a importacao PipeRun mapeou etapas

Em `modules/crm/import/piperun-import-engine.ts`:

- `pipeline` recebe `row.funil`;
- `etapa` recebe `row.etapa`;
- `status` e normalizado;
- a normalizacao final acontece depois, na leitura/normalizacao do CRM.

Pelos aliases e pela documentacao local, o mapeamento atual esperado inclui:

- `Prospeccao` -> `prospecting`
- `Vendas` -> `sales`
- `Perdidos` -> `lost`
- `Novos` -> `novos`
- `Abertura` -> `abertura`
- `Conexao` -> `conexao`
- `Agendamento` -> `agendamento`
- `1a Reuniao` -> `primeira-reuniao`
- `2a Reuniao` -> `segunda-reuniao`
- `Contorno de objecoes` -> `contorno-objecoes`
- `Green flag` -> `green-flag`
- `Documentacao` -> `documentacao`
- `No show` -> `no-show`

Casos de adaptacao ja conhecidos:

- `Nao conseguiu mais retorno` tende a cair em `tentativas-contato`
- `Telefone Incorreto` nao possui etapa propria clara no modelo atual

## 7. Mapa operacional proposto

## 7.1 Prospecao

Fluxo recomendado:

1. `novos`
2. `abertura`
3. `conexao`
4. `qualificados`
5. `agendamento`
6. `no-show`

Regra recomendada:

- `agendamento` continua pertencendo a **Prospecao**;
- ao avancar comercialmente, o mesmo lead deve entrar em **Primeira Reuniao** no funil de Vendas sem duplicacao;
- `no-show` deve continuar como retorno operacional para Prospecao.

## 7.2 Vendas

Fluxo recomendado:

1. `primeira-reuniao`
2. `segunda-reuniao`
3. `contorno-objecoes`
4. `green-flag`
5. `documentacao`

Observacao:

- `green-flag` nao deve ser tratado apenas como “mais uma coluna”;
- ele e um **estado comercial com deadline e contexto proprio**.

## 7.3 Green Flag

Green Flag deve ser modelado como:

- etapa visivel em Vendas;
- mais metadados dedicados no lead;
- regras futuras de deadline/alerta;
- operacoes especificas de retomada.

Campos recomendados no futuro:

- `green_flag_due_date`
- `green_flag_note`
- `green_flag_status`
- `green_flag_owner_profile_id` ou equivalente
- opcionalmente `green_flag_last_action_at`

## 7.4 No Show

`No Show` deve continuar associado ao dominio de Prospecao, porque:

- representa ruptura de comparecimento antes da consolidacao do fluxo de venda;
- operacionalmente ele devolve o lead ao circuito de retomada.

## 7.5 Venda concluida

A venda real **nao deve ser reconhecida em `documentacao`**.

O marco correto futuro deve ser:

- `first_invoice_paid = true`
- e/ou `sales_closed_at` preenchido no momento reconhecido

Isso deve ficar para a Sprint 101E, mas precisa ser previsto no schema para nao amarrar a evolucao.

## 8. Gaps encontrados

1. O modelo atual possui apenas `pipeline` + `etapa`, sem metadados de dominio para Green Flag.
2. Nao existe campo especifico para deadline comercial futuro.
3. Nao existe campo especifico para nota contextual de Green Flag.
4. Nao existe campo especifico para responsavel pela retomada de Green Flag.
5. Nao existe campo especifico para primeiro boleto pago.
6. Nao existe campo tecnico claro para data de fechamento real de venda.
7. O historico local de transicao e melhor que o schema legado antigo de `crm_stage_changes`.
8. A distribuicao atual dos 763 leads em producao nao foi confirmada ao vivo nesta sprint.

## 9. Riscos

### Critico

- Implementar Green Flag apenas como texto em `observacoes`.
- Tratar `documentacao` como venda concluida.
- Duplicar lead para separar SDR e closer.

### Alto

- Criar UI antes de decidir schema.
- Reutilizar `data_proxima_acao` como substituto improvisado de `green_flag_due_date`.
- Assumir que `crm_stage_changes` do banco ja suporta dual pipeline sem auditoria especifica de producao.

### Medio

- Misturar regras de deadline com regra geral de tarefas antes de estabilizar Green Flag.
- Criar alertas sem distinguir “vence em 5 dias”, “vencido” e “vencido ha 30 dias”.

## 10. Recomendacoes

1. Preservar o principio atual de **um lead, um registro, sem duplicacao**.
2. Formalizar Prospecao e Vendas como dominios de transicao, nao como copias do lead.
3. Tratar `Green Flag` como etapa + metadados dedicados.
4. Separar **schema primeiro**, **UI depois**, **acoes depois**, **deadline depois**, **dashboard depois**, **revenue recognition por ultimo**.
5. Auditar ou redesenhar `crm_stage_changes` antes de qualquer dependencia forte em historico multi-funil.

## 11. Proposta de ordem de implementacao

### 101B.1 - schema/proposal

Objetivo:

- decidir modelo oficial de dual pipeline;
- propor SQL e campos futuros;
- definir se Green Flag fica em `crm_leads` ou em tabela auxiliar.

### 101B.2 - UI read-only labels

Objetivo:

- refletir novo dominio no frontend sem acao destrutiva;
- mostrar labels mais precisos;
- evitar alterar comportamento ainda.

### 101B.3 - stage transition actions

Objetivo:

- implementar acoes operacionais:
  - passar para Green Flag;
  - voltar para No Show;
  - enviar para Primeira Reuniao;
  - marcar perdido.

### 101C - Deadline Engine

Objetivo:

- ativar:
  - 5 dias antes -> quentes sem acao;
  - apos vencimento -> acoes vencidas;
  - persistencia de janela de 30 dias.

### 101D - Dashboard

Objetivo:

- visualizacao executiva de Green Flags, vencimentos e retomadas.

### 101E - Revenue Recognition

Objetivo:

- registrar venda concluida somente com primeiro boleto pago;
- separar “avanco comercial” de “receita reconhecida”.

## 12. O que NAO deve ser implementado ainda

- deadline engine real;
- dashboard executivo de Green Flag;
- revenue recognition;
- duplicacao de lead SDR x closer;
- automacoes baseadas em `observacoes`;
- migration destrutiva de dados atuais;
- remocao de funis administrativos/perdidos.

## 13. Impacto em Supabase / RLS / policies

### 13.1 Proxima sprint precisa de SQL?

**Sim, na 101B.1.**

Motivo:

- o modelo atual nao possui colunas suficientes para Green Flag e venda concluida;
- qualquer implementacao segura exigira pelo menos proposta SQL documental;
- possiveis campos futuros:
  - `green_flag_due_date`
  - `green_flag_note`
  - `green_flag_status`
  - `green_flag_owner_profile_id`
  - `first_invoice_paid`
  - `sales_closed_at`

### 13.2 Proxima sprint precisa de RLS/policies?

**Nao necessariamente para aplicar imediatamente, mas sim para planejar corretamente.**

Leitura segura:

- se a 101B.1 for apenas schema/proposal, nao precisa alterar RLS/policies ainda;
- se novas tabelas auxiliares forem propostas e depois implementadas, elas precisarao nascer com estrategia clara de RLS/policies;
- se tudo ficar em `crm_leads`, as policies existentes provavelmente continuarao precisando apenas acomodar novas colunas, sem nova policy separada de imediato.

Conclusao pratica:

- **101B.1 precisa mapear impacto em RLS/policies**;
- **101B.1 nao precisa necessariamente executar mudanca de RLS/policies**.

## 14. Necessidade ou nao de novas migrations futuras

Muito provavelmente sim.

Cenarios mais provaveis:

### Opcao A - Expandir `crm_leads`

Adicionar colunas novas diretamente em `crm_leads`.

Vantagem:

- menor dispersao inicial.

Risco:

- lead fica sobrecarregado com estados especializados.

### Opcao B - `crm_leads` + tabela auxiliar de Green Flag

Exemplo futuro:

- `crm_green_flag_states`
- ou `crm_lead_followup_windows`

Vantagem:

- modelagem mais limpa para deadlines e historico de retomadas.

Risco:

- exige RLS/policies adicionais e wiring maior.

Recomendacao atual:

- para 101B.1, **avaliar primeiro Opcao A como baseline**;
- so migrar para tabela auxiliar se o escopo de Green Flag passar a incluir historico multiplo, varias janelas e auditoria detalhada.

## 15. Checklist para implementacao futura

- confirmar distribuicao atual real dos 763 leads no banco;
- confirmar se `crm_stage_changes` existe e qual schema real esta ativo;
- decidir se Green Flag sera coluna ou entidade auxiliar;
- decidir nomenclatura final de venda concluida;
- decidir se `assigned_profile_id` cobre responsavel da retomada ou se sera necessario campo proprio;
- preparar SQL revisavel antes de qualquer UI funcional;
- revisar impacto em RLS/policies antes de criar tabela nova;
- testar transicao `agendamento -> primeira-reuniao` sem duplicacao;
- testar retorno `primeira-reuniao -> no-show`;
- testar casos `green-flag -> primeira-reuniao`, `green-flag -> segunda-reuniao`, `green-flag -> perdido`.

## 16. Rollback conceitual

Como esta sprint e apenas documental, o rollback e trivial:

- nao aplicar nenhuma migration;
- nao alterar schema;
- nao alterar RLS/policies;
- nao alterar UI funcional.

Para sprints futuras:

- schema deve ser aditivo primeiro;
- UI read-only antes de acao;
- acoes antes de automacoes;
- revenue recognition por ultimo.

## 17. Proxima sprint recomendada

**Sprint 101B.1 - Schema / Proposal**

Motivo:

- e o menor passo seguro;
- responde os gaps de dominio sem mexer ainda na operacao do Bruno;
- reduz risco de criar UI apoiada em estrutura insuficiente.
