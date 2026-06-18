# Sprint 103A.18 — Unified Operational Timeline Design

## Objetivo

Projetar a Timeline Operacional Unificada do EVOLV para responder, dentro do Dossie do Lead:

```text
O que aconteceu com este lead?
Quem fez?
Quando fez?
```

Esta sprint e exclusivamente documental. Nenhum codigo foi implementado, nenhum SQL foi criado ou executado, nenhum banco/Auth/RLS/policy/API/repository/UI foi alterado.

Regra de produto:

```text
Notas lembram.
Tarefas executam.
Timeline audita.
```

## Contexto

A Task Engine V1 ja possui o ciclo operacional minimo:

- criar tarefa;
- visualizar a proxima tarefa pendente no bloco `Proxima Acao`;
- concluir tarefa;
- cancelar tarefa;
- manter `status`, `completed_at`, `completed_by`, `canceled_at` e `canceled_by`.

Os documentos recentes tambem estabeleceram principios importantes:

- `crm_tasks` e a entidade operacional de execucao.
- Notas nao devem virar tarefas automaticamente.
- Completed/canceled tasks devem continuar rastreaveis.
- A timeline deve ser derivada antes de qualquer nova tabela dedicada.

## Estado atual do Historico Completo

Arquivos revisados:

- `docs/69-sprint-103a1-commercial-task-system-design.md`
- `docs/75-sprint-103a8-commercial-task-server-side-access-design.md`
- `docs/77-sprint-103a10-commercial-task-validation-and-lead-detail-read-design.md`
- `docs/78-sprint-103a11-lead-detail-task-read-integration.md`
- `docs/81-sprint-103a15-commercial-task-operational-lifecycle-design.md`
- `docs/82-sprint-103a16-commercial-task-completion-action.md`
- `docs/83-sprint-103a17-task-cancellation-action.md`
- `components/crm/crm-lead-detail.tsx`
- `components/crm/crm-structured-notes.tsx`
- `modules/crm/crm-structured-notes.ts`
- `modules/crm/crm-detail-engine.ts`
- `modules/crm/crm-detail-storage.ts`
- `modules/crm/crm-tasks.ts`
- `modules/crm/server/crm-tasks-service.ts`
- `modules/crm/client/crm-tasks-client.ts`
- `modules/proposal/proposal-history.ts`

### O que aparece hoje

O Dossie exibe:

- `Ultima Movimentacao`, derivada de notas persistidas quando existem ou de movimentos temporarios do lead.
- `Historico Completo`, como secao recolhivel.
- Notas persistidas vindas de `crm_lead_notes`, mapeadas para `CrmStructuredNote`.
- Fallbacks temporarios derivados do lead:
  - contexto estrategico a partir de `observacoes`;
  - movimentacao atual do lead;
  - proxima acao legada;
  - lead criado.

### Onde notas sao exibidas

Notas aparecem em:

- `Ultima Movimentacao`, quando existe nota persistida recente;
- `Historico Completo`, via `CrmStructuredNotesList`;
- `Contexto Estrategico`, quando derivado de `observacoes` do lead.

### Autoria atual de notas

O componente `CrmStructuredNotesList` exibe autor e data/hora.

Porem, o mapeamento atual de nota persistida no Dossie usa:

```text
author = EVOLV
```

Mesmo que `CrmLeadNote` tenha `authorProfileId`, a UI atual nao resolve nome do profile. Portanto, as notas nao exibem claramente o autor humano real.

### Data/hora atual

Notas estruturadas usam `Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" })`.

O formato e adequado para timeline V1, desde que todos os eventos usem `occurredAt` consistente.

### Tarefas atuais no Dossie

O bloco `Proxima Acao` carrega tarefas via:

```text
GET /api/crm/tasks?leadId=<leadId>
```

Ele exibe apenas a proxima tarefa `pending`, ordenada por:

```text
dueDate asc
dueTime asc
createdAt asc
```

Tarefas `completed` e `canceled` permanecem persistidas em `crm_tasks`, mas nao aparecem no `Historico Completo` nem em outra timeline visual.

### Propostas, simulacoes e mudancas de etapa

- Propostas geradas aparecem na secao `Propostas e Simulacoes`, mas nao entram no `Historico Completo`.
- Simulacao pode ser acionada por atalho, mas nao ha evento unificado no Dossie.
- Mudanca de etapa possui conceito legado em `crm-detail-engine.ts` e storage local, mas o Dossie atual nao consome uma timeline operacional unificada.

## Gaps encontrados

