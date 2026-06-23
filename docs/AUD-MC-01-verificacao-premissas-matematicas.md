# AUD-MC-01

## Resumo Executivo

Esta auditoria inspecionou as implementacoes de Simulacao Comercial, Multi-Cotas e seus geradores de PDF, sem alterar codigo ou formulas.

Conclusao principal: a suspeita sobre `Investimento Real` esta confirmada. Na Simulacao Comercial, o total investido ate a contemplacao nao soma o historico das parcelas em cada faixa anual de INCC. A implementacao calcula a parcela com o fator acumulado vigente no mes de contemplacao e multiplica esse valor por todos os meses anteriores:

```text
parcela_final_reajustada * mes_de_contemplacao
```

Fonte: `modules/simulator/presentation.ts:60-79`.

Isso aplica retroativamente o ultimo fator de INCC a parcelas que, historicamente, teriam sido pagas antes daquele reajuste. Como `realInvestment`, lucro, ROI e alavancagem dependem desse total, todos podem ser afetados.

O Multi-Cotas nao compartilha a engine da Simulacao Comercial. Ele possui uma engine propria e mais simples, sem parcela, investimento real, lance, taxa administrativa, fundo de reserva, seguro ou venda da carta. O campo visual chamado ROI no Multi-Cotas representa valorizacao estimada sobre o credito original, e nao retorno sobre capital efetivamente investido.

Os PDFs nao chamam as engines novamente. O PDF Comercial recebe a apresentacao calculada e apenas formata seus campos. O PDF Multi-Cotas le o snapshot persistido; ele recompõe somente o ganho consolidado pela soma de dois componentes ja salvos.

## Premissas Encontradas

### Simulacao Comercial

- A engine-base calcula tres cenarios de parcela: cheia, 70% e 50% (`modules/simulator/engine.ts:32-40`).
- Taxa administrativa e fundo de reserva sao calculados sobre o credito base integral (`modules/simulator/engine.ts:47-48`).
- O seguro mensal e calculado sobre credito base mais taxa administrativa e fundo de reserva (`modules/simulator/engine.ts:49-51`).
- O saldo de cada cenario usa credito ajustado pelo fator do cenario, mas reutiliza taxas calculadas sobre o credito integral (`modules/simulator/engine.ts:54-70`).
- INCC, contemplacao, lance, venda, investimento, ROI e alavancagem nao sao calculados em `engine.ts`; ficam em `presentation.ts` (`modules/simulator/presentation.ts:46-137`). Portanto, a fonte matematica comercial esta dividida entre engine-base e camada de apresentacao.

### Multi-Cotas

- Possui engine independente: `calculateMultiCotas` (`modules/multi-cotas/multi-cotas-engine.ts:27-84`).
- Cada carta contem apenas valor original, mes de contemplacao e mes de saque (`modules/multi-cotas/multi-cotas-types.ts:1-7`).
- A engine nao possui campos para parcela, investimento real, lance, taxas, seguro ou percentual de venda.
- O ganho futuro usa INCC anual ate a contemplacao e apreciacao mensal entre contemplacao e saque (`modules/multi-cotas/multi-cotas-engine.ts:29-57`).

## Investimento Real

### Formula encontrada

Na Simulacao Comercial:

```text
inccFactor = (1 + inccRate) ^ quantidade_de_reajustes
parcela_antes = parcela_base * inccFactor
total_ate_contemplacao = parcela_antes * mes_de_contemplacao
investimento_real = total_ate_contemplacao + lance_em_dinheiro
```

Fontes:

- fator e parcela reajustada: `modules/simulator/presentation.ts:60-75`;
- multiplicacao por todos os meses: `modules/simulator/presentation.ts:76-79`;
- investimento real: `modules/simulator/presentation.ts:103-105`.

### Resposta AUD-01

**Usa parcela atual multiplicada. Nao usa historico real das parcelas.**

Nao existe loop, serie ou somatorio que aplique a parcela original nos meses 1-12, um reajuste nos meses 13-24, dois reajustes nos meses 25-36 e assim por diante.

### Quantificacao do desvio

Considerando INCC anual de 6% e uma parcela-base `P`, sem outros efeitos:

| Contemplacao | Formula atual | Somatorio historico | Superestimacao |
| --- | ---: | ---: | ---: |
| Mes 13 | 13,7800 P | 13,0600 P | 5,51% |
| Mes 25 | 28,0900 P | 25,8436 P | 8,69% |
| Mes 50 | 63,1238 P | 55,0203 P | 14,73% |
| Mes 91 | 136,8304 P | 111,2515 P | 22,99% |
| Mes 150 | 301,8295 P | 214,5125 P | 40,70% |

Esses percentuais isolam apenas o metodo temporal do INCC. O impacto monetario real depende da parcela-base, seguro e cenario selecionado.

### Efeito em cascata

O total superestimado alimenta:

- `realInvestment`;
- `estimatedCardSaleProfit = estimatedCardSaleValue - realInvestment`;
- `estimatedCardSaleGainRate = profit / realInvestment`;
- `leverageMultiple = saleValue / realInvestment`.

Fontes: `modules/simulator/presentation.ts:103-135`.

## INCC

### Resposta AUD-02

O INCC e tratado como **reajuste anual discreto e composto**, com viradas nos meses 13, 25, 37, 49 etc.:

```text
quantidade = floor((mes_de_contemplacao - 1) / 12)
fator = (1 + taxa_anual) ^ quantidade
```

Fontes:

- Simulacao Comercial: `modules/simulator/presentation.ts:60-65` e `223-224`;
- Multi-Cotas: `modules/multi-cotas/multi-cotas-engine.ts:29-37` e `132-135`.

O credito atualizado usa corretamente esse fator acumulado no ponto da contemplacao. A divergencia nao esta na periodicidade do credito, mas na aplicacao do fator final a todas as parcelas historicas da Simulacao Comercial.

Tambem foi observado que `getScenarioInstallment` multiplica a parcela inteira pelo fator de INCC (`modules/simulator/presentation.ts:153-162`). Isso reajusta em conjunto principal, taxas e seguro embutidos na parcela-base. Porem, no recalculo pos-lance, taxa administrativa, fundo de reserva e seguro voltam a valores nominais nao reajustados (`modules/simulator/presentation.ts:192-204`). Ha, portanto, bases diferentes conforme exista lance.

### Resposta AUD-03 - Contemplacao

O mes de contemplacao:

- e limitado entre 1 e o prazo total (`modules/simulator/presentation.ts:56-59` e `219-220`);
- define quantos reajustes anuais incidem;
- multiplica diretamente a parcela final para formar o total investido;
- define os meses restantes usados na parcela pos-contemplacao;
- no Multi-Cotas, define o INCC acumulado e o inicio do periodo de apreciacao ate o saque.

## Credito Atualizado

### Resposta AUD-04

Na Simulacao Comercial:

```text
credito_atualizado = credito_base * (1 + INCC_anual) ^ reajustes
```

Fonte: `modules/simulator/presentation.ts:60-65`.

No Multi-Cotas, a mesma forma matematica e replicada por carta:

```text
credito_atualizado_da_carta = valor_original * (1 + INCC_anual) ^ reajustes
```

Fonte: `modules/multi-cotas/multi-cotas-engine.ts:29-37`.

Observacao: na Simulacao Comercial, `updatedCredit` sempre parte do credito integral informado, independentemente do cenario de parcela 100%, 70% ou 50%. O cenario altera a parcela, nao o credito atualizado (`modules/simulator/presentation.ts:54-75`).

## Credito Liquido

### Resposta AUD-05

O lance embutido e calculado sobre o credito atualizado e abatido do credito disponivel:

```text
lance_embutido = credito_atualizado * percentual_embutido
credito_liquido = max(0, credito_atualizado - lance_embutido)
```

Fontes: `modules/simulator/presentation.ts:81-85` e `101-102`.

O lance em dinheiro:

- nao reduz o credito liquido entregue ao cliente;
- e somado ao investimento real;
- reduz o saldo considerado no calculo da parcela pos-contemplacao.

Fontes: `modules/simulator/presentation.ts:83-85`, `104` e `192-204`.

O comportamento do credito liquido para lance embutido esta matematicamente coerente com a regra de abatimento. Contudo, a parcela pos-lance soma taxas nominais base a um credito atualizado por INCC, o que merece validacao de premissa contratual.

O Multi-Cotas nao possui lance embutido nem lance em dinheiro. Seu `commercialCredit` e simplesmente igual a `updatedCredit` (`modules/multi-cotas/multi-cotas-engine.ts:46-54`).

### Resposta AUD-06 - Venda da Carta

Na Simulacao Comercial:

