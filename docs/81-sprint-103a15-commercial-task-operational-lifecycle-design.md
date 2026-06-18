# Sprint 103A.15 - Commercial Task Operational Lifecycle Design

## Objetivo

Auditar e desenhar o ciclo de vida operacional completo das Commercial Tasks antes de continuar a implementacao.

Esta sprint e exclusivamente documental. Nenhum codigo foi implementado, nenhum SQL foi criado ou executado, nenhum banco foi alterado, nenhuma API/rota/repository/componente foi modificado.

Regra central:

```text
Notas lembram. Tarefas executam.
```

## Estado Atual

O EVOLV ja possui:

- tabela `public.crm_tasks`;
- RLS authenticated-only e organization-scoped;
- APIs server-side;
- leitura de tarefas no Dossie;
- modal de criacao de tarefa;
- bloco `Proxima Acao` lendo tarefa pendente real.

O EVOLV ainda nao possui:

- conclusao operacional de tarefa na UI;
- cancelamento operacional de tarefa na UI;
- edicao de tarefa;
- motivo de cancelamento;
- prompt nota -> tarefa;
- timeline operacional unificada;
- `Meu Dia` baseado em tarefas;
- sinal visual do pipeline baseado em tarefas.

## Gaps Encontrados

| Gap | Impacto | Recomendacao |
| --- | --- | --- |
| Tarefa pode ser criada, mas nao concluida pela UI | O ciclo operacional nao fecha | Implementar `Concluir` como proxima acao. |
| Tarefa pode ser criada, mas nao cancelada pela UI | Tarefas que perderam sentido ficam pendentes | Implementar `Cancelar` apos conclusao estar validada. |
| Nao ha motivo de cancelamento | Perde contexto comercial | Exigir motivo curto no cancelamento v1 ou capturar como nota vinculada. |
| Nao ha edicao controlada | Erros de data/titulo exigem nova tarefa | Permitir edicao limitada de pendentes em sprint futura. |
| Nota nao oferece proxima acao | Usuario registra historia, mas pode sair sem plano | Criar prompt leve apos salvar nota. |
| Historico e tarefas estao separados | Dificulta entender linha do tempo comercial | Projetar timeline operacional unificada. |
| `Meu Dia` ainda nao e task-driven | A execucao diaria nao e confiavel | Migrar `Meu Dia` para tarefas pendentes. |
| Pipeline nao sinaliza ausencia/risco de tarefa | Leads podem parecer saudaveis sem proxima acao | Usar tarefa como sinal visual operacional futuro. |

## 1. Conclusao de Tarefa

### Como o usuario conclui uma tarefa?

No Dossie, dentro do bloco `Proxima Acao`, a tarefa pendente deve exibir um botao:

```text
Concluir
```

Ao clicar:

1. UI chama `PATCH /api/crm/tasks/[taskId]/complete`.
2. Servidor valida sessao, profile, organizacao e task.
3. Servidor grava:
   - `status = completed`;
   - `completed_at = now`;
   - `completed_by = current profile id`.
4. UI atualiza a lista de tarefas.
5. O bloco `Proxima Acao` passa para:
   - a proxima pendente mais antiga; ou
   - estado vazio `Sem proxima acao`.

### Onde o botao deve existir?

V1:

- somente no bloco `Proxima Acao` do Dossie;
- visivel apenas quando houver tarefa pendente.

Futuro:

- cards de `Meu Dia`;
- timeline operacional;
- possivel lista de tarefas do lead.

### O que acontece apos concluir?

Fluxo recomendado:

```text
Tarefa concluida
↓
Toast: Acao concluida.
↓
Atualiza Proxima Acao
↓
Opcional futuro: Deseja registrar uma nota?
↓
Opcional futuro: Deseja criar a proxima acao?
```

V1 deve apenas concluir e atualizar. O prompt pos-conclusao deve vir em sprint posterior para evitar sobrecarga no primeiro fechamento do ciclo.

### Como registrar `completed_by`?

