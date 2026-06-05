# 04_SIMULATOR_MODULE_SPEC.md

## OBJETIVO

Definir o escopo funcional inicial do módulo Simulator do EVOLV.

Esta fase deve atender a necessidade operacional imediata: criar um simulador multiadministradoras, parametrizável, capaz de gerar cenários comparativos e relatório PDF futuramente.

---

# PRINCÍPIO

O consultor deve conseguir preencher os dados técnicos da simulação sem que esses dados fiquem expostos ao cliente final.

A área de preenchimento deve ser expansível/recolhível.

Após preenchida, a simulação deve aparecer em formato de apresentação comercial.

---

# ENTRADAS PARAMETRIZÁVEIS

O sistema deve permitir preencher manualmente:

* Administradora;
* Prazo em meses;
* Valor da carta;
* Taxa administrativa;
* Valor da parcela;
* Mês estimado de contemplação;
* Percentual ou valor de lance embutido;
* Percentual ou valor de lance em dinheiro;
* Percentual de venda da carta;
* Valor estimado de venda da carta.

Esses campos devem permitir simular diferentes administradoras.

---

# ÁREA DE PREENCHIMENTO

A interface deve possuir uma área técnica expansível/recolhível.

Quando aberta:

* exibir parâmetros técnicos;
* permitir edição.

Quando fechada:

* ocultar informações técnicas.

---

# CENÁRIOS

O sistema deve permitir três cenários:

## Parcela cheia

100% da parcela.

## Parcela reduzida

70% da parcela.

## Meia parcela

50% da parcela.

A seleção deve ocorrer por botões clicáveis.

Não exibir os três cenários simultaneamente na área comercial.

---

# APRESENTAÇÃO COMERCIAL

O cliente deve visualizar:

* Crédito contratado;
* Parcela antes da contemplação;
* Parcela após a contemplação;
* Prazo de contemplação;
* Total investido até contemplação;
* Tipo de cenário selecionado;
* Opção com seguro ou sem seguro.

Não exibir:

* taxa administrativa;
* fundo de reserva;
* saldo devedor;
* fórmulas internas;
* detalhes técnicos.

---

# LANCE EMBUTIDO

O lance embutido reduz o crédito líquido recebido.

Exemplo:

* Carta: R$ 400.000
* Lance embutido: 25%
* Crédito líquido: R$ 300.000

---

# LANCE EM DINHEIRO

O lance em dinheiro aumenta o valor investido.

Exemplo:

* Carta: R$ 400.000
* Lance em dinheiro: R$ 100.000
* Crédito recebido: R$ 400.000

---

# VENDA DA CARTA

Permitir percentual configurável.

Utilizar posteriormente para:

* lucro;
* retorno;
* alavancagem.

---

# ALAVANCAGEM

Comparar:

* valor investido;
* valor recebido.

Indicadores futuros:

* ganho líquido;
* retorno percentual;
* múltiplo de alavancagem.

---

# PDF

Preparar geração futura contendo:

* dados principais;
* contemplação;
* parcela;
* venda da carta;
* alavancagem.

---

# FORA DO ESCOPO

Não implementar ainda:

* CRM;
* Portal do Cliente;
* Concierge;
* IA;
* Open Finance;
* Aplicativo Mobile;
* Integrações externas.

---

# CRITÉRIO DE SUCESSO

O consultor deve conseguir:

1. Preencher os dados técnicos;
2. Recolher a área técnica;
3. Escolher o cenário;
4. Escolher seguro;
5. Ajustar contemplação;
6. Demonstrar a estratégia ao cliente.