| Gap | Evidencia | Impacto |
| --- | --- | --- |
| Tarefa concluida/cancelada some do bloco principal | `resolveNextPendingTask` filtra apenas `pending` | Bruno perde visao historica da acao encerrada. |
| Tarefas nao alimentam `Historico Completo` | Historico renderiza `visibleHistoryNotes` | A Task Engine executa, mas ainda nao audita visualmente. |
| Autor real da nota nao aparece | `mapLeadNoteToStructuredNote` usa `author: "EVOLV"` | Fica dificil responder quem registrou a nota. |
| Propostas e simulacoes ficam separadas | `GeneratedProposalItem` aparece em card proprio | Artefatos comerciais nao entram na linha do tempo. |
| Mudancas de etapa nao aparecem no Dossie atual | Motor legado existe, mas nao esta conectado ao Dossie atual | Perde-se narrativa de evolucao comercial. |
| Nao existe formato unico de evento | Notas, tarefas, propostas e stage changes usam modelos distintos | A UI nao consegue ordenar tudo por data de forma consistente. |

## Eventos recomendados para timeline V1

### 1. Nota criada

Fonte:

- `crm_lead_notes`

Texto recomendado:

```text
Registrou nota
<conteudo da nota>
```

Campos:

- `occurredAt = createdAt`
- `actorProfileId = authorProfileId`
- fallback de autor quando nome nao estiver resolvido.

### 2. Tarefa criada

Fonte:

- `crm_tasks.createdAt`

Texto recomendado:

```text
Criou tarefa
Ligar cliente — 18/06/2026 14:00
```

Campos:

- `occurredAt = createdAt`
- `actorProfileId = createdBy`
- `description = task title + due date/time`

### 3. Tarefa concluida

Fonte:

- `crm_tasks.completedAt`

Texto recomendado:

```text
Concluiu tarefa
Ligar cliente
```

Campos:

- `occurredAt = completedAt`
- `actorProfileId = completedBy`
- incluir apenas se `status = completed` e `completedAt` existir.

### 4. Tarefa cancelada

Fonte:

- `crm_tasks.canceledAt`

Texto recomendado:

```text
Cancelou tarefa
Enviar proposta
```

Campos:

- `occurredAt = canceledAt`
- `actorProfileId = canceledBy`
- V1 nao exibe motivo porque nao ha persistencia de motivo.

### 5. Mudanca de etapa

Fonte V1 possivel:

- futuro `crm_stage_events`, quando estiver ativo; ou
- motor/local storage legado apenas como fallback nao canonico, se ainda for relevante.

Texto recomendado:

```text
Lead movido
Diagnostico -> Proposta
```

Recomendacao:

- incluir em V1 somente se houver fonte confiavel no runtime atual.
- se a fonte ainda for legada/local, documentar como fallback e nao misturar com dados canonicos sem sinal visual.

### 6. Simulacao criada

Fonte V1 possivel:

- registros existentes de simulacao vinculada ao lead, se disponiveis no runtime do Dossie.

Texto recomendado:

```text
Simulacao criada
Credito R$ 400.000
```

Recomendacao:

- incluir apos validar fonte atual de simulacoes por lead.

### 7. Proposta gerada

Fonte:

- `GeneratedProposalRecord`

Texto recomendado:

```text
Proposta comercial gerada
Cenario recomendado: <cenario>
```

Campos:

- `occurredAt = generatedAt`
- `description = recommendedScenario + credito/ROI`

Recomendacao:

- incluir em V1 se a lista de propostas do lead estiver disponivel no Dossie durante a sessao.
- se a proposta nao for persistida por lead ainda, tratar como evento de sessao e sinalizar a limitacao.

## Estrategia de autoria

Toda entrada deve tentar exibir:

- autor;
- data;
- horario;
- acao;
- contexto curto.

### Fonte ideal de autoria

| Evento | Campo de autoria recomendado |
| --- | --- |
| Nota criada | `authorProfileId` |
| Tarefa criada | `createdBy` |
| Tarefa concluida | `completedBy` |
| Tarefa cancelada | `canceledBy` |
| Mudanca de etapa | futuro `actor_profile_id` em evento de etapa |
| Simulacao criada | autor da sessao/profile quando houver |
| Proposta gerada | autor da sessao/profile quando houver |

### Fallback recomendado

Usar:

```text
Autor nao identificado
```

Motivo:

- e mais transparente que `Sistema` para eventos que provavelmente tiveram acao humana;
- evita atribuir falsamente ao sistema;
- preserva auditoria honesta enquanto a resolucao de profiles ainda nao estiver completa.

Usar `Sistema` apenas para eventos realmente automaticos, como imports, backfills ou eventos gerados sem usuario humano.

### Resolucao de nomes

V1 deve evitar consultas amplas de profiles no client.

Opcoes seguras:

1. API server-side retorna eventos ja enriquecidos com `actorName`.
2. API retorna ids e nomes necessarios apenas para o lead atual.
3. UI usa fallback ate existir endpoint de timeline.

