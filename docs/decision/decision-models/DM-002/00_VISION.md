# EVOLV — Decision Models

# DM-002 — Commercial Readiness

## 00_VISION

**Status:** Draft v1.0

---

# Visão

O DM-001 respondeu a primeira pergunta fundamental da operação comercial:

> **"Quem merece atenção agora?"**

Entretanto, atenção não significa maturidade.

Um Lead pode merecer atenção imediata e, ainda assim, não estar preparado para avançar comercialmente.

O DM-002 nasce para responder uma segunda pergunta, igualmente importante:

> **"Este Lead está pronto para o próximo avanço comercial?"**

---

# Problema

Na operação diária, o consultor não decide apenas quem deve receber atenção.

Ele também precisa decidir:

* quem ainda precisa de diagnóstico;
* quem precisa de uma simulação;
* quem precisa de uma segunda reunião;
* quem está pronto para uma proposta;
* quem ainda não possui elementos suficientes para avançar.

Hoje esse julgamento depende exclusivamente da experiência do consultor.

O EVOLV ainda não representa formalmente esse conhecimento.

---

# Motivação

O objetivo do DM-002 não é substituir o julgamento comercial.

Seu objetivo é tornar explícito o raciocínio utilizado por especialistas experientes para avaliar a maturidade de um relacionamento comercial.

O modelo deverá responder continuamente se um Lead já acumulou evidências suficientes para seguir para o próximo passo da jornada.

---

# Princípio Fundamental

O DM-002 não mede prioridade.

O DM-002 mede **maturidade comercial**.

Esses conceitos são independentes.

Um Lead pode apresentar:

* alta prioridade;
* baixa maturidade.

Ou:

* baixa prioridade;
* alta maturidade.

Os dois modelos deverão coexistir.

---

# Missão

Transformar evidências comerciais dispersas em um indicador único de prontidão comercial.

Esse indicador apoiará o consultor na decisão sobre quando avançar a jornada do Lead.

---

# Pergunta Central

O DM-002 deverá responder exclusivamente:

> **"Este Lead está pronto para o próximo avanço comercial?"**

Nenhuma outra responsabilidade deverá ser incorporada ao modelo.

---

# Fonte do Conhecimento

O conhecimento utilizado pelo DM-002 será derivado principalmente da operação comercial real.

Especialmente:

* entrevistas com especialistas;
* observação da rotina comercial;
* histórico operacional do Lead;
* evidências registradas no CRM.

O modelo deverá representar conhecimento humano formalizado.

---

# Evidências Esperadas

O DM-002 deverá considerar, entre outras, evidências como:

## Simulação Comercial

* existe simulação?
* quantidade de simulações;
* última simulação;
* atualização da simulação;
* estudo Multi-Cotas.

---

## Jornada Comercial

* primeira reunião;
* segunda reunião;
* reuniões posteriores;
* intervalo entre reuniões.

---

## Relacionamento

* notas;
* tarefas;
* follow-ups;
* próxima ação;
* interações recentes.

---

## Propostas

* proposta apresentada;
* revisões;
* histórico de propostas.

---

## Executive Intelligence

* Executive Situation;
* Check Points;
* Decision Outputs relevantes.

---

# Fora de Escopo

O DM-002 não deverá:

* decidir prioridade;
* calcular valor financeiro;
* recomendar investimentos;
* selecionar administradoras;
* substituir o simulador;
* alterar o pipeline;
* gerar propostas automaticamente;
* disparar automações comerciais.

Essas responsabilidades pertencem a outros componentes da plataforma.

---

# Relação com o DM-001

DM-001 responde:

> Quem merece atenção?

DM-002 responde:

> Quem está pronto para avançar?

Os dois modelos são complementares.

Nenhum substitui o outro.

---

# Papel na Plataforma

O DM-002 será um consumidor natural dos artefatos produzidos ao longo da jornada do Lead.

Especialmente:

* Simulações Comerciais;
* Estudos Multi-Cotas;
* Notas;
* Tarefas;
* Interações;
* Executive Situation.

Esses artefatos tornam-se evidências utilizadas pelo modelo.

---

# Relação com o Lead

O Lead permanece o Aggregate Root do domínio comercial.

Toda evidência utilizada pelo DM-002 deverá estar vinculada a um Lead.

O modelo nunca deverá operar sobre artefatos desvinculados.

Essa decisão preserva a consistência histórica da jornada comercial.

---

# Benefícios Esperados

Após sua implementação, o EVOLV será capaz de:

* indicar quando um Lead ainda precisa amadurecer;
* reduzir avanços comerciais prematuros;
* aumentar consistência entre consultores;
* transformar experiência comercial em conhecimento executável;
* apoiar decisões comerciais com base em evidências.

---

# Impacto Estratégico

O DM-001 introduziu o conceito de **atenção comercial**.

O DM-002 introduzirá o conceito de **maturidade comercial**.

Juntos, esses modelos começam a representar não apenas o estado atual do Lead, mas também sua posição dentro da jornada comercial.

---

# Critério de Sucesso

A entrega será considerada bem-sucedida quando o modelo conseguir representar, de forma consistente, o julgamento de um consultor experiente sobre a prontidão de um Lead para avançar comercialmente.

O resultado deverá refletir a maturidade da relação construída com o cliente, e não apenas a urgência de contato.

---

# Resultado Esperado

Ao final da implementação do DM-002, o EVOLV deixará de responder apenas:

> **"Quem devo atender primeiro?"**

E passará também a responder:

> **"Quem já está preparado para o próximo passo da jornada comercial?"**

Essa distinção estabelece uma nova dimensão de inteligência na plataforma, permitindo que prioridade e maturidade coexistam como capacidades independentes, complementares e reutilizáveis para futuras decisões comerciais.
