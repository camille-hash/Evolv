# Sprint 103A.53 - Dashboard Executivo Comercial

## Objetivo

Criar a primeira camada gerencial do EVOLV por meio de um dashboard somente leitura, derivado em memória dos dados já existentes no CRM.

O dashboard não cria score, previsão, probabilidade, inteligência artificial, recomendação, automação ou persistência. Também não altera regras comerciais, Timeline, Meu Dia, Tasks, Check Points, Simulações, PDFs, Pipeline ou Dossiê.

## Governança consultada

Foram lidos os documentos disponíveis em `docs/` e auditado o histórico recente de `main`.

Documentos explicitamente encontrados:

- `docs/112-sprint-103a46-green-flags-engine-v1.md`;
- `docs/113-sprint-103a47-meu-dia.md`.

Não existem em `main`, nem por nome nem por referência textual em `docs/`, documentos correspondentes a 103A.50, 103A.51, 103A.52, 103A.52-R1, 103A.52-R2 ou 103A.52-R3. A arquitetura posterior foi confirmada pelo histórico de commits: busca rápida, filtros avançados, temperatura manual e correções da resolução de próxima ação e horário de vencimento. Nenhuma regra ausente foi presumida.

## Indicadores

### Linha 1

- **Leads Totais:** quantidade de registros carregados de `crm_leads` pelo repositório já existente.
- **Leads Quentes:** quantidade de leads com `temperatura === "quente"` e percentual sobre o total da base.
- **Ações Vencidas:** quantidade de leads cujo próximo item pendente, resolvido por `resolveNextPendingCrmTask`, é classificado como vencido por `resolveCrmTaskTemporalStatus`.
- **Sem Próxima Ação:** quantidade de leads sem tarefa pendente retornada por `resolveNextPendingCrmTask`.

### Linha 2

- **Distribuição de Temperaturas:** Fria, Morna e Quente, usando somente os valores válidos do tipo `CrmTemperature`.
- **Distribuição por Etapa:** agrupamento pelos valores reais de `lead.etapa`; o label vem de `crmStageLabels` quando existe e, caso contrário, preserva o valor cadastrado. Categorias vazias ou inventadas não são criadas.

### Linha 3

- **Check Points:** leads com Check Points, leads sem Check Points e soma dos Check Points derivados pela engine existente.
- **Simulações:** leads com ao menos uma simulação, total de simulações e leads com ao menos um estudo `multi_cotas`.
- **Atividade Recente:** leads com `updatedAt` nos últimos 30 dias e leads fora dessa janela.

## Arquivos criados

- `modules/crm/crm-executive-dashboard.ts`: read model puro que consolida contagens e distribuições em memória.
- `components/crm/crm-executive-dashboard.tsx`: interface somente leitura no layout executivo 4-2-3.
- `docs/114-sprint-103a53-dashboard-executivo-comercial.md`: documentação da sprint.

## Arquivos alterados

- `components/crm/crm-page.tsx`: adiciona a aba `Dashboard Executivo` antes de `Meu Dia`, carrega simulações pelo GET já existente e conecta o read model à interface.
- `modules/crm/index.ts`: exporta o novo read model.
- `tsconfig.json`: exclui o app independente `patrion-simulator/` do typecheck do EVOLV.
- `eslint.config.mjs`: exclui o app independente `patrion-simulator/` do lint do EVOLV.

Nenhum arquivo dentro de `patrion-simulator/` foi alterado.

## Regras reutilizadas

- `resolveNextPendingCrmTask` para selecionar a próxima tarefa pendente de cada lead;
- `resolveCrmTaskTemporalStatus` para classificar a próxima tarefa como vencida, hoje ou futura, incluindo a regra vigente de horário;
- `greenFlagsByLeadId` do read model existente de Meu Dia, já produzido por `resolveCrmLeadGreenFlags`, como fonte de Check Points;
- `listCrmLeadsFromRepository` como origem dos leads já usados pelo CRM;
- GET `/api/crm/lead-simulations?leadId=...` já existente para leitura tipada das simulações de cada lead;
- `crmStageLabels` e os valores reais de `lead.etapa` para a distribuição por etapa;
- `updatedAt` do lead como única fonte da atividade recente.

## Arquitetura e limites

O novo módulo é uma utility pura: não acessa rede, banco, storage ou APIs. Recebe os conjuntos já lidos e devolve um objeto de apresentação.

A aba executiva usa o read model de Meu Dia já carregado para tarefas e Check Points. A contagem exata de simulações é obtida em modo somente leitura pelo endpoint GET já existente, uma consulta por lead, porque o contrato atual de Meu Dia expõe apenas a data da última simulação e a presença de Multi-Cotas. Nenhum endpoint foi criado ou alterado.

Quando os dados operacionais ou de simulações não estão disponíveis, os cards dependentes mostram `—` e uma mensagem de indisponibilidade; o dashboard não apresenta zero como se fosse uma contagem confirmada.

## Validações

- `npm.cmd run typecheck`: aprovado após separar o escopo TypeScript do standalone.
- `npm.cmd run lint`: aprovado sem erros; permanecem quatro warnings preexistentes em `components/crm/crm-page.tsx`.
- `npm.cmd run build`: aprovado; todas as rotas existentes foram compiladas sem nova rota.
- `git diff --check`: aprovado.
- busca estática por artefatos proibidos: aprovada; nenhum caminho SQL, migration, API, Timeline, Meu Dia, Tasks, Simulações, PDF, Pipeline ou Dossiê foi criado ou alterado.
- smoke test público no navegador: aplicação iniciou e exibiu corretamente o login protegido por Supabase Auth, sem erro de console.
- smoke test autenticado do dashboard: não executado porque não havia sessão autenticada no navegador; Auth não foi contornado e nenhuma credencial foi presumida.

## Ausências confirmadas

Esta sprint não cria:

- SQL, migration, tabela, view, materialized view, trigger, cron, RPC, policy ou RLS;
- endpoint ou alteração de endpoint;
- persistência, cache ou storage;
- score, ranking, previsão, probabilidade, insight, recomendação ou sugestão automática;
- alteração em Timeline, Meu Dia, Tasks, Check Points, Simulações, PDFs, Pipeline ou Dossiê.