Recomendacao:

```text
Resolver autoria server-side na futura API da timeline.
```

## Estrategia de ordenacao

Recomendacao para o Dossie:

```text
Mais recente primeiro.
```

Motivo:

- Bruno precisa entender o que aconteceu recentemente;
- tarefas concluidas/canceladas recentes sao mais relevantes operacionalmente;
- combina com o padrao atual de notas e tarefas.

Empates:

1. `occurredAt desc`
2. prioridade de evento:
   - task_completed;
   - task_canceled;
   - note;
   - task_created;
   - stage_changed;
   - proposal_created;
   - simulation_created;
3. `id desc` como desempate estavel.

Agrupamento:

- V1 pode agrupar visualmente por data (`Hoje`, `Ontem`, `18/06/2026`) se isso nao aumentar muito a complexidade.
- Sem agrupamento tambem e aceitavel se a lista for compacta.

Recomendacao:

```text
V1: mais recente primeiro, com agrupamento por data apenas se for simples.
```

## Arquitetura recomendada

Recomendacao para V1:

```text
Timeline derivada server-side.
```

Fluxo futuro sugerido:

```text
Lead Detail
↓
GET /api/crm/lead-timeline?leadId=<leadId>
↓
Server valida sessao/profile/organizacao
↓
Server consulta fontes permitidas do lead
↓
Server normaliza eventos em TimelineItem[]
↓
UI renderiza timeline unificada
```

Por que server-side:

- resolve autoria sem expor profiles amplamente no browser;
- reaproveita o padrao seguro de Lead Notes e Tasks;
- evita trusted fields no client;
- centraliza ordenacao e normalizacao;
- respeita organization scope.

Por que derivada:

- evita duplicidade entre fonte original e evento copiado;
- usa `crm_tasks` como fonte de verdade para tarefas;
- usa `crm_lead_notes` como fonte de verdade para notas;
- reduz risco de tabela de eventos incompleta cedo demais.

## Comparacao: timeline derivada vs event store

| Criterio | Timeline derivada | Event store dedicado |
| --- | --- | --- |
| Velocidade de V1 | Alta | Media/baixa |
| Risco de duplicidade | Baixo | Alto se eventos duplicarem entidades |
| Auditoria historica | Boa para eventos ja persistidos | Excelente se bem modelado |
| Complexidade RLS | Menor | Maior |
| Rollback | Simples | Mais delicado |
| Fonte de verdade | Entidades existentes | Nova tabela vira fonte adicional |
| Custo operacional | Baixo | Alto |
| Melhor momento | Agora | Depois de uso real da timeline |

Recomendacao:

```text
V1 deve ser timeline derivada.
Event store dedicado deve ficar fora da V1.
```

Quando considerar event store:

- quando houver necessidade de auditar edicoes de tarefas;
- quando stage changes canonicos estiverem consolidados;
- quando propostas/simulacoes tiverem persistencia definitiva;
- quando a derivacao ficar lenta, incompleta ou dificil de explicar;
- quando houver requisitos de compliance mais fortes.

## Estrutura conceitual de item da timeline

```ts
type CrmOperationalTimelineItem = {
  actorName: string;
  actorProfileId?: string | null;
  description?: string;
  id: string;
  leadId: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
  sourceId: string;
  sourceType:
    | "crm_lead_notes"
    | "crm_tasks"
    | "crm_stage_events"
    | "proposal"
    | "simulation";
  title: string;
  type:
    | "note_created"
    | "task_created"
    | "task_completed"
    | "task_canceled"
    | "stage_changed"
    | "proposal_created"
    | "simulation_created";
};
```

### Campos minimos para V1

- `id`
- `type`
- `sourceType`
- `sourceId`
- `occurredAt`
- `actorName`
- `title`
- `description`

### Campos opcionais

- `actorProfileId`
- `metadata`
- `leadId`

## Relacao com Historico Completo

Recomendacao:

```text
A Timeline Operacional deve substituir o conteudo atual do Historico Completo, mas manter a ideia de secao recolhivel.
```

Nome recomendado:

```text
Timeline Operacional
```

Alternativa aceitavel:

```text
Historico Operacional
```

Nao recomendar manter apenas `Historico Completo`, porque o nome atual e generico e nao comunica auditoria.

Modelo de transicao:

1. Manter a secao na mesma area do Dossie.
2. Renomear titulo para `Timeline Operacional`.
3. Descricao: `Notas, tarefas e movimentos recentes deste lead.`
4. Renderizar eventos derivados.
5. Se a API de timeline falhar, preservar fallback atual de notas para nao quebrar o Dossie.

## Estrategia de exibicao no Dossie

