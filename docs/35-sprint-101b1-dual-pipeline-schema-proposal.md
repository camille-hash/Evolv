# Sprint 101B.1 - Dual Pipeline Schema / Proposal

## 1. Resumo executivo

Esta sprint consolida a proposta de schema para permitir a evolucao segura do CRM do EVOLV em torno de:

- funil de Prospecao;
- funil de Vendas;
- transicoes sem duplicacao de lead;
- Green Flag com data de retomada e contexto;
- historico auditavel de mudancas de etapa;
- futura Deadline Engine;
- futura Revenue Recognition baseada em primeiro boleto pago.

O diagnostico da Sprint 101B.0 permaneceu valido:

- o modelo atual `pipeline + etapa` e suficiente para a operacao basica;
- ele **nao e suficiente** para Green Flag, No Show operacional, deadlines futuros e fechamento financeiro confiavel;
- o sistema ja preserva bem o principio de **um lead, um registro**, e isso deve continuar.

Decisao recomendada nesta sprint:

**Modelo hibrido.**

1. Evoluir `public.crm_leads` com poucas colunas de snapshot/dominio.
2. Criar `public.crm_stage_events` para historico auditavel.
3. Criar `public.crm_green_flags` para ciclos de retomada e prazos de Green Flag.

Essa abordagem preserva compatibilidade com o app atual, reduz risco sobre os 763 leads e evita sobrecarregar `crm_leads` com historico repetitivo.

## 2. Estado atual

## 2.1 `crm_leads`

O schema oficial atual de `public.crm_leads` ja contem:

- `organization_id`
- `assigned_profile_id`
- `external_id`
- `source_system`
- `nome`
- `telefone`
- `email`
- `pais`
- `origem`
- `consultor`
- `valor_pretendido`
- `observacoes`
- `pipeline`
- `etapa`
- `tags`
- `produto_interesse`
- `temperatura`
- `status`
- `proxima_acao`
- `data_proxima_acao`
- `closed_at`
- `titulo_oportunidade`
- `metadata`
- `created_at`
- `updated_at`

Esse schema e compatível com o CRM atual, mas nao possui colunas especificas para:

- dominio real de pipeline/etapa apos evolucao;
- Green Flag;
- primeiro boleto pago;
- venda concluida;
- ultimo momento de mudanca de etapa.

## 2.2 `crm_stage_changes`

No frontend/localStorage, o historico atual e mais rico:

- `fromPipeline`
- `fromStage`
- `toPipeline`
- `toStage`
- `createdAt`

Mas a tabela legada antiga `crm_stage_changes`, documentada em migrations anteriores, foi desenhada com apenas:

- `etapa_anterior`
- `etapa_nova`
- `created_at`

Problema:

- o modelo antigo de banco nao representa bem transicoes entre dominios;
- nao guarda ator, motivo, nota ou tipo de evento;
- nao deve ser considerado base suficiente para Dual Pipeline.

## 2.3 Leitura e escrita do app hoje

O app atual:

- le `pipeline` e `etapa` diretamente de `crm_leads`;
- atualiza `pipeline` e `etapa` ao mover um lead;
- registra stage changes localmente;
- nao usa ainda uma camada formal de eventos de etapa no Supabase;
- nao possui UI para Green Flag com prazo e contexto proprio.

## 3. Problema do modelo atual

Hoje o CRM trata estados como:

- `agendamento`
- `no-show`
- `primeira-reuniao`
- `green-flag`
- `documentacao`

como simples etapas lineares.

Isso gera quatro problemas de dominio:

1. `Agendamento` e passagem para `Primeira Reuniao` ainda dependem de regra operacional implícita.
2. `No Show` nao tem estrutura formal para retorno ao funil certo.
3. `Green Flag` existe como etapa, mas nao como ciclo de retomada com prazo.
4. `Venda concluida` ainda nao possui marco tecnico separado de `documentacao`.

## 4. Opcoes de schema consideradas

## 4.1 Opcao A - Tudo em `crm_leads`

Adicionar diretamente em `crm_leads`:

- `pipeline_domain`
- `stage_domain`
- `green_flag_due_date`
- `green_flag_note`
- `green_flag_status`
- `green_flag_created_at`
- `green_flag_resolved_at`
- `first_invoice_paid`
- `first_invoice_paid_at`
- `sales_closed_at`
- `last_stage_changed_at`

### Vantagens

- leitura simples;
- menos joins;
- implementacao rapida.

