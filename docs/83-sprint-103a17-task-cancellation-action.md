# Sprint 103A.17 — Task Cancellation Action

## Objetivo

Implementar o cancelamento operacional V1 de Commercial Tasks diretamente no bloco `Proxima Acao` do Dossie do Lead.

Cancelar tarefa nao exclui registro, nao apaga historico e nao remove rastreabilidade. A tarefa permanece registrada com `status = canceled`, `canceled_at` e `canceled_by`, conforme a logica server-side existente.

## Escopo implementado

- O bloco `Proxima Acao` agora exibe a acao `Cancelar acao` quando existe tarefa pendente.
- O cancelamento usa o endpoint existente `PATCH /api/crm/tasks/[taskId]/cancel`.
- A UI recarrega as tarefas do lead apos sucesso.
- A tarefa cancelada sai da visualizacao principal porque o bloco continua exibindo apenas tarefas pendentes.
- Se existir outra tarefa pendente, ela passa a aparecer automaticamente.
- Se nao existir outra tarefa pendente, o estado vazio existente permanece.

## Arquivos alterados

- `components/crm/crm-lead-detail.tsx`
- `modules/crm/client/crm-tasks-client.ts`

## Arquivos criados

- `docs/83-sprint-103a17-task-cancellation-action.md`

## API utilizada

```text
PATCH /api/crm/tasks/[taskId]/cancel
```

O frontend envia apenas o bearer token e o identificador da tarefa via rota. Nenhum motivo de cancelamento e enviado nesta V1.

## Campos nao enviados pela UI

- `organization_id`
- `created_by`
- `assigned_user_id`
- `status`
- `canceled_at`
- `canceled_by`
- motivo de cancelamento

## Estados de interface

- Carregamento: o botao mostra `Cancelando...` e as acoes da tarefa ficam desabilitadas.
- Sucesso: exibe `Acao cancelada.` e recarrega a lista de tarefas do lead.
- Erro: exibe mensagem segura em portugues no bloco `Proxima Acao`, preservando o restante do Dossie.
- Vazio: mantem o estado existente `Sem proxima acao` e `Nenhuma acao programada.`

## Fora do escopo

- Motivo de cancelamento.
- Edicao de tarefa.
- Exclusao de tarefa.
- Timeline unificada.
- Meu Dia baseado em tarefas.
- Pipeline Task Sync.
- Notificacoes, lembretes, automacoes ou scheduler.

## Governanca

- Nenhum SQL foi criado.
- Nenhum SQL foi executado.
- Nenhuma migration foi criada.
- Nenhum schema foi alterado.
- Nenhum RLS foi alterado.
- Nenhuma policy foi alterada.
- Nenhum fluxo de Auth foi alterado.
- Nenhum endpoint novo foi criado.

## Validacoes

- `npm.cmd run typecheck`: passou.
- `npm.cmd run lint`: passou com 4 warnings preexistentes em `components/crm/crm-page.tsx`.
- `npm.cmd run build`: passou.
