# Sprint 99B.0 - Fundacao das Notas Estruturadas

## Objetivo

Preparar a arquitetura visual e conceitual das notas estruturadas no Dossie Executivo do Lead, sem persistencia definitiva, sem banco de dados e sem migracao automatica de informacoes.

## Separacao Conceitual

O dossie passa a separar tres leituras:

- Contexto Estrategico: usa temporariamente o campo atual de observacoes como fonte visual.
- Ultimas Movimentacoes: usa dados existentes do lead para montar sinais recentes de leitura rapida.
- Historico de Notas: fica reservado para a expansao estruturada futura.

## Modelo Preparado

Foi criado o tipo `CrmStructuredNote`, com os campos conceituais aprovados:

- `content`
- `author`
- `timestamp`

Tambem foi adicionada a classificacao da nota por tipo:

- `strategic-context`
- `latest-movement`
- `history`

## Implementacao Temporaria

A funcao `buildTemporaryStructuredNotesFromLead` gera notas apenas em memoria, a partir dos dados ja existentes no lead.

Ela nao:

- grava dados;
- altera `crm_leads`;
- usa Supabase;
- usa localStorage;
- cria tabelas;
- migra observacoes.

## Componente Visual

O componente `CrmStructuredNotesList` renderiza listas de notas ou estado vazio discreto, permitindo reaproveitamento futuro quando houver persistencia real.

## Escopo Preservado

Foram preservados:

- campo atual de observacoes;
- fluxo de salvar lead;
- CTAs existentes;
- propostas ja exibidas no dossie;
- simulador;
- Shadow Runtime;
- Observabilidade;
- fallback do CRM.

## Proxima Evolucao

A Sprint 99B podera conectar uma origem persistente de notas estruturadas, desde que aprovada em sprint separada, com schema, seguranca, autoria e regras de permissao definidos antes da implementacao.

## Confirmacoes

- Nenhum SQL foi executado.
- Nenhuma migration foi criada.
- Nenhum dado foi alterado.
- Nenhuma policy foi alterada.
- Nenhum grant foi alterado.
- Nenhum RLS foi alterado.
- Nenhuma persistencia definitiva foi implementada.
- Nenhuma IA foi implementada.