### Desvantagens

- ruim para historico;
- ruim para multiplos ciclos de Green Flag;
- ruim para auditoria;
- mistura snapshot atual com eventos passados.

## 4.2 Opcao B - Tudo em tabelas auxiliares

Manter `crm_leads` quase intacta e mover Green Flag, stage history e snapshots para novas tabelas.

### Vantagens

- modelagem mais pura;
- historico melhor.

### Desvantagens

- complexidade alta cedo demais;
- risco maior para wiring futuro;
- mais impacto em RLS/policies;
- custo maior para manter compatibilidade com o app atual.

## 4.3 Opcao C - Modelo hibrido

Evoluir `crm_leads` com **snapshot minimo** e criar tabelas auxiliares para **historico e ciclos**.

### Vantagens

- preserva compatibilidade;
- suporta auditoria;
- evita colunas demais em `crm_leads`;
- prepara Green Flag e Revenue Recognition sem refatoracao ampla.

### Desvantagens

- exige disciplina para nao duplicar fonte de verdade;
- precisara de contrato claro entre snapshot e eventos.

## 5. Decisao recomendada

**Opcao C - modelo hibrido.**

### 5.1 Evoluir `crm_leads` com snapshot minimo

Adicionar:

- `pipeline_domain text`
- `stage_domain text`
- `last_stage_changed_at timestamptz`
- `first_invoice_paid boolean not null default false`
- `first_invoice_paid_at timestamptz`
- `sales_closed_at timestamptz`

### 5.2 Criar `crm_stage_events`

Tabela para historico auditavel de transicoes:

- origem e destino;
- ator;
- tipo do evento;
- nota opcional;
- payload opcional;
- timestamp.

### 5.3 Criar `crm_green_flags`

Tabela para ciclos de Green Flag:

- data de retomada;
- nota/contexto;
- status;
- responsavel opcional;
- referencia ao lead;
- referencia opcional ao evento de etapa que originou o Green Flag.

## 6. Justificativa

Essa decisao foi escolhida porque:

1. **nao quebra o CRM atual**;
2. **nao exige migrar os 763 leads agora**;
3. preserva `pipeline` e `etapa` atuais como contrato de compatibilidade;
4. permite evoluir UI depois sem reabrir o schema toda hora;
5. evita usar `observacoes` como deposito informal de regras comerciais;
6. prepara o terreno para 101C, 101D e 101E.

## 7. Schema recomendado

## 7.1 `crm_leads`

Colunas novas recomendadas:

- `pipeline_domain text`
- `stage_domain text`
- `last_stage_changed_at timestamptz`
- `first_invoice_paid boolean not null default false`
- `first_invoice_paid_at timestamptz`
- `sales_closed_at timestamptz`

### Observacao importante

Nesta proposta, **nao** foi recomendado adicionar diretamente em `crm_leads`:

- `green_flag_due_date`
- `green_flag_note`
- `green_flag_status`
- `green_flag_created_at`
- `green_flag_resolved_at`

Motivo:

- Green Flag pode ocorrer mais de uma vez;
- precisa de historico proprio;
- nao deve poluir a tabela principal com campos repetitivos de ciclo.

## 7.2 `crm_stage_events`

Campos propostos:

- `id uuid primary key`
- `organization_id uuid not null`
- `lead_id uuid not null`
- `actor_profile_id uuid null`
- `event_type text not null`
- `from_pipeline text null`
- `from_stage text null`
- `to_pipeline text null`
- `to_stage text null`
- `note text null`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Uso esperado:

- registrar mudanca manual de etapa;
- registrar entrada em Green Flag;
- registrar retorno de Green Flag;
- registrar No Show;
- preparar auditoria futura.

## 7.3 `crm_green_flags`

Campos propostos:

