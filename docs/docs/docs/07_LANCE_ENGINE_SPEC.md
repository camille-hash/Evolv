# 07_LANCE_ENGINE_SPEC.md

## OBJETIVO

Implementar o motor de lance do EVOLV.

Esta etapa adiciona ao simulador:

* lance embutido;
* lance em dinheiro;
* crédito líquido;
* investimento real;
* impacto na venda da carta;
* lucro;
* percentual de ganho;
* alavancagem.

---

# LANCE EMBUTIDO

O lance embutido não representa desembolso direto do cliente.

Ele reduz o crédito líquido disponível.

Fórmula:

credito_liquido = credito_atualizado - valor_lance_embutido

valor_lance_embutido = credito_atualizado × percentual_lance_embutido

---

# LANCE EM DINHEIRO

O lance em dinheiro representa desembolso adicional do cliente.

Ele não reduz o crédito líquido.

Fórmula:

valor_lance_dinheiro = credito_atualizado × percentual_lance_dinheiro

credito_liquido = credito_atualizado

---

# INVESTIMENTO REAL

O investimento real deve considerar:

* total investido até contemplação;
* lance em dinheiro, quando houver.

Fórmula:

investimento_real = total_investido_ate_contemplacao + valor_lance_dinheiro

O lance embutido não aumenta o investimento real.

---

# VENDA DA CARTA

A venda da carta deve considerar o crédito atualizado.

Fórmula:

valor_venda_carta = credito_atualizado × percentual_venda_carta

---

# LUCRO

Fórmula:

lucro = valor_venda_carta - investimento_real

---

# PERCENTUAL DE GANHO

Fórmula:

percentual_ganho = lucro / investimento_real

---

# ALAVANCAGEM

Fórmula:

multiplo_alavancagem = valor_venda_carta / investimento_real

---

# APRESENTAÇÃO COMERCIAL

Mostrar na área principal:

* crédito contratado;
* crédito atualizado;
* crédito líquido disponível;
* tipo de lance;
* valor do lance;
* investimento real;
* valor estimado de venda;
* lucro estimado;
* percentual de ganho;
* múltiplo de alavancagem.

Não mostrar fórmulas internas.
