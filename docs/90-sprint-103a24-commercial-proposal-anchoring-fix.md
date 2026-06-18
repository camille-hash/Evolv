# Sprint 103A.24 — Commercial Proposal Anchoring Fix

## Objetivo

Corrigir a geracao das alternativas patrimoniais para que Conservadora, Recomendada e Patrimonial sejam distintas, coerentes com a parcela confortavel informada e sustentadas pela engine real do simulador.

## Arquivos criados

- `docs/90-sprint-103a24-commercial-proposal-anchoring-fix.md`

## Arquivos alterados

- `modules/simulator/anchoring.ts`
- `components/simulator/simulator-panel.tsx`

Tambem permanecem no working tree as alteracoes da Sprint 103A.23, ainda nao commitadas neste ambiente.

## Causa raiz

A funcao de ancoragem anterior selecionava apenas entre os cenarios `half`, `seventy` e `full`, sempre mantendo o mesmo credito informado no simulador.

Quando a parcela confortavel ficava acima da maior parcela disponivel para aquele credito, as tres alternativas caiam no mesmo fallback. Na pratica, Conservadora, Recomendada e Patrimonial podiam apontar para a mesma apresentacao comercial.

## Regra de ancoragem implementada

A parcela confortavel agora e tratada como referencia para tres alvos comerciais:

- Conservadora: 100% da parcela confortavel.
- Recomendada: 115% da parcela confortavel.
- Patrimonial: 130% da parcela confortavel.

Para cada alternativa, o modulo recalcula um input real de simulador, ajustando o credito para que a parcela antes da contemplacao fique proxima do alvo correspondente.

Depois disso, cada card passa novamente pela engine:

```text
calculateSimulatorScenarios
↓
buildSimulatorCommercialPresentation
```

Assim, cada alternativa usa dados reais de calculo, preservando:

- cenario selecionado;
- seguro;
- lance;
- mes de contemplacao;
- INCC;
- regra de credito atualizado por `updatedCredit`.

## Comportamento de fallback

Se a parcela de referencia for invalida ou menor/igual a zero, nenhuma proposta e gerada.

Se a parcela base da simulacao nao puder ser calculada, o input original e preservado como fallback seguro.

O fluxo de salvar e personalizar proposta tambem passou a carregar o credito ajustado da alternativa selecionada, evitando divergencia entre card e simulacao salva.

## Exemplo de validacao

Com parametros padrao do simulador e parcela confortavel de R$ 3.000,00:

- Conservadora: alvo R$ 3.000,00; credito aproximado R$ 435.953,88; parcela R$ 3.000,00.
- Recomendada: alvo R$ 3.450,00; credito aproximado R$ 501.346,96; parcela R$ 3.450,00.
- Patrimonial: alvo R$ 3.900,00; credito aproximado R$ 566.740,04; parcela R$ 3.900,00.

Os valores sao recalculados pela engine e podem variar conforme administradora, seguro, lance, prazo, INCC e mes de contemplacao.

## Validacao do INCC

Com INCC anual de exemplo em 4%, a regra de reajuste anual gera:

- mes 1: 0 reajustes; credito atualizado R$ 400.000,00.
- mes 50: 4 reajustes; credito atualizado R$ 467.943,42.
- mes 91: 7 reajustes; credito atualizado R$ 526.372,71.
- mes 150: 12 reajustes; credito atualizado R$ 640.412,89.

Isso confirma que, quando o INCC e maior que zero, o campo `Credito` cresce conforme o mes de contemplacao e nao permanece igual ao credito base.

## Validacao das tres alternativas

Critérios esperados:

- os tres cards deixam de reutilizar a mesma proposta quando ha referencia valida;
- Conservadora ancora na parcela confortavel;
- Recomendada fica acima da Conservadora;
- Patrimonial fica acima da Recomendada;
- todos os cards usam `presentation.updatedCredit` para o campo `Credito`;
- salvar ou personalizar uma alternativa preserva o credito ajustado.

## Limitações conhecidas

- A v1 usa multiplicadores fixos de 100%, 115% e 130%.
- A estrategia ainda nao otimiza por restricoes comerciais externas, disponibilidade real de grupo ou regra especifica de administradora alem dos parametros ja presentes no simulador.
- A validacao visual dos meses 1, 50, 91 e 150 deve ser repetida manualmente em tela/PDF antes de deploy, usando INCC maior que zero.

## Validações técnicas

Executadas:

```text
npm.cmd run typecheck: passou
npm.cmd run lint: passou com 4 warnings preexistentes em components/crm/crm-page.tsx
npm.cmd run build: passou
```

A validacao de progressao de INCC foi feita por conferencia da mesma formula usada pela engine. A validacao visual em navegador deve ser repetida manualmente antes de deploy com INCC maior que zero, pois depende do fluxo operacional local de simulacao.

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
- CRM Lead Detail
- endpoint ou service de timeline
- persistencia nova de proposta

## Recomendação para Sprint 103A.25

Executar uma rodada de validacao visual e comercial com Bruno usando parcelas confortaveis reais, comparando os tres cards e o PDF gerado para confirmar se os multiplicadores 100%, 115% e 130% estao comercialmente adequados.
