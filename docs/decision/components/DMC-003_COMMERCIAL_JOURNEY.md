# EVOLV — Decision Model Components

# DMC-003 — Commercial Journey

## Status
Draft v1.0

## Objetivo
Definir Commercial Journey como agregado de evidências comerciais de um Lead, reutilizável por Decision Models.

## Definição
Commercial Journey representa a história comercial estruturada de um Lead.

Ela não é tela.
Ela não é Decision Model.
Ela não é Runtime.
Ela não decide.
Ela organiza evidências operacionais.

## Lead-Centric Rule
Toda evidência da Commercial Journey deve pertencer ao mesmo Lead.

## Evidências
Commercial Journey pode conter:
- lead;
- simulações comerciais;
- estudos Multi-Cotas;
- propostas;
- reuniões;
- notas;
- tarefas;
- interações;
- timeline operacional;
- Decision Outputs relevantes;
- Executive Situation.

## Consumidores previstos
- DM-002 — Commercial Readiness;
- DM-003 — Follow-up Strategy;
- DM-004 — Opportunity Expansion;
- DM-005 — Relationship Risk;
- Executive Situation;
- futuros modelos comerciais.

## Não responsabilidades
Commercial Journey não deve:
- executar modelos;
- calcular score;
- alterar lead;
- criar tarefas;
- criar simulações;
- persistir novos artefatos;
- bloquear ferramentas;
- substituir Decision Context.

## Relação com Decision Context
Commercial Journey pode ser usada como base para montar Decision Contexts de modelos comerciais.

Ela organiza evidências.
O Decision Context adapta essas evidências para o modelo específico.

Fluxo:

Lead
→ Operational Artifacts
→ Commercial Journey
→ Decision Context
→ Decision Model

## Princípio
Commercial Journey é uma camada de organização do conhecimento operacional do Lead.

Ela existe para evitar que cada Decision Model reconstrua isoladamente a mesma história comercial.
