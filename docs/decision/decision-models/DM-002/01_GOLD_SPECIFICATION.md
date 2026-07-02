# EVOLV — Decision Models

# DM-002 — Commercial Readiness

## 01_GOLD_SPECIFICATION

**Status:** Draft v1.0

---

# Objetivo

O DM-002 representa a maturidade comercial de um Lead.

Enquanto o DM-001 responde:

> **"Quem merece atenção agora?"**

o DM-002 responde:

> **"Em que estágio de maturidade comercial este relacionamento se encontra?"**

Seu objetivo é orientar o consultor sobre o momento adequado para avançar a jornada comercial.

---

# Princípio Fundamental

O DM-002 deverá representar a jornada comercial na linguagem do consultor.

Nunca na linguagem da engenharia.

O consultor não pensa em:

* pesos;
* operadores;
* score interno;
* algoritmos.

Ele pensa em:

* "já fiz a simulação?"
* "o cliente já entendeu?"
* "já discutimos alternativas?"
* "faz sentido apresentar proposta?"
* "ainda preciso amadurecer este relacionamento?"

O modelo deverá reproduzir exatamente esse raciocínio.

---

# Experiência Esperada

Ao abrir um Lead, o consultor deverá compreender imediatamente o nível de maturidade comercial daquele relacionamento.

O EVOLV deverá comunicar isso utilizando estados claros e acionáveis.

---

# Resultado Principal

O principal resultado do DM-002 não deverá ser um número.

O principal resultado deverá ser um **Commercial Readiness Status**.

Exemplo:

```text
NOT_READY

EMERGING

READY

ADVANCED
```

Esses estados representam a posição atual do Lead dentro da jornada comercial.

---

# Estados de Maturidade

## NOT_READY

O relacionamento ainda não possui evidências suficientes para avançar.

Exemplos:

* sem simulação;
* poucas interações;
* ausência de diagnóstico;
* início da jornada.

Recomendação típica:

> Continuar descobrindo necessidades.

---

## EMERGING

O relacionamento começou a amadurecer.

Já existem evidências importantes, mas ainda faltam elementos para um avanço consistente.

Exemplos:

* primeira simulação realizada;
* primeira reunião concluída;
* início de acompanhamento.

Recomendação típica:

> Consolidar entendimento e aprofundar a conversa.

---

## READY

O Lead demonstra maturidade suficiente para o próximo avanço comercial.

Exemplos:

* simulação atual;
* alternativas discutidas;
* relacionamento consistente;
* poucas pendências.

Recomendação típica:

> Avançar para apresentação da proposta.

---

## ADVANCED

O relacionamento encontra-se altamente preparado.

Existem fortes evidências de que o processo comercial pode evoluir para fechamento ou decisão.

Recomendação típica:

> Conduzir o fechamento ou a decisão final.

---

# Linguagem

O DM-002 deverá utilizar linguagem comercial.

Evitar termos técnicos.

Exemplo:

Em vez de:

```text
Commercial Readiness Score = 81
```

Apresentar:

```text
Commercial Readiness

READY

Resumo

Lead possui evidências suficientes para avançar para proposta comercial.
```

O score poderá existir internamente.

Mas não deverá ser o elemento principal da experiência.

---

# Evidências Esperadas

O modelo deverá considerar evidências da jornada comercial.

Entre elas:

## Simulações

* existe simulação;
* quantidade;
* atualização;
* estudo Multi-Cotas.

---

## Reuniões

* primeira reunião;
* segunda reunião;
* continuidade do relacionamento.

---

## Relacionamento

* tarefas;
* notas;
* follow-ups;
* próxima ação.

---

## Propostas

* existência;
* histórico;
* evolução.

---

## Jornada

O modelo deverá considerar o conjunto da jornada.

Nenhuma evidência isolada deverá determinar completamente o resultado.

---

# Lead-Centric

Toda evidência considerada pelo modelo deverá pertencer ao Lead.

Não existem evidências comerciais avulsas.

Toda simulação, proposta, nota, tarefa ou interação deverá estar vinculada ao mesmo Lead.

Isso garante coerência histórica da jornada comercial.

---

# Commercial Simulation Principle

A Simulação Comercial deve estar disponível para qualquer Lead, em qualquer etapa do pipeline ou temperatura comercial.

Nenhum Decision Model, incluindo DM-001 ou DM-002, pode autorizar ou bloquear a criação de uma Simulação Comercial.

A Simulação Comercial é uma ferramenta operacional do Lead e uma evidência consumida pelo DM-002.

Ela não é uma consequência do DM-002.

---

# Relação com DM-001

DM-001 e DM-002 são complementares.

Exemplo:

```text
DM-001

Commercial Attention

↓

95
```

```text
DM-002

Commercial Readiness

↓

EMERGING
```

O Lead merece atenção.

Mas ainda não está pronto para proposta.

Outro exemplo:

```text
DM-001

Commercial Attention

↓

42
```

```text
DM-002

Commercial Readiness

↓

READY
```

O relacionamento já amadureceu.

A prioridade operacional pode ser menor, mas o próximo passo comercial já faz sentido.

---

# Resumo Executivo

O DM-002 deverá produzir um resumo curto.

Exemplo:

```text
Commercial Readiness

READY

Resumo

Lead possui simulação recente,
segunda reunião realizada
e evidências suficientes para apresentação da proposta.
```

Esse resumo deverá explicar o estado encontrado.

---

# Recomendação

Além do estado, o modelo deverá sugerir o próximo avanço comercial.

Exemplos:

```text
Próximo passo recomendado

Criar primeira simulação.
```

```text
Próximo passo recomendado

Agendar segunda reunião.
```

```text
Próximo passo recomendado

Apresentar proposta comercial.
```

```text
Próximo passo recomendado

Conduzir fechamento.
```

O modelo recomenda.

O consultor decide.

---

# Casos de Uso

## Consultor

"Sigo amadurecendo ou avanço?"

---

## Gestor

"Quais Leads estão prontos para proposta?"

---

## Executive Situation

"O Lead possui maturidade suficiente para avançar?"

---

## Decision Models futuros

Outros modelos poderão consumir o estado de Commercial Readiness como evidência complementar.

---

# Critérios de Qualidade

O consultor deverá conseguir compreender o resultado em poucos segundos.

Sem interpretar números.

Sem entender pesos.

Sem conhecer o algoritmo.

A linguagem deverá refletir a forma como um especialista experiente conduz sua operação.

---

# Critério de Sucesso

A Gold Specification será considerada atendida quando o resultado do DM-002 conseguir representar, de maneira intuitiva, o estágio atual da jornada comercial do Lead e orientar claramente qual deve ser o próximo avanço recomendado.

---

# Resultado Esperado

Ao concluir o DM-002, o EVOLV deixará de responder apenas:

> **"Quem merece atenção?"**

e passará também a responder:

> **"Quem já possui maturidade comercial para avançar?"**

Essa nova dimensão de inteligência transforma o EVOLV de um sistema que prioriza contatos em um sistema que compreende a evolução da relação comercial, aproximando a plataforma do modo como consultores experientes realmente conduzem seus negócios.
