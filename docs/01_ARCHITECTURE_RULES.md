# 01_ARCHITECTURE_RULES.md

## Objetivo

Definir as regras arquiteturais do EVOLV para manter o projeto simples,
modular e preparado para expansao futura.

---

## Arquitetura

O EVOLV deve seguir uma abordagem de Modular Monolith.

Nesta fase, o sistema deve permanecer em uma unica aplicacao, com separacao
clara por modulos internos, evitando complexidade desnecessaria de microsservicos
ou integracoes externas prematuras.

---

## Modulos principais

### Core

Responsavel por conceitos estruturais do produto, como:

- empresas;
- usuarios;
- administradores;
- entidades compartilhadas.

### Simulator

Responsavel pelas regras de simulacao, calculos, apresentacao comercial,
persistencia local de simulacoes e preparacao de dados para relatorios.

As regras de negocio do Simulator devem permanecer dentro de `modules/simulator`.
Componentes visuais nao devem conter formulas.

### Reports

Responsavel por relatorios e geracao de PDF comercial.

O PDF deve consumir dados ja calculados e estruturados pelos modulos de dominio,
sem duplicar regras de calculo.

---

## Modulos futuros

Os modulos abaixo devem existir como direcoes arquiteturais, mas nao devem ser
implementados nesta fase:

- wealth;
- properties;
- concierge;
- intelligence.

Eles devem permanecer como placeholders ate que haja especificacao clara,
necessidade real e regras de negocio aprovadas.

---

## Regras de negocio

Regras de negocio devem ficar fora da UI.

Componentes React devem ser responsaveis por:

- renderizar estados;
- coletar entradas do usuario;
- chamar funcoes de dominio;
- acionar persistencia ou relatorios por meio de APIs internas.

Componentes React nao devem:

- conter formulas de calculo;
- duplicar regras de dominio;
- conhecer detalhes internos de persistencia;
- gerar estruturas tecnicas que pertencem aos modulos.

---

## Componentes reutilizaveis

Componentes de interface devem ser criados quando houver reutilizacao real ou
quando reduzirem complexidade da tela.

Evitar abstracoes prematuras.

Preferir componentes pequenos, claros e alinhados ao fluxo comercial do EVOLV.

---

## Fora do escopo desta fase

Nao implementar nesta fase:

- CRM;
- IA;
- portal do cliente;
- area logada complexa;
- integracoes externas;
- automacoes comerciais;
- multiplos clientes;
- workflows de atendimento.

Esses itens dependem de etapas futuras e especificacoes dedicadas.

---

## Principios

O projeto deve priorizar:

- simplicidade;
- modularidade;
- clareza de regras;
- baixo acoplamento entre UI e dominio;
- expansao futura sem reescrita;
- experiencia consultiva premium.

Toda nova funcionalidade deve respeitar a estrutura modular existente e evitar
complexidade antes da necessidade.
