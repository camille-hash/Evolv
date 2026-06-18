# Sprint 103A.16 — Commercial Task Completion Action

## Objetivo

Implementar a conclusao operacional minima de Commercial Tasks diretamente no Dossie do Lead, fechando o ciclo:

1. Criar tarefa.
2. Visualizar tarefa.
3. Concluir tarefa.

## Escopo implementado

- O bloco `Proxima Acao` agora exibe a acao `Concluir acao` quando existe tarefa pendente.
- A conclusao usa o endpoint existente `PATCH /api/crm/tasks/[taskId]/complete`.
- A UI recarrega as tarefas do lead apos sucesso.
- A tarefa concluida sai da visualizacao principal porque o bloco continua exibindo apenas a proxima tarefa pendente.
- Se existir outra tarefa pendente, ela passa a aparecer automaticamente.
- Se nao existir outra tarefa pendente, o estado vazio existente permanece.

## Arquivos alterados

- `components/crm/crm-lead-detail.tsx`
- `modules/crm/client/crm-tasks-client.ts`

## Arquivos criados

- `docs/82-sprint-103a16-commercial-task-completion-action.md`

## API utilizada

```text
PATCH /api/crm/tasks/[taskId]/complete
```

O frontend envia apenas o bearer token e o identificador da tarefa via rota. Nenhum campo de ownership, organizacao, autor, status, `completed_at` ou `completed_by` e enviado pela UI.

## Estados de interface

- Carregamento: o botao mostra `Concluindo...` e fica desabilitado.
- Sucesso: exibe `Acao concluida.` e recarrega a lista de tarefas do lead.
- Erro: exibe mensagem segura em portugues no bloco `Proxima Acao`, preservando o restante do Dossie.
- Vazio: mantem `Sem proxima acao` e `Nenhuma acao programada.`

## Fora do escopo

- Cancelamento de tarefa.
- Edicao de tarefa.
- Motivo de cancelamento.
- Note-to-task.
- Timeline unificada.
- Meu Dia baseado em tarefas.
- Pipeline baseado em tarefas.
- Notificacoes, lembretes, automacoes ou scheduler.
- Integracao com propostas ou simulacoes.

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
