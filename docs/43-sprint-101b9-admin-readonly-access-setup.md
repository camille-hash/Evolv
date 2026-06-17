# Sprint 101B.9 — Admin Read-Only Access Setup

## Objetivo

Preparar um procedimento seguro para coleta de evidencias administrativas read-only no ambiente real, sem persistir credenciais privilegiadas no repositorio e sem executar qualquer alteracao em producao.

## Por que a Sprint 101B.8 terminou em NOT READY

A Sprint 101B.8 conseguiu validar apenas o caminho publico configurado no checkout. Isso foi suficiente para confirmar:

- `crm_leads = 763`
- `organization_id nulo = 0`
- ausencia observavel de `crm_stage_events`
- ausencia observavel de `crm_green_flags`

Mas nao foi suficiente para comprovar, de forma administrativa e conclusiva:

- quantidade real de registros em `profiles`
- consistencia de `profiles.organization_id`
- distribuicao de `profiles.role`
- existencia real de `public.evolv_current_organization_id()`
- existencia real de `public.evolv_current_role()`
- inventario completo de RLS
- inventario completo de policies
- inventario completo de grants

Sem esse bloco de evidencia privilegiada, a certificacao permaneceu em **NOT READY FOR CONTROLLED EXECUTION**.

## Qual evidencia ainda falta

Esta sprint prepara a coleta segura dos seguintes pontos:

1. `profiles`
   - contagem total
   - `organization_id` nulo
   - distribuicao por `organization_id`
   - distribuicao por `role`
   - consistencia geral

2. Funcoes organizacionais
   - existencia real de `public.evolv_current_organization_id()`
   - existencia real de `public.evolv_current_role()`
   - assinatura
   - linguagem
   - definicao visivel para auditoria

3. RLS / policies / grants
   - tabelas com RLS ativo
   - tabelas sem RLS
   - policies por tabela
   - roles afetados
   - grants para `anon`, `authenticated` e `service_role`

4. Tabelas Dual Pipeline
   - existencia ou nao de `crm_stage_events`
   - existencia ou nao de `crm_green_flags`

## Qual acesso e necessario

E necessario um acesso administrativo **temporario e somente leitura**, capaz de:

- abrir o Supabase SQL Editor; ou
- executar consultas read-only via conexao administrativa segura fora do repositorio.

Esse acesso nao deve ser salvo em:

- `.env`
- `.env.local`
- arquivos markdown
- scripts do repositorio
- historico de comandos compartilhado

## Como usar credencial administrativa temporaria sem salvar no repositorio

Procedimento recomendado:

1. o operador autorizado obtém a credencial por canal seguro fora do repositorio;
2. a credencial e usada apenas durante a sessao manual de auditoria;
3. nenhuma credencial e colada em arquivo local do projeto;
4. nenhuma credencial e enviada ao Codex ou ao ChatGPT;
5. apenas os resultados sanitizados sao registrados nos templates desta sprint;
6. ao final, a sessao e encerrada e os artefatos temporarios sao descartados.

## Como coletar evidencia

Arquivos desta sprint:

- [43a-sprint-101b9-secret-handling-checklist.md](C:\Projetos\Evolv-Auth\docs\43a-sprint-101b9-secret-handling-checklist.md)
- [43b-sprint-101b9-admin-evidence-template.md](C:\Projetos\Evolv-Auth\docs\43b-sprint-101b9-admin-evidence-template.md)
- [20260617_sprint101b9_admin_readonly_verification.sql](C:\Projetos\Evolv-Auth\supabase\sql\20260617_sprint101b9_admin_readonly_verification.sql)
- [20260617_sprint101b9_rls_policy_grants_inventory.sql](C:\Projetos\Evolv-Auth\supabase\sql\20260617_sprint101b9_rls_policy_grants_inventory.sql)
- [20260617_sprint101b9_admin_readonly_runbook.md](C:\Projetos\Evolv-Auth\supabase\sql\20260617_sprint101b9_admin_readonly_runbook.md)

Fluxo recomendado:

1. ler o checklist de segredos;
2. abrir o runbook;
3. executar primeiro o SQL de verificacao administrativa geral;
4. executar depois o SQL de inventario de RLS/policies/grants;
5. copiar apenas os resultados necessarios e sanitizados para o template de evidencia;
6. encerrar a sessao administrativa;
7. usar a evidencia coletada para uma futura sprint de Go/No-Go review.

## Como sanitizar a evidencia antes de registrar

Registrar apenas:

- contagens
- distribuicoes agregadas
- nomes de tabelas
- nomes de policies
- estados de RLS
- existencia/ausencia de funcoes
- conclusoes tecnicas

Nao registrar:

- secrets
- tokens
- connection strings
- headers
- chaves de API
- queries com valores sensiveis desnecessarios
- dados pessoais completos, quando um agregado bastar

## Como decidir GO / NO-GO depois da coleta

Depois da coleta administrativa, a proxima revisao deve responder:

### GO

Se houver evidencia real e consistente de que:

- `profiles` existe e esta consistente com organizacao e role;
- funcoes organizacionais existem e estao definidas;
- RLS/policies/grants atuais sao compreendidos;
- nao ha conflito material com a futura execucao controlada.

### NO-GO

Se houver qualquer um destes cenarios:

- `profiles` inconsistente ou incompleto;
- funcoes ausentes;
- RLS/policies/grants desconhecidos ou conflitantes;
- dependencia operacional nao mapeada;
- risco de execucao sem rollback confiavel.

## Confirmacao desta sprint

Esta sprint:

- nao executa alteracao;
- nao executa migration;
- nao altera producao;
- nao persiste secrets;
- nao altera codigo existente;
- apenas prepara governanca e verificacao administrativa read-only.