- `id uuid primary key`
- `organization_id uuid not null`
- `lead_id uuid not null`
- `stage_event_id uuid null`
- `created_by_profile_id uuid null`
- `assigned_profile_id uuid null`
- `resolved_by_profile_id uuid null`
- `status text not null`
- `due_date date not null`
- `note text null`
- `context text null`
- `resolved_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `metadata jsonb not null default '{}'::jsonb`

Uso esperado:

- ciclo atual de retomada;
- remarcacoes futuras;
- base de deadline engine;
- base de dashboard futuro.

## 8. Impacto em dados reais

Risco direto sobre os 763 leads:

- **baixo**, se a aplicacao futura seguir a proposta aditiva;
- nenhuma coluna atual precisa ser removida;
- `pipeline` e `etapa` continuam existindo;
- novas tabelas podem nascer vazias;
- nenhum backfill destrutivo e necessario na fase inicial.

Riscos reais:

- preencher `pipeline_domain` e `stage_domain` cedo demais com regra errada;
- assumir mapeamento completo sem antes validar casos legados;
- criar constraints fortes antes de conferir dados reais.

## 9. Impacto em Supabase

A proxima sprint de apply devera:

- adicionar colunas em `crm_leads`;
- criar `crm_stage_events`;
- criar `crm_green_flags`;
- criar indices;
- habilitar RLS nas novas tabelas;
- evitar qualquer policy ampla ou anon.

Importante:

- a proposta **nao** exige alterar `profiles`;
- **nao** exige alterar `organizations`;
- **nao** exige mudar `crm_leads` existente de forma destrutiva;
- **nao** exige alterar o app ainda.

## 10. Impacto em RLS / policies

## 10.1 `crm_leads`

Novas colunas em `crm_leads` nao exigem, por si so, nova policy imediata, desde que:

- as policies existentes continuem valendo para a tabela inteira;
- nenhum novo caminho frontend dependa delas imediatamente.

## 10.2 `crm_stage_events`

Como e tabela nova e sensivel:

- deve nascer com **RLS habilitado**;
- **sem acesso anon**;
- sem policy ampla `using (true)`;
- idealmente sem uso imediato pelo frontend até sprint posterior.

## 10.3 `crm_green_flags`

Mesma regra:

- **RLS habilitado**;
- **sem acesso anon**;
- policies futuras por `organization_id`;
- leitura e escrita so por usuarios autenticados da mesma organizacao.

Conclusao pratica:

- **sim, a proxima sprint de apply deve mexer em RLS/policies das tabelas novas**;
- **nao precisa abrir policy nova ampla em `crm_leads` agora**.

## 11. SQL proposto

Os arquivos desta sprint foram criados como proposta futura:

- `supabase/sql/20260616_sprint101b1_dual_pipeline_schema_proposal.sql`
- `supabase/sql/20260616_sprint101b1_dual_pipeline_schema_validation.sql`
- `supabase/sql/20260616_sprint101b1_dual_pipeline_schema_rollback.sql`

Eles:

- nao foram executados;
- sao aditivos;
- usam `if not exists` quando possivel;
- nao alteram dados existentes;
- nao removem colunas atuais;
- nao desabilitam RLS;
- nao liberam anon.

## 12. Estrategia de validacao

Validacoes futuras recomendadas antes de wiring do app:

1. Confirmar existencia das colunas novas em `crm_leads`.
2. Confirmar criacao das tabelas novas.
3. Confirmar FKs e indices.
4. Confirmar RLS ativa nas tabelas novas.
5. Confirmar que `crm_leads` manteve a mesma contagem.
6. Confirmar que nenhuma policy anon foi criada nas tabelas novas.

## 13. Estrategia de rollback

Rollback conceitual futuro:

- usar rollback apenas antes de qualquer uso real das novas tabelas;
- ou apos backup/aprovacao explicita;
- remover tabelas novas primeiro;
- remover colunas novas depois;
- nunca tocar em `pipeline` e `etapa` atuais no rollback desta fase.

## 14. Riscos

### Criticos

- transformar Green Flag em simples texto livre sem ciclo proprio;
- reconhecer venda em `documentacao`;
- criar tabela nova sem RLS.

### Altos

- aplicar policy ampla por comodidade;
- assumir que `crm_stage_changes` legado resolve historico futuro;
- escrever UI antes do schema ser aprovado.

### Medios

- adicionar colunas demais em `crm_leads`;
- misturar snapshot atual com historico passado sem regra clara.

## 15. Fora do escopo

Esta sprint nao implementa:

- UI;
- Dual Pipeline funcional;
- Deadline Engine;
- Dashboard;
- Revenue Recognition;
- backfill de dados;
- alteracao no app;
- alteracao em Supabase;
- alteracao em Auth;
- deploy;
- execucao de SQL.

## 16. Proxima sprint recomendada

**Sprint 101B.2 - Dual Pipeline Schema Apply**

Condicao:

- somente se esta proposta for aprovada.

Escopo esperado da 101B.2:

- executar manualmente o SQL aprovado;
- validar estrutura;
- ainda sem ligar UI funcional.
