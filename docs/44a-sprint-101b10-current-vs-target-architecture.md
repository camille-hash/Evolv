# Sprint 101B.10 — Current vs Target Architecture

## Visao geral

```text
ESTADO ATUAL
↓
ESTADO FUTURO
```

## `crm_leads`

### Estado atual

- tabela com `organization_id` preenchido
- RLS habilitado
- acesso ainda sustentado por policies publicas/bridge com `true`
- nao ha isolamento real por organizacao nas policies observadas

### Estado futuro

- tabela permanece com `organization_id` como ancora organizacional
- RLS continua habilitado
- policies passam a ser organization-scoped
- `SELECT` e `UPDATE` condicionados a `organization_id = evolv_current_organization_id()`
- fim das policies bridge permissivas

## `profiles`

### Estado atual

- 2 registros
- 2 admins
- mesma `organization_id`
- RLS habilitado
- fonte pratica do contexto organizacional

### Estado futuro

- continua sendo a fonte oficial do contexto organizacional
- continua sendo a fonte oficial de papel/role
- sustenta as funcoes canonicas
- permanece alinhado com Supabase Auth

## RLS

### Estado atual

- habilitado em `crm_leads`
- habilitado em `profiles`
- mas ainda sem endurecimento final em `crm_leads`

### Estado futuro

- RLS mantido
- escopo organizacional real em `crm_leads`
- extensao do mesmo modelo para `crm_stage_events` e `crm_green_flags`

## Policies

### Estado atual

`crm_leads`

- `Allow public read crm_leads`
- `Allow public update crm_leads`
- `Authenticated bridge read crm_leads`
- `Authenticated bridge update crm_leads`

Todas permissivas por `true`.

### Estado futuro

`crm_leads`

- policies apenas para `authenticated`
- sem leitura publica anon
- sem update publico anon
- `USING` baseado na organizacao atual
- `WITH CHECK` baseado na organizacao atual

## Funcoes organizacionais

### Estado atual

- `evolv_current_organization_id()` nao existe
- `evolv_current_role()` nao existe

### Estado futuro

- ambas existem como contrato canonico
- ambas leem `profiles`
- ambas sustentam policies do CRM e do Dual Pipeline
- ambas evitam duplicacao de logica de scoping

## Dual Pipeline

### Estado atual

- SQLs preparados
- sem execucao
- `crm_stage_events` inexistente no ambiente atual
- `crm_green_flags` inexistente no ambiente atual

### Estado futuro

- novas tabelas nascem ja com RLS organization-scoped
- policies usam funcoes canonicas
- sem herdar bridge permissivo
- coerencia total com `crm_leads` e `crm_lead_notes`

## Arquitetura alvo resumida

```text
Supabase Auth
↓
profiles
↓
evolv_current_organization_id()
evolv_current_role()
↓
RLS organization-scoped
↓
crm_leads
crm_lead_notes
crm_stage_events
crm_green_flags
```
