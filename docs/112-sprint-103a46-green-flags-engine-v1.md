# Sprint 103A.46 - Green Flags Engine v1

## Objetivo

Implementar uma primeira camada de inteligencia operacional explicavel no Dossie do Lead. As Green Flags sao calculadas em tempo real e respondem por que o lead merece atencao agora, sem score, ranking preditivo, IA ou persistencia.

## Arquitetura implementada

O modulo `modules/crm/crm-green-flags.ts` e uma utility pura. Ele recebe somente os dados ja carregados pelo Dossie:

- `crm_tasks`;
- `crm_lead_simulations`;
- Timeline operacional, que deriva de `crm_lead_notes`, tarefas e simulacoes persistidas.

Nenhuma tabela, campo, endpoint, chamada de API adicional ou fonte de verdade foi criada. A secao `Green Flags` em `components/crm/crm-lead-detail.tsx` apenas mostra o resultado derivado atual.

## Regras v1

| Flag | Regra explicavel |
| --- | --- |
| Lead com atividade recente | Existe evento na Timeline nos ultimos 7 dias. |
| Interacao realizada recentemente | Existe nota criada ou tarefa concluida nos ultimos 7 dias. |
| Simulacao comercial recente | Existe simulacao comercial criada nos ultimos 7 dias. |
| Estudo Multi-Cotas recente | Existe estudo Multi-Cotas criado nos ultimos 7 dias. |
| Multiplas simulacoes registradas | Existem duas ou mais simulacoes comerciais persistidas. |
| Multiplos estudos Multi-Cotas registrados | Existem dois ou mais estudos Multi-Cotas persistidos. |
| Existe simulacao sem proximo passo definido | Existe simulacao persistida e nao ha tarefa pendente com vencimento hoje ou futuro. |
| Lead pode precisar de retomada de contato | Ha atividade historica, mas nenhuma nota criada ou tarefa concluida nos ultimos 7 dias. |
| Proposta comercial registrada | Uma simulacao possui `proposalGeneratedAt` persistido ou status `proposal_generated`. |

`POSSUI_PROPOSTA` somente e exibida com evidencia persistida em `crm_lead_simulations`; nao ha inferencia a partir de interface, PDF ou evento client-side.

## UX

A secao apresenta apenas explicacoes em linguagem comercial. Quando nenhuma regra dispara, mostra `Nenhuma Green Flag identificada.`. Ela nao exibe score, numero de pontos, prioridade ou classificacao opaca.

## Arquivos

- Criado: `modules/crm/crm-green-flags.ts`.
- Alterado: `modules/crm/index.ts`.
- Alterado: `components/crm/crm-lead-detail.tsx`.

## Limites

As flags refletem o conjunto de dados carregado no Dossie e se atualizam quando tarefas atualizam a Timeline existente. Elas nao persistem, nao alteram o lead e nao substituem a decisao comercial humana. Uma modelagem futura de propostas pode ampliar a evidencia de proposta sem alterar esta engine.

## Validacoes tecnicas

- `npm.cmd run typecheck`: aprovado.
- `npm.cmd run lint`: aprovado sem warnings novos; permanecem quatro warnings preexistentes em `components/crm/crm-page.tsx` para simbolos nao utilizados.
- `npm.cmd run build`: aprovado.
- `git diff --check`: aprovado.

## Validacao manual recomendada

1. Abrir um lead com nota ou tarefa concluida recente e confirmar as flags de atividade/interacao.
2. Abrir um lead com simulacao comercial ou Multi-Cotas recente e confirmar a flag correspondente.
3. Criar ou concluir uma tarefa e confirmar que, apos a atualizacao existente do Dossie, as explicacoes refletem o estado novo.
4. Abrir um lead sem dados que atendam as regras e confirmar o estado vazio.

## Proxima sprint recomendada

Sprint 103A.47 - Meu Dia, usando Green Flags como entrada explicavel complementar para a priorizacao diaria.
