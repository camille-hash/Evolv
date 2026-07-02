# EVOLV — Decision Models

# DM-002 — Commercial Readiness

## 02_ENGINEERING_SPECIFICATION

**Status:** Draft v1.0

---

# 1. Objetivo de Engenharia

O DM-002 é responsável por avaliar a maturidade comercial de um Lead.

Sua responsabilidade é determinar, com base nas evidências operacionais já registradas, se o relacionamento possui condições para avançar para o próximo passo da jornada comercial.

O modelo não toma decisões operacionais.

Ele produz uma avaliação estruturada.

---

# 2. Pergunta Única

Todo Decision Model deve responder apenas uma pergunta.

O DM-002 responde exclusivamente:

> **"Qual é o estágio atual de maturidade comercial deste Lead e qual é o próximo avanço recomendado?"**

Nenhuma outra responsabilidade deverá ser incorporada ao modelo.

---

# 3. Responsabilidade

O DM-002 deverá:

* avaliar evidências comerciais;
* produzir um estado de Commercial Readiness;
* calcular confidence;
* explicar o resultado;
* recomendar o próximo avanço comercial.

---

# 4. Não Responsabilidades

O DM-002 nunca deverá:

* bloquear Simulação Comercial;
* autorizar Simulação Comercial;
* alterar pipeline;
* criar propostas;
* criar tarefas;
* mover Lead entre etapas;
* executar automações;
* alterar Executive Situation diretamente;
* persistir artefatos comerciais.

Essas responsabilidades pertencem a outros componentes.

---

# 5. Princípio Operacional

O modelo consome evidências.

Ele nunca controla ferramentas.

Exemplo:

```text
Simulação Comercial

↓

Evidência
```

Nunca:

```text
DM-002

↓

Libera Simulação
```

---

# 6. Decision Context

O Decision Context deverá representar exclusivamente o estado atual da jornada comercial.

Categorias esperadas:

## Simulation Evidence

* existe simulação;
* quantidade;
* última simulação;
* atualização;
* Multi-Cotas;
* histórico.

---

## Commercial Journey

* primeira reunião;
* segunda reunião;
* reuniões posteriores;
* etapa atual;
* evolução.

---

## Proposal Evidence

* proposta apresentada;
* revisões;
* histórico.

---

## Relationship Evidence

* tarefas;
* notas;
* follow-ups;
* interações;
* próxima ação.

---

## Executive Evidence

* Executive Situation;
* Decision Outputs anteriores;
* Check Points.

---

## Temporal Evidence

* recência das evidências;
* continuidade da jornada;
* períodos sem atividade.

---

# 7. Lead-Centric Rule

Todo elemento do Decision Context deverá pertencer ao mesmo Lead.

Não será permitido:

* consultar evidências externas;
* consultar simulações avulsas;
* consultar propostas desvinculadas;
* consultar notas sem Lead.

O Lead permanece o Aggregate Root do domínio comercial.

---

# 8. Modelo de Avaliação

O DM-002 deverá trabalhar sobre evidências.

Não sobre regras isoladas.

O resultado representa uma composição da jornada comercial.

Nenhuma evidência individual deverá determinar completamente o resultado.

---

# 9. Estado Principal

O principal resultado do modelo será:

```text
Commercial Stage
```

Estados previstos:

```text
DISCOVERY

DEVELOPING

READY

COMMITMENT
```

Esses estados representam a posição atual da jornada.

---

# 10. Score

O modelo poderá produzir score interno.

Entretanto:

* score não é o principal resultado;
* score serve como suporte;
* a interface privilegia o Commercial Stage.

---

# 11. Confidence

O modelo deverá produzir confidence.

A confidence representa o grau de confiança do modelo na classificação obtida.

Não representa probabilidade de fechamento.

---

# 12. Recommendation

Além do estágio comercial, o modelo deverá produzir uma recomendação operacional.

Exemplos:

```text
Criar primeira simulação.
```

```text
Agendar segunda reunião.
```

```text
Apresentar proposta.
```

```text
Conduzir fechamento.
```

A recomendação nunca executa ações.

Ela apenas orienta.

---

# 13. Explainability

Todo resultado deverá possuir:

* rationale;
* evidências utilizadas;
* principais contributors;
* confidence.

O DM-002 deverá manter o mesmo padrão de explicabilidade adotado pelo DM-001.

---

# 14. Decision Output

O Decision Output deverá seguir o contrato oficial da plataforma.

Além dos campos comuns, deverá conter:

```text
Commercial Stage

Recommendation
```

Esses campos passam a fazer parte da identidade do modelo.

---

# 15. Relação com DM-001

DM-001 e DM-002 são independentes.

DM-001 mede prioridade.

DM-002 mede maturidade.

Um modelo nunca deverá consumir diretamente o resultado do outro.

Ambos poderão ser consumidos pela Executive Situation.

---

# 16. Relação com Executive Situation

A Executive Situation será responsável por sintetizar:

```text
DM-001

+

DM-002

+

Future Decision Models
```

Nenhum Decision Model conhece a Executive Situation.

A dependência é unidirecional.

---

# 17. Determinismo

Mesmo:

* Decision Context;
* versão do modelo;
* operadores.

↓

Mesmo resultado.

O modelo deverá permanecer determinístico.

---

# 18. Testabilidade

Os operadores deverão ser testáveis isoladamente.

O modelo deverá possuir testes para:

* Discovery;
* Developing;
* Ready;
* Commitment;
* Recommendation;
* Confidence;
* Explainability.

---

# 19. Evolução

Novas evidências poderão ser incorporadas.

Entretanto:

* o contrato público deverá permanecer estável;
* o significado dos estados deverá ser preservado;
* a pergunta central do modelo nunca deverá mudar.

---

# 20. Critérios de Engenharia

A implementação será considerada aderente quando:

* existir Decision Context próprio;
* existir operadores especializados;
* existir Decision Output explicável;
* Commercial Stage for o principal resultado;
* Recommendation estiver presente;
* Simulação Comercial permanecer ferramenta operacional;
* Lead continuar sendo o Aggregate Root;
* o modelo permanecer independente do DM-001.

---

# 21. Decisão de Engenharia Oficial

O DM-002 será um **Journey Decision Model**.

Sua missão é representar a maturidade da jornada comercial por meio das evidências registradas no Lead.

O modelo não governa a operação.

Ele interpreta a operação.

Essa distinção preserva a separação entre ferramentas operacionais e inteligência decisória, permitindo que a plataforma evolua com novos modelos sem transformar Decision Models em mecanismos de controle da interface ou do fluxo operacional.
