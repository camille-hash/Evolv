# Sprint 103A.42 - Multi-Cotas History

## Objetivo

Transformar a visao compacta de Multi-Cotas do Dossie do Lead em um historico ordenado de estudos persistidos, usando exclusivamente `public.crm_lead_simulations`.

## Arquivos criados

- `docs/108-sprint-103a42-multi-cotas-history.md`

## Arquivos alterados

- `components/crm/crm-lead-detail.tsx`

## Fonte e filtro

O Dossie continua reutilizando:

- `GET /api/crm/lead-simulations?leadId=<leadId>`

O historico Multi-Cotas aplica filtro estrito no client:

```ts
simulation.simulationType === "multi_cotas"
```

Simulacoes comerciais continuam filtradas separadamente por `simulationType === "commercial"` e nao sao mostradas neste historico.

## Ordenacao

O repository existente ja consulta `crm_lead_simulations` com `created_at DESC`.

Como protecao adicional na camada do Dossie, os estudos Multi-Cotas sao ordenados novamente por `createdAt DESC`, deixando o mais recente primeiro.

## Metadados exibidos

Cada item do historico mostra:

- titulo do estudo;
- origem `Multi-Cotas`;
- data/hora de criacao;
- quantidade de cartas;
- credito atualizado, quando disponivel;
- valor futuro, quando disponivel;
- ganho estimado, quando disponivel.

Os valores financeiros sao lidos defensivamente de `calculationSnapshot.result.summary`, com fallback para summary fields relacionais persistidos.

## Estado vazio

Quando nao existem estudos Multi-Cotas para o lead, o Dossie exibe:

- `Nenhum estudo Multi-Cotas salvo para este lead.`

## Escopo preservado

- Nenhum detalhe expandido foi criado.
- Itens do historico nao sao clicaveis.
- Nenhuma edicao, exclusao ou duplicacao foi criada.
- Nenhuma Timeline, PDF, dashboard ou analytics foi conectado.
- Nenhuma tabela, migration, SQL, RLS, Auth ou policy foi alterada.
- Nenhum repository paralelo foi criado.

## Validacao manual recomendada

1. Abrir um lead com dois ou mais estudos Multi-Cotas persistidos.
2. Confirmar que a secao `Multi-Cotas` mostra apenas esses estudos.
3. Confirmar que o mais recente aparece primeiro.
4. Confirmar titulo, origem, criacao, cartas e resumo financeiro quando disponivel.
5. Abrir um lead sem estudos Multi-Cotas e confirmar o estado vazio.
6. Confirmar que `Simulacoes Salvas` continua contendo apenas simulacoes comerciais.

## Validacoes tecnicas

Executar:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check`
- `git status`
- `git diff --stat`

## Recomendacao para Sprint 103A.43

Implementar a leitura detalhada de um estudo Multi-Cotas selecionado, usando o snapshot completo ja persistido e mantendo o mesmo `crm_lead_simulations` como fonte unica de verdade.