O frontend nao envia `completed_by`.

O servidor deve resolver pelo profile autenticado:

```text
completed_by = current profile id
```

### Como registrar `completed_at`?

O frontend nao envia `completed_at`.

O servidor deve gravar:

```text
completed_at = now
```

### Como refletir no historico?

V1:

- a task concluida permanece em `crm_tasks`;
- pode aparecer futuramente na timeline a partir dos campos da propria task;
- nao criar `crm_task_history` ainda.

Futuro:

- adicionar evento `task_completed` em timeline unificada;
- se `crm_task_history` for criado, registrar ator, data e mudanca de status.

## 2. Cancelamento de Tarefa

### Como cancelar?

No Dossie, dentro da tarefa pendente, exibir acao secundaria:

```text
Cancelar
```

Recomendacao de rollout:

- implementar depois de `Concluir`, nao junto, para validar o fechamento positivo primeiro.

### Como justificar cancelamento?

Ao clicar `Cancelar`, abrir confirmacao compacta:

```text
Cancelar acao?
Motivo do cancelamento
```

Campo:

- textarea curto;
- placeholder: `Ex.: cliente pediu retorno em outro momento.`

### Cancelamento deve exigir motivo?

Recomendacao:

```text
Sim, exigir motivo curto.
```

Por que:

- cancelamento sem motivo vira buraco de auditoria;
- ajuda Bruno/Camille a entender por que a acao saiu da fila;
- evita uso de cancelamento como descarte silencioso.

Como persistir no v1:

- nao ha coluna `cancellation_reason`;
- opcoes:
  1. criar nota interna no cancelamento;
  2. aguardar futura `crm_task_history`;
  3. nao persistir motivo.

Recomendacao operacional:

- para v1 de cancelamento, capturar motivo e criar nota interna somente se a sprint autorizar integracao com notas;
- se nao autorizar, nao pedir motivo ainda e apenas documentar que motivo vira requisito da sprint de historico.

Como esta sprint e desenho, recomendacao final:

```text
Cancelamento ideal exige motivo, mas a primeira implementacao pode cancelar sem motivo se ainda nao houver persistencia aprovada para o motivo.
```

### Como registrar `canceled_by`?

O frontend nao envia `canceled_by`.

O servidor resolve:

```text
canceled_by = current profile id
```

### Como registrar `canceled_at`?

O frontend nao envia `canceled_at`.

O servidor grava:

```text
canceled_at = now
```

### Como refletir no historico?

V1:

- task permanece em `crm_tasks` com `status = canceled`;
- Dossie pode ocultar canceladas do bloco principal.

Futuro:

- timeline exibe evento `task_canceled`;
- se houver motivo, exibir resumo;
- `crm_task_history` registra transicao e ator.

## 3. Edicao de Tarefa

### Quando editar?

Editar deve ser permitido quando:

- task esta `pending`;
- usuario precisa corrigir titulo;
- usuario precisa ajustar data;
- usuario precisa ajustar horario;
- usuario precisa ajustar observacao;
- usuario precisa trocar tipo da acao.

### Quando cancelar e recriar?

Cancelar e recriar deve ser preferido quando:

- a acao mudou de natureza comercial;
- tarefa ja foi concluida;
- tarefa ja foi cancelada;
- o registro antigo precisa permanecer como evidencia.

Exemplos:

- `Enviar proposta` virou `Solicitar documentacao`: editar se ainda e a mesma proxima acao.
- `Ligar hoje` foi substituida por uma nova negociacao futura apos contato: concluir/cancelar e criar nova.

### Quais campos podem ser alterados?

V1 futura recomendada:

- `task_type`
- `title`
- `notes`
- `due_date`
- `due_time`

Nao editar:

- `organization_id`
- `lead_id`
- `created_by`
- `created_at`
- `completed_by`
- `completed_at`
- `canceled_by`
- `canceled_at`
- `status` por formulario generico

### Como preservar auditoria?

V1:

