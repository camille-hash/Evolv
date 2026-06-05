# 05_SIMULATION_ENGINE_SPEC.md

## OBJETIVO

Definir o motor inicial de cálculo do módulo Simulator do EVOLV.

Esta etapa implementa apenas os cálculos fundamentais utilizados na planilha operacional da Patrion.

---

# ÁREA TÉCNICA

A área técnica deve ser expansível e recolhível.

Os resultados devem continuar visíveis após o recolhimento.

---

# CAMPOS DE ENTRADA

Obrigatórios:

* Crédito
* Taxa administrativa
* Fundo de reserva
* Prazo
* Seguro mensal

Previstos:

* INCC
* Venda da carta

---

# CENÁRIOS

## Cenário 1

Parcela cheia

Fator: 1.0

---

## Cenário 2

Parcela 70%

Fator: 0.7

---

## Cenário 3

Meia parcela

Fator: 0.5

---

# FÓRMULAS

## Crédito ajustado

credito_ajustado = credito_base × fator

---

## Taxa administrativa

taxa_administrativa_valor = credito_base × percentual_taxa_administrativa

---

## Fundo de reserva

fundo_reserva_valor = credito_base × percentual_fundo_reserva

---

## Seguro

seguro_mensal_valor =
(credito_base + taxa_administrativa_valor + fundo_reserva_valor)
× percentual_seguro

---

## Saldo devedor

saldo_devedor =
credito_ajustado +
taxa_administrativa_valor +
fundo_reserva_valor

---

## Parcela sem seguro

parcela_sem_seguro =
saldo_devedor ÷ prazo

---

## Parcela com seguro

parcela_com_seguro =
parcela_sem_seguro +
seguro_mensal_valor

---

# TOTAL INVESTIDO ATÉ CONTEMPLAÇÃO

total_investido_ate_contemplacao =
parcela_antes_contemplacao × mes_contemplacao

A parcela utilizada deve respeitar:

* cenário selecionado;
* opção com seguro ou sem seguro.

---

# RESULTADOS

Cada cenário deve retornar:

* nome;
* fator;
* crédito ajustado;
* taxa administrativa;
* fundo reserva;
* seguro;
* saldo devedor;
* parcela sem seguro;
* parcela com seguro.

---

# EXEMPLO DE VALIDAÇÃO

Entradas:

* Crédito: R$ 400.000
* Taxa administrativa: 26%
* Fundo reserva: 2%
* Prazo: 197
* Seguro: 0,0300%

Resultados:

## Cheia

* Saldo devedor: R$ 512.000
* Parcela sem seguro: R$ 2.598,98
* Parcela com seguro: R$ 2.752,58

## 70%

* Saldo devedor: R$ 392.000
* Parcela sem seguro: R$ 1.989,85
* Parcela com seguro: R$ 2.143,45

## 50%

* Saldo devedor: R$ 312.000
* Parcela sem seguro: R$ 1.583,76
* Parcela com seguro: R$ 1.737,36

---

# REGRAS DE IMPLEMENTAÇÃO

O motor deve permanecer isolado em:

modules/simulator

Não colocar fórmulas dentro dos componentes visuais.

Criar funções reutilizáveis e testáveis.

---

# FORA DO ESCOPO

Não implementar ainda:

* lance embutido;
* lance em dinheiro;
* venda da carta;
* alavancagem;
* PDF;
* múltiplas administradoras reais;
* comparação entre propostas.

Esses módulos entram em fases posteriores.
