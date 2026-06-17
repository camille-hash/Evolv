# Sprint 101B.9 — Admin Read-Only Runbook

## Objetivo

Executar uma verificacao administrativa somente leitura para coletar evidencias que faltaram nas Sprints 101B.7 e 101B.8, sem alterar producao e sem persistir secrets no repositorio.

## Pre-requisitos

- operador autorizado com acesso administrativo temporario;
- ambiente correto identificado;
- checklist de segredos lido:
  - [43a-sprint-101b9-secret-handling-checklist.md](C:\Projetos\Evolv-Auth\docs\43a-sprint-101b9-secret-handling-checklist.md)
- template de evidencia aberto:
  - [43b-sprint-101b9-admin-evidence-template.md](C:\Projetos\Evolv-Auth\docs\43b-sprint-101b9-admin-evidence-template.md)

## Onde executar manualmente

Opcoes aceitaveis:

1. Supabase SQL Editor, em ambiente correto, apenas com os scripts read-only desta sprint.
2. Outro caminho administrativo read-only fora do repositorio, desde que:
   - nao persista credencial no projeto;
   - nao gere log publico com secrets;
   - permita copiar apenas resultados sanitizados.

## Como evitar vazar secrets

1. nao colar key em arquivo do repo;
2. nao criar `.env.local`;
3. nao enviar secret para ferramentas conversacionais;
4. nao salvar output bruto contendo credencial;
5. trabalhar apenas em sessao temporaria;
6. encerrar a sessao ao final;
7. registrar apenas os resultados necessarios.

## Ordem de execucao

### Passo 1

Executar:

- [20260617_sprint101b9_admin_readonly_verification.sql](C:\Projetos\Evolv-Auth\supabase\sql\20260617_sprint101b9_admin_readonly_verification.sql)

Objetivo:

- validar `crm_leads`
- validar `profiles`
- validar funcoes organizacionais
- validar existencia das tabelas Dual Pipeline

### Passo 2

Executar:

- [20260617_sprint101b9_rls_policy_grants_inventory.sql](C:\Projetos\Evolv-Auth\supabase\sql\20260617_sprint101b9_rls_policy_grants_inventory.sql)

Objetivo:

- inventariar RLS
- inventariar policies
- inventariar grants
- confirmar metadados das rotinas organizacionais

## Como copiar apenas evidencias sanitizadas

Registrar no template apenas:

- totais
- nulos
- distribuicoes agregadas
- nomes de tabelas
- nomes de policies
- estado de RLS
- grants resumidos
- conclusoes

Nao copiar:

- secrets
- tokens
- cabeçalhos
- connection strings
- outputs desnecessariamente sensiveis

## Como decidir se a proxima sprint pode ser Go / No-Go review

Pode avancar para nova sprint de revisao se houver evidencia suficiente para responder:

- `profiles` esta consistente?
- as funcoes organizacionais existem?
- RLS atual esta mapeado?
- policies atuais estao mapeadas?
- grants atuais estao mapeados?
- existe algum conflito tecnico evidente com a execucao controlada?

Se qualquer uma dessas respostas continuar inconclusiva, a proxima sprint ainda deve permanecer em **NO-GO**.

## Confirmacao desta sprint

Este runbook nao executa alteracao.

Ele apenas padroniza a coleta manual, temporaria e sanitizada de evidencia administrativa read-only.
