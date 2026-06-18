# Sprint 103A.20 — Timeline Read Model Server-Side Implementation

## Objetivo

Implementar o read model server-side da Timeline Operacional V1, somente leitura, sem alterar UI, banco, Auth, RLS ou policies.

## Arquivos criados

- `modules/crm/crm-timeline.ts`
- `modules/crm/server/crm-timeline-service.ts`
- `app/api/crm/lead-timeline/route.ts`
- `docs/86-sprint-103a20-timeline-read-model-server-implementation.md`

## Arquivos alterados

- `modules/crm/index.ts`

## Contrato do read model implementado

Tipos criados:

```ts
CrmOperationalTimelineEvent
CrmTimelineReadModel
CrmOperationalTimelineEventType
CrmOperationalTimelineEventSource
```

Endpoint read-only criado:

```text
GET /api/crm/lead-timeline?leadId=<leadId>
Authorization: Bearer <access_token>
```

Resposta esperada:

```ts
{
  timeline: {
    events: CrmOperationalTimelineEvent[];
    pageInfo: {
      hasMore: boolean;
      nextCursor: string | null;
    };
  };
}
```

## Fontes utilizadas

V1 usa apenas fontes persistidas e ja existentes:

- `crm_lead_notes`
- `crm_tasks`

Fontes fora da V1:

- stage changes;
- propostas;
- simulacoes;
- WhatsApp;
- Email;
- automacoes IA.

## Eventos implementados

| Fonte | Condicao | Evento |
| --- | --- | --- |
| `crm_lead_notes` | `deleted_at is null` | `note_created` |
| `crm_tasks` | tarefa existente com `created_at` | `task_created` |
| `crm_tasks` | `status = completed` e `completed_at` preenchido | `task_completed` |
| `crm_tasks` | `status = canceled` e `canceled_at` preenchido | `task_cancelled` |

Observacao:

- O banco usa `canceled`.
- O read model usa `task_cancelled`, conforme definido na Sprint 103A.19.

## Regras de autoria

A autoria e resolvida server-side quando o profile esta acessivel ao contexto autenticado.

Campos usados:

- `crm_lead_notes.author_profile_id`
- `crm_tasks.created_by`
- `crm_tasks.completed_by`
- `crm_tasks.canceled_by`

Fallback:

```text
Autor nao identificado
```

`Sistema` nao foi usado nesta V1 porque os eventos implementados representam acoes humanas ou registros humanos.

## Regras de ordenacao

Ordenacao principal:

```text
occurredAt DESC
```

Desempate:

1. prioridade por tipo:
   - `task_completed`
   - `task_cancelled`
   - `note_created`
   - `task_created`
2. `sourceId DESC`

## Limitacoes conhecidas

- A UI ainda nao consome o endpoint.
- O Dossie visual nao foi alterado.
- Autoria de outros profiles depende das policies atuais de `profiles`; se o profile nao puder ser lido pelo contexto autenticado, a timeline usa `Autor nao identificado`.
- `stage_changed`, `proposal_generated` e `simulation_created` permanecem fora da V1.
- `pageInfo` ja existe no contrato, mas V1 retorna `hasMore: false` e `nextCursor: null`.

## Como validar manualmente

1. Iniciar o app local com sessao Supabase Auth valida.
2. Abrir DevTools ou cliente HTTP autenticado.
3. Obter access token da sessao Supabase.
4. Chamar:

```text
GET /api/crm/lead-timeline?leadId=<leadId>
Authorization: Bearer <access_token>
```

5. Confirmar:
   - resposta contem `timeline.events`;
   - notas aparecem como `note_created`;
   - tarefas aparecem como `task_created`;
   - tarefas concluidas aparecem como `task_completed`;
   - tarefas canceladas aparecem como `task_cancelled`;
   - eventos estao ordenados por `occurredAt DESC`;
   - nenhum dado de profiles e exposto diretamente ao client alem de `authorName` e `authorProfileId` no evento.

## Validacoes

- `npm.cmd run typecheck`: passou.
- `npm.cmd run lint`: passou com 4 warnings preexistentes em `components/crm/crm-page.tsx`.
- `npm.cmd run build`: passou.

## Governanca

- Nenhum SQL foi criado.
- Nenhum SQL foi executado.
- Nenhuma tabela foi criada.
- Nenhuma migration foi criada.
- Nenhum schema foi alterado.
- Nenhum RLS foi alterado.
- Nenhuma policy foi alterada.
- Nenhum Auth foi alterado.
- Nenhuma UI foi alterada.
- Nenhum Dossie visual foi alterado.

## Recomendacao para Sprint 103A.21

Implementar a integracao visual read-only no Dossie:

- carregar `GET /api/crm/lead-timeline?leadId=...`;
- renderizar a Timeline Operacional dentro da area hoje chamada `Historico Completo`;
- preservar fallback visual se a timeline falhar;
- nao adicionar filtros na primeira integracao;
- nao incluir stage/proposta/simulacao ainda.
