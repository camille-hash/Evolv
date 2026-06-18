# Sprint 103A.21 — Timeline Operacional UI Integration

## Objetivo

Integrar visualmente a Timeline Operacional no Dossie do Lead, substituindo o conteudo visual anterior de `Historico Completo` por eventos vindos do endpoint server-side existente.

## Arquivos criados

- `docs/87-sprint-103a21-timeline-ui-integration.md`

## Arquivos alterados

- `components/crm/crm-lead-detail.tsx`

## Componentes/areas impactadas

- Dossie do Lead.
- Secao recolhivel antes chamada `Historico Completo`.
- A secao agora aparece como `Timeline Operacional`.

## Comportamento visual implementado

A UI consome:

```text
GET /api/crm/lead-timeline?leadId=<leadId>
```

Cada evento exibe:

- titulo;
- descricao, quando houver;
- autor;
- data/hora;
- tipo do evento em label discreto.

Tipos exibidos:

- `note_created` -> `Nota adicionada`
- `task_created` -> `Tarefa criada`
- `task_completed` -> `Tarefa concluida`
- `task_cancelled` -> `Tarefa cancelada`

O layout permanece conservador, em lista vertical compacta, dentro da area recolhivel do Dossie.

## Estados de loading/empty/error

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
Nao foi possivel carregar a timeline agora.
```

## Atualizacoes apos acoes

A timeline e recarregada apos:

- criar nota;
- criar tarefa;
- concluir tarefa;
- cancelar tarefa.

Isso mantem a area visual coerente sem reload manual da pagina.

## Limitacoes conhecidas

- Nao ha filtros.
- Nao ha paginacao.
- Nao ha agrupamento por data.
- Nao ha infinite scroll.
- Nao ha expansao de evento.
- Nao ha novas fontes.
- Stage changes, propostas, simulacoes, WhatsApp e Email seguem fora da V1.
- A UI depende da autoria resolvida pelo endpoint; quando o endpoint retorna fallback, a UI exibe o fallback.

## Validacao manual recomendada

1. Abrir um lead no Dossie.
2. Expandir `Timeline Operacional`.
3. Confirmar estado de loading durante a requisicao.
4. Confirmar eventos de nota e tarefas quando existirem.
5. Criar uma nota e confirmar que a timeline atualiza.
6. Criar uma tarefa e confirmar evento `Tarefa criada`.
7. Concluir tarefa e confirmar evento `Tarefa concluida`.
8. Cancelar tarefa pendente e confirmar evento `Tarefa cancelada`.
9. Confirmar que a area `Proxima Acao` continua funcionando.

## Validacoes

- `npm.cmd run typecheck`: passou.
- `npm.cmd run lint`: passou com 4 warnings preexistentes em `components/crm/crm-page.tsx`.
- `npm.cmd run build`: passou.

## Governanca

- Nenhum SQL foi criado.
- Nenhum SQL foi executado.
- Nenhum banco foi alterado.
- Nenhum schema foi alterado.
- Nenhum Auth foi alterado.
- Nenhum RLS foi alterado.
- Nenhuma policy foi alterada.
- O service da timeline nao foi alterado.
- O endpoint da timeline nao foi alterado.
- Repositories nao foram alterados.

## Recomendacao para Sprint 103A.22

Criar uma sprint de refinamento visual e validação operacional da timeline:

- testar timeline com leads reais;
- ajustar densidade visual se necessario;
- avaliar limite de eventos visiveis;
- desenhar futura inclusao de stage changes, propostas e simulacoes somente apos confirmar fonte persistida confiavel.