- restringir edicao a tarefas pendentes;
- usar `updated_at`;
- nao permitir alteracao generica de status.

Futuro:

- criar `crm_task_history`;
- registrar evento `task_updated`;
- guardar campos alterados de/para;
- registrar ator.

## 4. Relacao Nota -> Tarefa

Fluxo proposto:

```text
Adicionar nota
↓
Salvar nota
↓
Deseja criar proxima acao?
↓
Criar tarefa
```

### E o fluxo ideal?

Sim, desde que seja opcional e leve.

Por que:

- nota captura memoria;
- tarefa captura compromisso;
- o momento apos salvar uma nota e quando o contexto esta fresco;
- evita que Bruno escreva contexto e saia sem proximo passo.

### Alternativas

| Alternativa | Avaliacao |
| --- | --- |
| Converter toda nota automaticamente em tarefa | Ruim. Gera ruido operacional. |
| Botao fixo `Criar tarefa` dentro da nota | Bom, mas menos fluido. |
| Prompt apos salvar nota | Melhor equilibrio v1. |
| IA extrair tarefa da nota | Fora de escopo e prematuro. |

### Como reduzir atrito?

Recomendacao:

- apos nota salva, exibir prompt pequeno:

```text
Nota salva. Criar proxima acao?
[Criar acao] [Agora nao]
```

- se clicar `Criar acao`, abrir o mesmo modal de tarefa;
- pre-preencher observacao com trecho curto opcional somente se for seguro;
- enviar `sourceNoteId` para o servidor;
- nunca criar tarefa automaticamente.

## 5. Historico Operacional Unificado

### Eventos considerados

A timeline futura deve incluir:

- nota criada;
- tarefa criada;
- tarefa concluida;
- tarefa cancelada;
- alteracao de etapa;
- envio de proposta;
- geracao de simulacao.

### Estrutura recomendada

Modelo conceitual de evento:

| Campo | Descricao |
| --- | --- |
| `id` | Identificador do evento ou entidade original |
| `type` | Tipo do evento |
| `lead_id` | Lead relacionado |
| `organization_id` | Organizacao |
| `actor_profile_id` | Autor/ator quando existir |
| `occurred_at` | Data/hora do evento |
| `title` | Texto curto |
| `description` | Contexto |
| `source` | `note`, `task`, `stage`, `proposal`, `simulation` |
| `source_id` | ID da entidade original |

### Estrategia de ordenacao

Ordenar por:

```text
occurred_at desc
```

Empate:

```text
created_at desc
```

Prioridade visual:

1. eventos recentes;
2. tarefa pendente destacada fora da timeline no bloco `Proxima Acao`;
3. historico como consulta secundaria.

### Estrategia de auditoria

V1:

- construir timeline derivada das tabelas existentes;
- nao duplicar dados;
- nao criar tabela de timeline ainda.

Futuro:

- criar `crm_task_history` para mudancas de task;
- considerar `crm_timeline_events` somente se a derivacao ficar cara ou inconsistente;
- manter entidade original como fonte de verdade.

## 6. Meu Dia Baseado em Tarefas

`Meu Dia` deve migrar de indicadores derivados de lead para fila operacional baseada em tarefas.

Categorias recomendadas:

### Atrasadas

```text
status = pending
due_date < today
assigned_user_id = current profile
```

Uso:

- primeira secao do dia;
- precisa de sinal visual forte, mas nao alarmista.

### Hoje

```text
status = pending
due_date = today
assigned_user_id = current profile
```

Uso:

- fila principal de execucao.

### Proximos 7 dias

```text
status = pending
due_date > today
due_date <= today + 7
assigned_user_id = current profile
```

Uso:

- planejamento.

### Concluidas hoje

```text
status = completed
completed_at = today
completed_by = current profile
```

Uso:

- feedback de produtividade;
- motivacao operacional;
- fechamento do dia.

### Sem proxima acao

Leads ativos sem task pendente.

Uso:

- higiene comercial;
- priorizar leads sem plano.

