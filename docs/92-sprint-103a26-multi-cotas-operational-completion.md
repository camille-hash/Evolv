# Sprint 103A.26 — Multi-Cotas Operational Completion

## Objetivo

Completar a operacao basica do Multi-Cotas para uso em reuniao comercial, tornando o botao `Aplicar a todas` funcional e adicionando controle individual de mes de contemplacao por carta.

## Arquivos criados

- `docs/92-sprint-103a26-multi-cotas-operational-completion.md`

## Arquivos alterados

- `modules/multi-cotas/multi-cotas-types.ts`
- `modules/multi-cotas/multi-cotas-engine.ts`
- `components/multi-cotas/multi-cotas-page.tsx`

## Causa raiz dos problemas encontrados

O Multi-Cotas ja possuia calculo por carta na engine, mas a UI estava operacionalmente incompleta:

- o botao `Aplicar a todas` aplicava apenas o mes de saque, apesar de parecer uma acao global;
- o mes de contemplacao existia como campo numerico simples, sem o rastreador operacional usado por Bruno na simulacao comercial;
- a carta nao exibia, junto ao controle, os principais numeros recalculados pela engine;
- nao havia um campo comum explicito para aplicar o mesmo mes de contemplacao a todas as cartas.

## Comportamento implementado para `Aplicar a todas`

Foi criado o campo local:

```text
sharedContemplationMonth
```

O botao `Aplicar a todas` agora aplica de forma previsivel:

- `baseCardValue` como valor individual de cada carta;
- `sharedContemplationMonth` como mes de contemplacao de cada carta;
- `consolidationMonth` como mes de saque de cada carta.

O INCC continua sendo uma premissa global do Multi-Cotas e ja recalcula todas as cartas automaticamente pela engine.

Depois da aplicacao global, cada carta ainda pode ser editada individualmente.

## Comportamento implementado para rastreador por carta

Cada carta passou a ter um bloco proprio de contemplacao com:

- mes atual em destaque;
- botao de reduzir mes;
- botao de aumentar mes;
- slider de mes 1 ate o prazo total.

O comportamento segue o padrao operacional do controle de contemplacao da simulacao comercial, adaptado para cards individuais.

## Como cada carta recalcula os dados

A UI nao cria calculo paralelo. Ela altera os inputs e consome o resultado de:

```text
calculateMultiCotas(input)
```

Para cada carta, a engine calcula:

- `inccAdjustmentCount`;
- `updatedCredit`;
- `commercialCredit`;
- `futureValue`;
- `inccGain`;
- `idleAppreciationGain`;
- `estimatedGain`;
- `estimatedGainRate`.

Como o Multi-Cotas ainda nao modela lance embutido, `commercialCredit` e igual a `updatedCredit`.

## Evidencia matematica do cenario solicitado

Premissas:

- 3 cartas;
- R$ 180.000 por carta;
- INCC anual de 6%;
- meses de contemplacao: 12, 24 e 48.

Resultados esperados pela regra atual:

- Carta 1, mes 12: 0 reajustes; credito atualizado R$ 180.000,00.
- Carta 2, mes 24: 1 reajuste; credito atualizado R$ 190.800,00.
- Carta 3, mes 48: 3 reajustes; credito atualizado R$ 214.382,88.

Isso confirma que cartas com meses diferentes produzem creditos atualizados diferentes.

## Limitacoes conhecidas

- Multi-Cotas ainda nao modela lance embutido.
- Multi-Cotas ainda nao calcula parcela, investimento real, lucro de venda ou PDF completo por carta.
- ROI estimado nesta sprint e derivado de `futureValue - originalValue` sobre `originalValue`, usando somente os dados que a engine Multi-Cotas ja possui.
- O objetivo foi completar a operacao basica, nao criar o design visual definitivo.

## Validacao manual recomendada

1. Abrir Multi-Cotas.
2. Configurar 3 cartas.
3. Definir valor base R$ 180.000.
4. Definir INCC anual maior que zero, por exemplo 6%.
5. Definir cartas com meses 12, 24 e 48.
6. Confirmar que os creditos atualizados crescem conforme o mes.
7. Usar `Aplicar a todas`.
8. Confirmar que todas recebem valor base, mes comum de contemplacao e mes de saque.
9. Editar uma carta individualmente.
10. Confirmar que a edicao individual recalcula apenas aquela carta.

## Validações técnicas

Executadas:

```text
npm.cmd run typecheck: passou
npm.cmd run lint: passou com 4 warnings preexistentes em components/crm/crm-page.tsx
npm.cmd run build: passou
```

## Fora do escopo

- SQL
- banco de dados
- schema
- migrations
- Auth
- RLS
- policies
- timeline
- tarefas
- lead creation
- arquitetura lead-centric
- PDF Multi-Cotas completo
- lance embutido em Multi-Cotas
- graficos
- filtros

## Recomendacao para Sprint 103A.27

Desenhar a evolucao financeira completa do Multi-Cotas, decidindo se o modulo deve modelar parcelas, investimento real, lucro estimado, ROI comercial e eventual PDF proprio antes de qualquer nova implementacao.