```text
valor_estimado_venda = credito_liquido * percentual_venda
```

Fonte: `modules/simulator/presentation.ts:101-105`.

O formulario converte o percentual digitado diretamente para taxa decimal (`components/simulator/simulator-panel.tsx:2247-2263`). Com o valor padrao de 20%, a formula retorna 20% do credito liquido, nao credito liquido acrescido de 20%. Isso e coerente apenas se o campo representar o preco de venda como percentual do credito; seria divergente se representar um agio de 20% sobre o credito.

O Multi-Cotas nao modela venda da carta. Seu `futureValue` e valorizacao financeira mensal do credito atualizado entre contemplacao e saque (`modules/multi-cotas/multi-cotas-engine.ts:38-55`).

## ROI

### Resposta AUD-07 - Simulacao Comercial

```text
lucro = valor_estimado_venda - investimento_real
ROI = lucro / investimento_real
alavancagem = valor_estimado_venda / investimento_real
```

Fonte: `modules/simulator/presentation.ts:103-135`.

As formulas sao internamente convencionais para retorno simples e multiplo sobre capital. Entretanto, seus denominadores herdam a superestimacao do investimento pre-contemplacao. Isso tende a reduzir o lucro, o ROI e a alavancagem exibidos em contemplacoes tardias.

### Multi-Cotas

```text
valor_futuro = credito_atualizado * (1 + apreciacao_mensal) ^ meses_ociosos
ganho_estimado = valor_futuro - credito_original
"ROI" = ganho_estimado / credito_original
```

Fonte: `modules/multi-cotas/multi-cotas-engine.ts:38-57`.

Essa taxa nao e comparavel ao ROI da Simulacao Comercial. Ela mede valorizacao sobre o valor nominal contratado, sem pagamentos, taxas, seguro, lance ou capital efetivamente desembolsado.

## Multi-Cotas

### Resposta AUD-08

**Possui implementacao propria. Nao compartilha a engine da Simulacao Comercial.**

Ha somente semelhanca conceitual na formula anual do INCC. As funcoes sao distintas:

- `calculateInccAdjustmentCount` em `modules/simulator/presentation.ts:223-224`;
- `calculateMultiCotasInccAdjustmentCount` em `modules/multi-cotas/multi-cotas-engine.ts:132-135`.

Premissas ausentes no Multi-Cotas:

- parcela mensal;
- investimento real;
- taxa administrativa;
- fundo de reserva;
- seguro;
- lance embutido ou em dinheiro;
- venda da carta;
- lucro sobre capital investido.

Consequentemente, Multi-Cotas nao pode hoje demonstrar consistencia integral com a Simulacao Comercial para investimento, lance, credito liquido, venda, ROI ou alavancagem.

O snapshot persistido salva exatamente `input`, `result.cards` e `result.summary` produzidos por `calculateMultiCotas` (`components/multi-cotas/multi-cotas-page.tsx:745-802`).

## PDF Comercial

### Resposta AUD-09

Os numeros financeiros vem do objeto `SimulatorCommercialPresentation` entregue ao gerador. O PDF nao chama a engine e nao recalcula investimento, credito, lance, venda, ROI ou alavancagem.

Evidencias:

- contrato recebe `presentation`: `modules/reports/commercial-pdf.ts:14-20`;
- geracao recebe o objeto ja calculado: `modules/reports/commercial-pdf.ts:60-84`;
- campos financeiros sao apenas formatados: `modules/reports/commercial-pdf.ts:190-305`;
- o simulador passa a mesma `presentation` usada na tela: `components/simulator/simulator-panel.tsx:633-642`.

Portanto, o PDF e consistente com a camada de apresentacao, mas reproduz qualquer divergencia matematica existente nela, incluindo o investimento historico incorreto.

## PDF Multi-Cotas

### Resposta AUD-10

O PDF le exclusivamente o snapshot salvo e nao chama `calculateMultiCotas` nem outra engine (`modules/reports/multi-cotas-pdf.ts:56-72`).

Ele usa:

- `snapshot.input`;
- `snapshot.metadata`;
- `snapshot.result.summary`;
- `snapshot.result.cards`.

Os campos de cada carta sao apenas lidos e formatados (`modules/reports/multi-cotas-pdf.ts:274-291`). A unica recomposicao financeira e:

```text
ganho_estimado_consolidado = totalInccGain + totalIdleAppreciationGain
```

