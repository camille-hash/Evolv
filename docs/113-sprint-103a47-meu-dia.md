# Sprint 103A.47 - Meu Dia

## Objetivo

Transformar a aba Meu Dia em uma visao operacional derivada que responde o que merece atencao agora. A implementacao nao cria entidade, tabela, cache persistido, score ou agenda paralela.

## Read model

GET /api/crm/my-day e um read model autenticado e somente leitura. Ele reutiliza as fontes existentes sob a sessao do usuario e RLS:

- crm_tasks;
- crm_lead_notes;
- crm_lead_simulations;
- eventos derivados da Timeline operacional;
- crm-green-flags.ts.

O servidor resolve a sessao e o profile ativo, consulta somente registros da organizacao atual e monta a resposta em memoria. Tarefas exibidas na fila pertencem ao usuario autenticado e estao pendentes. As Green Flags sao calculadas pela mesma utility utilizada no Dossie; elas nao sao persistidas.

## Comportamento visual

A aba apresenta quatro blocos, nesta ordem:

1. Tarefas vencidas, ordenadas da mais antiga para a mais recente.
2. Tarefas com vencimento hoje, em ordem cronologica.
3. Green Flags, com o lead, a quantidade e as explicacoes derivadas.
4. Proximas acoes, com tarefas futuras em ordem cronologica.

Cada item abre o Dossie do lead correspondente. Quando nao houver itens, a tela informa Nenhuma acao pendente para hoje. Estados de carregamento e erro tambem preservam a navegacao existente.

## Arquivos

- Criado: modules/crm/crm-my-day.ts.
- Criado: modules/crm/client/crm-my-day-client.ts.
- Criado: modules/crm/server/crm-my-day-service.ts.
- Criado: app/api/crm/my-day/route.ts.
- Alterado: components/crm/crm-page.tsx.
- Alterado: modules/crm/crm-green-flags.ts.
- Alterado: modules/crm/index.ts.

## Limites

O read model nao altera lead, tarefa, nota, simulacao, Timeline, Auth, RLS ou policy. Nao ha cron, notificacao, IA, KPI, grafico ou persistencia propria de Meu Dia.

## Validacoes tecnicas

- npm.cmd run typecheck: aprovado.
- npm.cmd run lint: aprovado com quatro warnings preexistentes em components/crm/crm-page.tsx para simbolos nao utilizados; nenhum warning novo foi introduzido.
- npm.cmd run build: aprovado, incluindo a rota dinamica /api/crm/my-day.
- git diff --check: aprovado.

## Validacao manual recomendada

1. Entrar com usuario autenticado e abrir a aba Meu Dia.
2. Confirmar tarefas vencidas ordenadas pela data mais antiga.
3. Confirmar tarefas de hoje em ordem de horario.
4. Abrir um item e confirmar que o Dossie do lead correspondente abre.
5. Confirmar leads com Green Flags e o estado vazio quando nao houver itens.

## Proxima sprint recomendada

Sprint 103A.48 - refinamento operacional de Meu Dia apos uso real, mantendo a view derivada e sem introduzir persistencia propria.
