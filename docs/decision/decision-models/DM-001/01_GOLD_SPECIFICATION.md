# DM-001 — GOLD SPECIFICATION

## Model Identity

**Model ID:** DM-001

**Name:** Commercial Attention Allocation

**Family:** Commercial Decision Models

**Status:** Gold Specification

**Version:** 1.0

**Knowledge Source:** Bruno (Especialista Patrimonial)

---

# Purpose

Determinar onde o consultor deve investir sua próxima unidade de atenção comercial.

O modelo não estima probabilidade de fechamento.

O modelo determina prioridade de atenção.

Sua finalidade é orientar a alocação do tempo do consultor durante a operação comercial.

---

# Business Question

> Onde devo investir minha próxima ação comercial?

---

# Decision Philosophy

Este modelo parte do princípio de que tempo e atenção são recursos limitados.

Nem todos os leads devem receber o mesmo nível de energia.

O objetivo do modelo é distribuir atenção comercial de maneira consistente e explicável.

---

# Inputs

O modelo utiliza apenas conceitos de negócio.

Nunca componentes de interface.

Nunca campos específicos do CRM.

## Engagement

Avalia se existe interação ativa entre cliente e consultor.

Exemplos:

* responde mensagens;
* comparece às reuniões;
* faz perguntas;
* solicita comparações.

---

## Continuity

Avalia se o relacionamento continua evoluindo.

Exemplos:

* follow-up realizado;
* continuidade das conversas;
* ausência de esfriamento.

---

## Operational Readiness

Verifica se existem condições mínimas para prosseguir.

Exemplos:

* CPF disponível;
* contato válido;
* documentação mínima.

---

## Product Fit

Avalia aderência entre expectativa do cliente e características do produto.

Exemplo:

* cliente deseja contemplação imediata.

---

## Timing

Representa o momento adequado para atuação.

Exemplos:

* lead recém-chegado;
* cliente pediu retorno em três meses;
* cliente deixou de responder recentemente.

---

## Confidence

Representa o nível de confiança percebido pelo especialista durante a interação.

---

# Decision Outputs

O modelo produz exatamente um dos seguintes estados.

## ACT_NOW

Existe prioridade imediata.

A próxima ação deve ocorrer o mais rapidamente possível.

---

## NURTURE

Existe interesse.

O relacionamento deve continuar sendo desenvolvido.

---

## INVESTIGATE

Ainda existem dúvidas, objeções ou informações insuficientes.

A próxima ação deve buscar esclarecimento.

---

## WAIT

O cliente demonstra interesse, mas o momento ainda não é adequado.

A próxima ação deve ser programada.

---

## DISENGAGE

Não existe interesse suficiente para justificar investimento adicional de energia neste momento.

---

# Required Evidence

O modelo utiliza apenas evidências rastreáveis.

Não utiliza inferências implícitas.

Exemplos:

* resposta do cliente;
* reunião agendada;
* ausência de resposta;
* follow-up;
* documentação;
* qualificação SDR.

---

# Positive Signals

Conhecimento explicitamente identificado durante a entrevista.

* Cadastro realizado.
* Qualificação SDR concluída.
* Primeira reunião agendada.
* Resposta rápida.
* Solicitação de comparações.
* Interesse demonstrado durante a conversa.

---

# Negative Signals

Conhecimento explicitamente identificado durante a entrevista.

* Cliente deixa de responder.
* Cliente não aceita conversar.

---

# Blocking Conditions

Bloqueios operacionais.

* CPF ausente.
* Contato inválido.
* Documentação obrigatória ausente.

---

# Non-Blocking Conditions

Condições que não devem ser tratadas automaticamente como negativas.

* Parcela baixa.
* Pouco conhecimento sobre consórcio.
* Renda ainda não discutida.

---

# False Positives

Até o momento, o especialista não identificou um padrão consistente.

O modelo deve registrar explicitamente:

> Conhecimento insuficiente para modelagem.

---

# Decision Calibration

O especialista utiliza fortemente:

* tempo de resposta;
* continuidade da interação;
* manutenção do relacionamento.

Esses fatores possuem maior relevância do que características financeiras isoladas.

---

# Recommended Actions

| Decision    | Recommended Action                 |
| ----------- | ---------------------------------- |
| ACT_NOW     | Contato imediato                   |
| NURTURE     | Manter follow-up ativo             |
| INVESTIGATE | Identificar e trabalhar objeções   |
| WAIT        | Programar retorno na data adequada |
| DISENGAGE   | Encerrar acompanhamento ativo      |

---

# Explainability

Toda decisão produzida deverá informar:

* quais evidências foram utilizadas;
* quais fatores aumentaram confiança;
* quais fatores reduziram confiança;
* quais bloqueios foram encontrados;
* por que a recomendação foi escolhida.

---

# Explicit Non-Goals

Este modelo não responde:

* probabilidade de fechamento;
* valor da oportunidade;
* escolha de administradora;
* estratégia patrimonial;
* recomendação financeira.

Esses temas pertencem a outros Decision Models.

---

# Relationship with Other Models

Este modelo inaugura a cadeia de decisão.

Fluxo previsto:

DM-001 — Commercial Attention Allocation

↓

DM-002 — Negotiation Readiness

↓

DM-003 — Relationship Temperature

↓

DM-004 — Risk Assessment

↓

DM-005 — Executive Recommendation

---

# Governance

Este documento é a especificação canônica do DM-001.

Qualquer implementação na Decision Engine deverá manter compatibilidade com esta especificação.

Alterações no comportamento do modelo deverão ser realizadas primeiro neste documento e somente depois refletidas na implementação.