Fonte: `modules/reports/multi-cotas-pdf.ts:261-270`.

Essa soma e equivalente ao ganho total produzido pelos componentes da engine, mas e uma derivacao no PDF. Como o snapshot atual nao possui `monthlyContribution`, `monthlyPayment`, `investment` ou `realInvestment`, as linhas "Parcela" e "Investimento" sao omitidas pelo mecanismo de campos opcionais (`modules/reports/multi-cotas-pdf.ts:274-295`).

## Divergencias Encontradas

### Critica - investimento pre-contemplacao sem historico

O fator acumulado final de INCC e aplicado retroativamente a todas as parcelas anteriores. Diverge do somatorio historico anual e contamina investimento, lucro, ROI e alavancagem.

### Alta - conceitos de ROI nao equivalentes

Simulacao Comercial usa lucro sobre investimento real. Multi-Cotas usa valorizacao sobre credito original. A mesma nomenclatura visual "ROI estimado" representa grandezas diferentes.

### Alta - Multi-Cotas sem premissas financeiras necessarias

Nao existem parcela, investimento real, lance, taxas, seguro ou venda. Assim, nao ha como auditar equivalencia matematica completa entre os dois modulos.

### Media - base inconsistente no pos-lance

Sem lance, a parcela inteira e multiplicada pelo fator final de INCC. Com lance, o saldo usa credito atualizado, mas taxa administrativa, fundo de reserva e seguro nominais da engine-base. A base temporal muda entre caminhos.

### Media - ambiguidade do percentual de venda

A formula usa `credito_liquido * taxa_de_venda`. Deve ser confirmado se o input significa preco da carta como percentual do credito ou agio sobre o credito. O rotulo atual nao elimina essa ambiguidade.

### Media - engine comercial fragmentada

`engine.ts` nao concentra todas as regras financeiras. INCC, lance, venda, investimento e ROI residem em `presentation.ts`, aumentando o risco de a camada chamada de apresentacao se tornar uma segunda engine.

### Baixa - duplicacao da regra anual de INCC

Simulacao Comercial e Multi-Cotas implementam separadamente a mesma contagem de ciclos. Hoje coincidem, mas podem divergir em evolucoes futuras.

### Baixa - PDF Multi-Cotas promete campos ausentes

O gerador contempla parcela e investimento, mas o snapshot oficial nao os produz. O PDF permanece funcional, porem nao consegue exibir essas premissas.

## Impacto Potencial

- Superestimacao crescente do capital investido em contemplacoes tardias.
- Subestimacao de lucro, ROI e alavancagem na Simulacao Comercial.
- Comparacoes comerciais inconsistentes entre contemplacoes precoces e tardias.
- Impossibilidade de comparar ROI Comercial e ROI Multi-Cotas como se fossem a mesma metrica.
- PDFs comercialmente consistentes com suas fontes, mas capazes de materializar premissas matematicas divergentes.
- Risco de snapshots persistirem resultados que mudariam caso a regra historica seja futuramente corrigida.

## Recomendacoes

1. Formalizar matematicamente se o INCC reajusta somente credito, credito e parcelas, ou tambem taxas e seguro.
2. Substituir conceitualmente o produto `parcela_final * meses` por uma serie de parcelas por faixa anual, caso a premissa oficial seja historica.
3. Definir explicitamente o tratamento do mes de virada: reajuste no inicio do mes 13, 25, 37 etc., mantendo a mesma convencao do credito atualizado.
4. Validar a base de taxa administrativa, fundo de reserva e seguro apos INCC e apos lance.
5. Confirmar o significado de "Venda da carta (%)": percentual do credito ou agio sobre o credito.
6. Renomear ou redefinir a metrica Multi-Cotas hoje chamada ROI antes de qualquer comparacao com o ROI Comercial.
7. Somente declarar equivalencia entre engines quando Multi-Cotas modelar capital desembolsado, parcelas e demais custos, ou quando seu escopo for explicitamente limitado a valorizacao de credito.
8. Criar testes matematicos de fronteira para meses 1, 12, 13, 24, 25, 50, 91 e 150, incluindo cenarios com e sem lance.
9. Preservar snapshots antigos como evidencia historica e versionar a formula em eventual evolucao, evitando reinterpretar resultados ja apresentados.

Esta auditoria nao aplicou nenhuma correcao e nao alterou qualquer calculo.