Observacao:

- esta categoria exige consulta combinada entre leads e tarefas;
- deve vir depois do runtime basico de tarefas.

## 7. Pipeline Baseado em Tarefas

O pipeline deve continuar orientado por etapa/funil, mas pode ganhar sinal operacional derivado de tarefas.

### Sem tarefa

Significado:

- lead ativo sem proxima acao.

Sinal visual recomendado:

- borda discreta ou pequeno texto `Sem acao`;
- nao poluir card com muitos badges.

### Tarefa futura

Significado:

- lead tem compromisso agendado.

Sinal visual recomendado:

- card neutro;
- talvez tooltip/copy curta se ja houver area para isso.

### Tarefa hoje

Significado:

- lead requer acao hoje.

Sinal visual recomendado:

- leve destaque operacional;
- nao competir com temperatura manual.

### Tarefa atrasada

Significado:

- lead foi negligenciado operacionalmente.

Sinal visual recomendado:

- usar o sistema de aging/background ja existente com criterio mais forte ou combinado;
- evitar badge excessivo;
- prioridade visual deve ser perceptiva, nao textual demais.

### Impacto visual recomendado

Recomendacao:

```text
Pipeline deve usar tarefas como sinal visual sutil, nao como nova camada de badges.
```

V1 futura:

- manter card limpo;
- usar cor de fundo/borda para risco operacional;
- preservar temperatura manual como julgamento humano.

## Roadmap Recomendado

### Sprint 103A.16 - Task Completion Action

Implementar:

- botao `Concluir` no bloco `Proxima Acao`;
- `PATCH /api/crm/tasks/[taskId]/complete`;
- refresh da lista de tarefas;
- toast `Acao concluida.`;
- sem prompt de nota ainda.

### Sprint 103A.17 - Task Cancellation Design/Implementation

Decidir e implementar:

- botao `Cancelar`;
- se motivo sera exigido;
- se motivo vira nota interna;
- `PATCH /api/crm/tasks/[taskId]/cancel`;
- refresh da lista.

### Sprint 103A.18 - Task Edit Design

Desenhar:

- edicao limitada de tarefas pendentes;
- campos editaveis;
- quando cancelar/recriar.

### Sprint 103A.19 - Note-to-Task Bridge

Implementar:

- prompt apos nota salva;
- reuso do modal de tarefa;
- `sourceNoteId`;
- sem automacao.

### Sprint 103A.20 - Operational Timeline Design

Desenhar:

- timeline derivada;
- eventos exibidos;
- ordenacao;
- autoria.

### Sprint 103A.21 - Meu Dia Task Runtime

Implementar:

- atrasadas;
- hoje;
- proximos 7 dias;
- concluidas hoje;
- sem proxima acao.

### Sprint 103A.22 - Pipeline Task Signal Design

Desenhar:

- sinal visual por tarefa;
- integracao com aging;
- evitar poluicao visual.

## Recomendacoes

1. Implementar `Concluir` antes de `Cancelar`.
2. Manter cancelamento sem hard delete.
3. Exigir motivo de cancelamento apenas quando houver decisao clara de persistencia do motivo.
4. Nao editar tarefas concluidas/canceladas em v1.
5. Usar o mesmo modal de tarefa para note-to-task, sem automacao.
6. Criar timeline derivada antes de criar nova tabela de historico.
7. Migrar `Meu Dia` para tarefas somente depois de conclusao/cancelamento estarem estaveis.
8. Usar sinais visuais no pipeline com parcimonia, preservando a temperatura manual.

## Confirmacoes

- Nenhum codigo foi implementado nesta sprint.
- Nenhuma UI foi criada ou alterada.
- Nenhum SQL foi criado ou executado.
- Nenhuma migration foi criada.
- Nenhum banco foi alterado.
- Nenhuma policy foi alterada.
- Nenhum RLS foi alterado.
- Nenhum repository foi alterado.
- Nenhuma API/rota foi alterada.
- Nenhum componente foi alterado.
