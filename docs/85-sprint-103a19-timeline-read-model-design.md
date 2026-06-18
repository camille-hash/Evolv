# Sprint 103A.19 — Timeline Read Model Design

## Objetivo

Projetar exclusivamente o Read Model da Timeline Operacional do EVOLV.

Esta sprint nao implementa UI, nao implementa queries, nao altera banco, nao cria SQL, nao cria migrations, nao cria tabelas e nao altera codigo existente.

Decisao herdada da Sprint 103A.18:

```text
Timeline Operacional V1 = derivada server-side, sem event store e sem nova tabela.
```

## Contexto

O EVOLV ja possui:

- Supabase Auth;
- multi-organizacao;
- CRM Leads;
- CRM Notes;
- CRM Tasks;
- Proxima Acao;
- Dossie do Lead;
- RLS validado;
- criacao de tarefa;
- conclusao de tarefa;
- cancelamento de tarefa.

Ainda nao existe Timeline Operacional unificada.

A timeline deve responder:

```text
O que aconteceu com este lead?
Quem fez?
Quando fez?
```

## Principios do Read Model

1. A timeline e uma visao derivada.
2. A fonte de verdade continua sendo a entidade original.
3. V1 nao cria tabela de eventos.
4. V1 nao cria historico duplicado.
5. V1 deve ser montada server-side.
6. V1 deve resolver autoria server-side quando possivel.
7. V1 deve usar fallback honesto quando a autoria nao existir.
8. V1 deve ser ordenada por `occurredAt DESC`.
9. V1 deve ser preparada para paginacao futura, mesmo que a primeira UI use limite simples.

## TimelineEvent Interface

Estrutura canonica recomendada:

```ts
export type CrmTimelineEventType =
  | "note_created"
  | "task_created"
  | "task_completed"
  | "task_cancelled";

export type CrmTimelineEventSource =
  | "crm_lead_notes"
  | "crm_tasks";

export type CrmTimelineEvent = {
  authorName: string;
  authorProfileId: string | null;
  description: string | null;
  id: string;
  leadId: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
  source: CrmTimelineEventSource;
  sourceId: string;
  title: string;
  type: CrmTimelineEventType;
};
```

### Campo a campo

| Campo | Obrigatorio | Descricao |
| --- | --- | --- |
| `id` | Sim | Id deterministico do evento no read model. |
| `type` | Sim | Tipo canonico do evento. |
| `title` | Sim | Acao curta exibida na timeline. |
| `description` | Nao | Conteudo ou detalhe do evento. |
| `occurredAt` | Sim | Data/hora usada para ordenacao. |
| `authorName` | Sim | Nome resolvido server-side ou fallback. |
| `authorProfileId` | Nao | Profile id associado ao evento, quando existir. |
| `source` | Sim | Entidade origem do evento. |
| `sourceId` | Sim | Id da entidade origem. |
| `leadId` | Sim | Lead relacionado. |
| `metadata` | Sim | Dados auxiliares seguros para UI. Pode ser objeto vazio. |

### Id deterministico

Formato recomendado:

```text
<type>:<source>:<sourceId>
```

Exemplos:

```text
note_created:crm_lead_notes:8f...
task_completed:crm_tasks:9a...
```

Motivo:

- evita duplicidade;
- facilita renderizacao estavel no React;
- permite reprocessar o read model sem criar registros.

## Event Types V1

### Tipos obrigatorios

#### `note_created`

Evento gerado a partir de nota persistida em `crm_lead_notes`.

Incluir quando:

- nota pertence ao lead;
- nota pertence a organizacao do usuario;
- `deletedAt` e nulo.

Titulo recomendado:

```text
Registrou nota
```

Descricao:

```text
note.content
```

#### `task_created`

Evento gerado a partir de `crm_tasks.createdAt`.

Incluir quando:

- tarefa pertence ao lead;
- tarefa pertence a organizacao do usuario.

Titulo recomendado:

```text
Criou tarefa
```

Descricao:

```text
<tipo da tarefa>: <titulo> — <data/hora planejada>
```

#### `task_completed`

Evento gerado a partir de `crm_tasks.completedAt`.

Incluir quando:

- tarefa pertence ao lead;
- `status = completed`;
- `completedAt` existe.

Titulo recomendado:

```text
Concluiu tarefa
```

Descricao:

```text
<tipo da tarefa>: <titulo>
```

#### `task_cancelled`

Evento gerado a partir de `crm_tasks.canceledAt`.

Observacao de nomenclatura:

- usar `task_cancelled` no read model porque a sprint pediu este nome;
- mapear internamente a partir do status persistido `canceled`.

Incluir quando:

- tarefa pertence ao lead;
- `status = canceled`;
- `canceledAt` existe.

Titulo recomendado:

```text
Cancelou tarefa
```

Descricao:

```text
<tipo da tarefa>: <titulo>
```

V1 nao exibe motivo porque o schema atual nao possui motivo de cancelamento persistido.

### Tipos avaliados, mas nao recomendados para V1 inicial

#### `stage_changed`

Estado:

- Existe conceito legado em `crm-detail-engine.ts` e storage local.
- A Sprint 103A.18 identificou que o Dossie atual nao consome uma fonte canonica de stage changes.

Decisao:

```text
Nao incluir em V1 inicial.
```

Motivo:

- fonte confiavel/canonica ainda nao esta confirmada para o runtime atual;
- misturar local storage legado com dados server-side criaria ambiguidade de auditoria.

#### `proposal_generated`

Estado:

- `GeneratedProposalRecord` existe e contem `generatedAt`, `leadId`, `recommendedScenario`, `commercialCredit`, `roiPercent` e `fileName`.
- No Dossie, propostas aparecem em card proprio.

Decisao:

```text
Nao incluir em V1 inicial, salvo se a Sprint 103A.20 confirmar persistencia confiavel por lead.
```

Motivo:

- o read model V1 deve priorizar fontes persistidas e server-side;
- propostas podem existir como artefato de sessao dependendo do fluxo.

#### `simulation_created`

Estado:

- Ha storage de simulacoes vinculadas a lead em modulos de CRM, mas a fonte precisa ser validada antes de virar evento auditavel.

Decisao:

```text
Nao incluir em V1 inicial.
```

Motivo:

- evitar evento visual que pareca auditoria definitiva sem fonte canonica validada.

## Event Mapping

| Fonte | Condicao | Evento | `occurredAt` | Autor |
| --- | --- | --- | --- | --- |
| `crm_lead_notes` | `deletedAt = null` | `note_created` | `createdAt` | `authorProfileId` |
| `crm_tasks` | sempre que existir tarefa | `task_created` | `createdAt` | `createdBy` |
| `crm_tasks` | `status = completed` e `completedAt != null` | `task_completed` | `completedAt` | `completedBy` |
| `crm_tasks` | `status = canceled` e `canceledAt != null` | `task_cancelled` | `canceledAt` | `canceledBy` |

### Mapeamento de notas

```text
source = crm_lead_notes
sourceId = note.id
type = note_created
title = Registrou nota
description = note.content
occurredAt = note.createdAt
authorProfileId = note.authorProfileId
```

### Mapeamento de tarefa criada

```text
source = crm_tasks
sourceId = task.id
type = task_created
title = Criou tarefa
description = <task type label>: <task.title> — <due date/time>
occurredAt = task.createdAt
authorProfileId = task.createdBy
```

### Mapeamento de tarefa concluida

```text
source = crm_tasks
sourceId = task.id
type = task_completed
title = Concluiu tarefa
description = <task type label>: <task.title>
occurredAt = task.completedAt
authorProfileId = task.completedBy
```

### Mapeamento de tarefa cancelada

```text
source = crm_tasks
sourceId = task.id
type = task_cancelled
title = Cancelou tarefa
description = <task type label>: <task.title>
occurredAt = task.canceledAt
authorProfileId = task.canceledBy
```

## Autoria

### Resolucao server-side

O read model deve coletar todos os `authorProfileId` envolvidos e resolver nomes em uma etapa server-side.

Campos de origem:

- `crm_lead_notes.authorProfileId`
- `crm_tasks.createdBy`
- `crm_tasks.completedBy`
- `crm_tasks.canceledBy`

### Fallbacks

Quando o id existir mas o nome nao puder ser resolvido:

```text
Autor nao identificado
```

Quando nao houver id porque o evento e automatico:

```text
Sistema
```

Na V1 obrigatoria, os eventos sao majoritariamente humanos. Portanto, o fallback padrao deve ser:

```text
Autor nao identificado
```

## Prioridade de Ordenacao

Ordenacao principal:

```text
occurredAt DESC
```

Desempate recomendado:

1. `occurredAt DESC`
2. prioridade por tipo:
   - `task_completed`
   - `task_cancelled`
   - `note_created`
   - `task_created`
3. `sourceId DESC`

Motivo:

- eventos de encerramento de tarefa representam a movimentacao operacional mais recente;
- notas devem aparecer acima da criacao de tarefa em empates porque explicam contexto;
- `sourceId` estabiliza a lista sem precisar de tabela propria.

## Preparacao para Paginacao

Mesmo sem implementar paginacao agora, o read model deve prever:

```ts
type CrmTimelineReadModel = {
  events: CrmTimelineEvent[];
  pageInfo: {
    hasMore: boolean;
    nextCursor: string | null;
  };
};
```

Cursor conceitual:

```text
occurredAt + typePriority + sourceId
```

V1 pode retornar apenas os eventos mais recentes com limite fixo, mas a assinatura futura deve ser compativel com cursor.

## Estrategia de Expansao

### WhatsApp

Futuro tipo possivel:

```text
whatsapp_sent
```

Requisitos antes de incluir:

- fonte persistida;
- autoria;
- timestamp confiavel;
- sem expor conteudo sensivel indevido.

### Email

Futuro tipo possivel:

```text
email_sent
```

Requisitos:

- integracao persistida;
- status de envio;
- autor ou sistema;
- politica clara de conteudo exibido.

### Propostas

Futuro tipo possivel:

```text
proposal_generated
```

Requisitos:

- persistencia confiavel por lead;
- timestamp;
- autoria;
- identificador do artefato;
- campos comerciais seguros para UI.

### Simulacoes

Futuro tipo possivel:

```text
simulation_created
```

Requisitos:

- fonte persistida por lead;
- timestamp confiavel;
- autoria ou sistema;
- resumo seguro do credito/cenario.

### Mudancas de etapa

Futuro tipo possivel:

```text
stage_changed
```

Requisitos:

- fonte canonica server-side;
- from/to pipeline;
- from/to stage;
- actor profile;
- occurredAt.

### Automacoes IA

Futuro tipo possivel:

```text
ai_suggestion_created
```

Requisitos:

- aprovacao explicita de produto;
- rastreabilidade;
- separacao clara entre sugestao e acao humana;
- nunca misturar sugestao automatica com evento executado.

## Decisoes Arquiteturais Tomadas

1. V1 inicial inclui somente `crm_lead_notes` e `crm_tasks`.
2. V1 inicial nao inclui stage changes, propostas ou simulacoes ate confirmacao de fonte confiavel.
3. O evento de cancelamento no read model sera `task_cancelled`, mapeado do status persistido `canceled`.
4. A autoria sera resolvida server-side quando possivel.
5. O fallback humano sera `Autor nao identificado`.
6. `Sistema` sera reservado para eventos automaticos.
7. A ordenacao sera `occurredAt DESC`.
8. O read model deve nascer preparado para cursor/paginacao futura.
9. Nenhuma nova tabela/event store deve ser criada para V1.

## Riscos Identificados

| Risco | Impacto | Mitigacao |
| --- | --- | --- |
| Autoria incompleta | Timeline perde confianca | Resolver profiles server-side e usar fallback honesto. |
| Incluir fonte nao persistida | Usuario interpreta sessao como auditoria permanente | V1 limita a notas e tarefas persistidas. |
| Duplicidade de eventos | Timeline fica ruidosa | Usar id deterministico `type:source:sourceId`. |
| Divergencia `cancelled` vs `canceled` | Confusao entre API e banco | Documentar `task_cancelled` como tipo de read model e `canceled` como status persistido. |
| Paginacao tardia | Timeline pode crescer sem controle | Preparar `pageInfo` e cursor conceitual desde o design. |
| Expor dados de profiles no client | Risco de privacidade | Enriquecimento server-side, sem consulta ampla no browser. |

## Non-goals

Esta sprint nao autoriza:

- implementacao;
- alteracao de codigo;
- UI;
- hooks;
- componentes;
- queries reais;
- SQL;
- migrations;
- nova tabela;
- event store;
- alteracao de banco;
- alteracao de Auth;
- alteracao de RLS;
- alteracao de policies;
- alteracao de repositories;
- alteracao de APIs.

## Recomendacao para Sprint 103A.20

Recomendacao:

```text
Sprint 103A.20 — Timeline Server-Side Read Model Implementation
```

Escopo recomendado:

- criar tipos `CrmTimelineEvent` e `CrmTimelineReadModel`;
- criar service server-side somente leitura;
- criar API route read-only, por exemplo `GET /api/crm/lead-timeline?leadId=...`;
- validar sessao/profile/organizacao usando padrao existente de tasks/notes;
- carregar notas ativas do lead;
- carregar tarefas do lead;
- mapear `note_created`, `task_created`, `task_completed`, `task_cancelled`;
- resolver autoria server-side;
- ordenar por `occurredAt DESC`;
- nao alterar UI ainda, salvo se a sprint aprovar explicitamente;
- nao criar SQL;
- nao alterar banco/Auth/RLS/policies.

## Confirmacoes

- Nenhum codigo foi implementado.
- Nenhum SQL foi criado.
- Nenhum SQL foi executado.
- Nenhum banco foi alterado.
- Nenhum Auth foi alterado.
- Nenhum RLS foi alterado.
- Nenhuma policy foi alterada.
- Nenhuma UI foi alterada.
- Nenhum repository foi alterado.
- Nenhuma API foi alterada.
