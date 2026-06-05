# 05_SIMULATION_ENGINE_SPEC.md

## OBJETIVO

Definir o motor inicial de cálculo do módulo Simulator do EVOLV com base na planilha operacional de consórcio utilizada pela Patrion.

Esta etapa deve implementar apenas o cálculo base dos cenários de parcela cheia, 70% e 50%.

---

# ÁREA TÉCNICA EXPANSÍVEL

A interface deve possuir uma área técnica expansível/recolhível.

Quando aberta, o consultor preenche os parâmetros da simulação.

Quando recolhida, os parâmetros técnicos ficam ocultos para apresentação ao cliente.

Os resultados devem permanecer visíveis mesmo com a área técnica recolhida.

---

# CAMPOS DE ENTRADA

A área técnica deve permitir preencher:

* Crédito
* Taxa administrativa
* Fundo de reserva
* Prazo em meses
* Seguro mensal
* INCC
* Percentual de venda da carta

Campos obrigatórios nesta fase:

* Crédito
* Taxa administrativa
* Fundo de reserva
* Prazo
* Seguro mensal

Campos previstos, mas ainda sem regra obrigatória nesta etapa:

* INCC
* Percentual de venda da carta

---

# CENÁRIOS

O motor deve calcular três cenários:

## 1. Parcela cheia

Representa 100% do crédito informado.

Fator: 1.0

## 2. Parcela 70%

Representa 70% do crédito informado.

Fator: 0.7

## 3. Meia parcela

Representa 50% do crédito informado.

Fator: 0.5

---

# FÓRMULAS BASE

## Crédito ajustado por cenário

credito_ajustado = credito_base * fator_do_cenario

---

## Taxa administrativa

taxa_administrativa_valor = credito_base * taxa_administrativa_percentual

Observação: na planilha atual, a taxa administrativa permanece calculada sobre o crédito base, mesmo nos cenários de 70% e 50%.

---

## Fundo de reserva

fundo_reserva_valor = credito_base * fundo_reserva_percentual

Observação: na planilha atual, o fundo de reserva permanece calculado sobre o crédito base, mesmo nos cenários de 70% e 50%.

---

## Seguro mensal

seguro_mensal_valor = (credito_base + taxa_administrativa_valor + fundo_reserva_valor) * seguro_percentual

Observação: na planilha atual, o seguro permanece igual nos três cenários.

---

## Saldo devedor

saldo_devedor = credito_ajustado + taxa_administrativa_valor + fundo_reserva_valor

---

## Parcela sem seguro

parcela_sem_seguro = saldo_devedor / prazo_meses

---

## Parcela com seguro

parcela_com_seguro = parcela_sem_seguro + seguro_mensal_valor

---

# RESULTADOS POR CENÁRIO

Cada cenário deve retornar:

* Nome do cenário
* Fator do cenário
* Crédito ajustado
* Taxa administrativa em valor
* Fundo de reserva em valor
* Seguro mensal em valor
* Saldo devedor
* Parcela sem seguro
* Parcela com seguro

---

# EXEMPLO DE VALIDAÇÃO

Entradas:

* Crédito: R$ 400.000,00
* Taxa administrativa: 26%
* Fundo de reserva: 2%
* Prazo: 197 meses
* Seguro: 0,0300%

Resultados esperados:

## Cheia

* Crédito ajustado: R$ 400.000,00
* Taxa administrativa: R$ 104.000,00
* Fundo de reserva: R$ 8.000,00
* Seguro mensal: R$ 153,60
* Saldo devedor: R$ 512.000,00
* Parcela sem seguro: R$ 2.598,98
* Parcela com seguro: R$ 2.752,58

## 70%

* Crédito ajustado: R$ 280.000,00
* Taxa administrativa: R$ 104.000,00
* Fundo de reserva: R$ 8.000,00
* Seguro mensal: R$ 153,60
* Saldo devedor: R$ 392.000,00
* Parcela sem seguro: R$ 1.989,85
* Parcela com seguro: R$ 2.143,45

## 50%

* Crédito ajustado: R$ 200.000,00
* Taxa administrativa: R$ 104.000,00
* Fundo de reserva: R$ 8.000,00
* Seguro mensal: R$ 153,60
* Saldo devedor: R$ 312.000,00
* Parcela sem seguro: R$ 1.583,76
* Parcela com seguro: R$ 1.737,36

---

# REGRAS DE IMPLEMENTAÇÃO

O motor de cálculo deve ficar isolado no módulo Simulator.

Não colocar fórmulas diretamente em componentes visuais.

Criar função reutilizável para cálculo dos cenários.

A função deve receber os parâmetros de entrada e retornar um objeto estruturado com os três cenários.

---

# FORA DO ESCOPO DESTA ETAPA

Não implementar ainda:

* lance embutido
* lance em dinheiro
* venda da carta
* alavancagem
* PDF
* INCC
* múltiplas administradoras reais
* comparação entre propostas

Esses itens entram em etapas posteriores.