### Localizacao

Manter abaixo dos cards principais:

- Quem e;
- Contexto Estrategico;
- Ultima Movimentacao;
- Proxima Acao;
- Acoes Comerciais.

Motivo:

- a timeline e consulta operacional, nao o primeiro bloco de decisao;
- o bloco `Proxima Acao` continua sendo a area de execucao.

### Densidade visual

V1 deve ser compacta:

```text
Autor
Data/hora
Titulo do evento
Descricao curta
```

Evitar cards grandes por evento. Preferir lista vertical com borda discreta.

### Filtros

V1:

- sem filtros ou filtro simples por tipo somente se vier sem complexidade.

Recomendacao:

```text
Nao adicionar filtros na primeira implementacao.
```

Motivo:

- o objetivo e consolidar a linha do tempo primeiro;
- filtros podem vir depois que houver volume real.

### Limite inicial

Recomendacao:

- exibir os 10 eventos mais recentes;
- botao `Ver mais` para expandir para 30;
- nao paginar em V1.

### Estados

Loading:

```text
Carregando timeline...
```

Empty:

```text
Nenhum evento operacional registrado ainda.
```

Error:

```text
Nao foi possivel carregar a timeline. As demais informacoes do lead permanecem disponiveis.
```

## Non-goals

Esta sprint nao autoriza:

- implementacao;
- SQL;
- nova tabela;
- event store em V1;
- migrations;
- alteracao de banco;
- alteracao de Auth;
- alteracao de RLS;
- alteracao de policies;
- alteracao de APIs;
- alteracao de repositories;
- alteracao de UI;
- IA;
- automacoes;
- notificacoes;
- webhooks;
- integracao com calendario;
- edicao de eventos historicos;
- delecao de eventos historicos;
- criacao de `crm_task_history`;
- criacao de `crm_timeline_events`.

## Riscos

| Risco | Impacto | Mitigacao |
| --- | --- | --- |
| Autoria incompleta | Timeline perde valor de auditoria | Usar fallback `Autor nao identificado` e planejar resolucao server-side. |
| Misturar fontes persistidas e temporarias | Usuario pode interpretar evento de sessao como historico definitivo | Sinalizar fonte ou incluir apenas fontes persistidas na V1. |
| Duplicar eventos | Timeline fica confusa | Usar `sourceType + sourceId + type` como id deterministico. |
| Criar event store cedo demais | Aumenta RLS, rollback e duplicidade | V1 derivada. |
| Timeline competir com Proxima Acao | Dossie fica menos operacional | Manter Proxima Acao como bloco de execucao e timeline como auditoria. |
| Consultas demais no client | Risco de dados/performance | Criar futura API server-side agregadora. |

## Roadmap recomendado

### Sprint 103A.19 — Timeline Read Model Design

Desenhar contrato de API/read model:

- endpoint;
- sources permitidas;
- formato `CrmOperationalTimelineItem`;
- autoria server-side;
- fallback de UI;
- limites de eventos.

### Sprint 103A.20 — Timeline Server-Side Read Implementation

Implementar somente leitura:

- API server-side;
- combinacao de notas e tarefas;
- sem event store;
- sem UI nova ainda ou com smoke tecnico minimo, se aprovado.

### Sprint 103A.21 — Lead Detail Timeline UI Integration

Substituir o conteudo do `Historico Completo` por `Timeline Operacional`:

- renderizar notas;
- renderizar tarefas criadas/concluidas/canceladas;
- manter fallback se timeline falhar.

### Sprint 103A.22 — Proposal/Simulation/Stage Event Expansion

Adicionar propostas, simulacoes e mudancas de etapa somente apos validar fontes persistidas e autoria.

### Sprint 103A.23 — Note-to-Task Bridge

Conectar nota salva a criacao opcional de proxima acao, com `sourceNoteId`.

## Proxima sprint recomendada

Recomendacao:

```text
Sprint 103A.19 — Timeline Read Model Design
```

Escopo sugerido:

- definir contrato server-side de timeline;
- especificar fontes V1: `crm_lead_notes` + `crm_tasks`;
- especificar resolucao de autoria;
- especificar formato de payload;
- nao implementar ainda, salvo aprovacao explicita.

## Confirmacoes

- Nenhum codigo foi implementado.
- Nenhum SQL foi criado.
- Nenhum SQL foi executado.
- Nenhum banco foi alterado.
- Nenhum schema foi alterado.
- Nenhum RLS foi alterado.
- Nenhuma policy foi alterada.
- Nenhum Auth foi alterado.
- Nenhuma API foi alterada.
- Nenhum repository foi alterado.
- Nenhuma UI foi alterada.
- Nenhum componente foi alterado.
- Nenhum dado foi alterado.
