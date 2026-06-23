# Sprint 103A.53-C1 - Investimento Real Historico

## Objetivo

Corrigir exclusivamente o calculo de investimento real da Simulacao Comercial para considerar o historico das parcelas reajustadas pelo INCC ate o mes de contemplacao.

## Problema encontrado

A implementacao anterior calculava o total investido ate a contemplacao assim:

```text
parcela no mes de contemplacao * quantidade total de meses
```

Como a parcela usada ja continha o fator acumulado de INCC do ultimo ciclo, esse fator era aplicado retroativamente a todos os meses anteriores.

Exemplo anterior, com parcela-base de R$ 785,45, INCC de 6% e contemplacao no mes 43:

```text
43 * R$ 935,48 = aproximadamente R$ 40.225,79
```

## Regra corrigida

O total investido agora percorre cada mes ate a contemplacao e aplica somente o numero de reajustes vigente naquele mes:

```text
Meses 1-12:  0 reajustes
Meses 13-24: 1 reajuste
Meses 25-36: 2 reajustes
Meses 37-43: 3 reajustes
```

Cada parcela mensal e arredondada a centavos antes de entrar no somatorio, representando o valor efetivamente pago.

Para o exemplo obrigatorio:

```text
(12 * R$ 785,45)
+ (12 * R$ 832,58)
+ (12 * R$ 882,53)
+ (7 * R$ 935,48)
= R$ 36.555,08
```

A parcela corrente exibida no mes 43 continua sendo R$ 935,48. Apenas o acumulado historico deixou de tratar essa parcela final como se tivesse sido paga desde o primeiro mes.

## Implementacao

Foi criado o helper interno `calculateHistoricalInstallmentTotal` em `modules/simulator/presentation.ts`.

Para cada mes, o helper:

1. calcula a quantidade de reajustes com a funcao existente `calculateInccAdjustmentCount`;
2. calcula o fator anual composto aplicavel naquele mes;
3. reutiliza `getScenarioInstallment` para obter a parcela do mesmo cenario e opcao de seguro;
4. arredonda a parcela mensal a centavos;
5. adiciona a parcela ao total historico.

O mesmo processo e aplicado a:

- cenario selecionado, formando `totalInvestedUntilContemplation`;
- cenario-base de parcela cheia, formando `totalInvestedUntilContemplationBase`.

Isso preserva o calculo pos-contemplacao dos cenarios 70% e 50%, agora usando acumulados historicos coerentes em ambos os lados da compensacao.

## Impactos

### Investimento Real

Permanece definido como:

```text
investimento real = total historico ate contemplacao + lance em dinheiro
```

O lance embutido continua fora do capital desembolsado pelo cliente.

### Lucro

Permanece definido como:

```text
lucro = valor estimado de venda - investimento real
```

Como o investimento real foi corrigido, o lucro passa automaticamente a usar o acumulado historico correto.

### ROI

Permanece definido como:

```text
ROI = lucro / investimento real
```

Nenhuma formula de ROI foi alterada; seu denominador agora recebe o investimento real corrigido.

### Alavancagem

Permanece definida como:

```text
alavancagem = valor estimado de venda / investimento real
```

Nenhuma formula de alavancagem foi alterada; seu denominador agora recebe o investimento real corrigido.

## PDFs

Nenhum gerador de PDF foi alterado.

O PDF Comercial continua recebendo o objeto `SimulatorCommercialPresentation` e formatando diretamente:

- `realInvestment`;
- `estimatedCardSaleProfit`;
- `estimatedCardSaleGainRate`;
- `leverageMultiple`.

Portanto, passa a receber os valores corrigidos sem recalculo proprio.

O PDF Multi-Cotas nao foi alterado nem impactado.

## Multi-Cotas

Nenhum arquivo em `modules/multi-cotas/` foi alterado.

A engine Multi-Cotas permanece independente e fora do escopo desta corretiva.

## Arquivos alterados

- `modules/simulator/presentation.ts`

## Arquivos criados

- `docs/115-sprint-103a53-c1-investimento-real-historico.md`

## Validacoes

- `npm.cmd run typecheck`: aprovado.
- `npm.cmd run lint`: aprovado com quatro warnings preexistentes em `components/crm/crm-page.tsx`.
- `npm.cmd run build`: aprovado, codigo de saida 0.
- Exemplo matematico do mes 43: R$ 36.555,08 pelo historico contra R$ 40.225,79 pela formula anterior.
- `git diff --check`: executado na validacao final.

## Confirmacoes de escopo

- Nenhuma UX ou tela foi alterada.
- Nenhum PDF foi alterado.
- Nenhum arquivo Multi-Cotas foi alterado.
- Nenhum SQL ou migration foi criado.
- Nenhum banco, Auth ou RLS foi alterado.
- Nenhuma funcionalidade ou metrica nova foi criada.
