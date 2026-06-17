# Sprint 101B.7 - RLS Audit

## Evidencia observada

### Funcoes organizacionais

Chamadas RPC read-only para:

- `public.evolv_current_organization_id()`
- `public.evolv_current_role()`

retornaram:

- `PGRST202`

### Novas tabelas Dual Pipeline

Consultas read-only para:

- `public.crm_stage_events`
- `public.crm_green_flags`

retornaram:

- `PGRST205`

## Leitura tecnica

### Sobre as funcoes

O ambiente atual nao comprovou, por este caminho publico, que:

- `public.evolv_current_organization_id()` esteja acessivel/exposta
- `public.evolv_current_role()` esteja acessivel/exposta

Como essas funcoes sao base das policies propostas na 101B.3, isso e uma lacuna real de evidência.

### Sobre as novas tabelas

O fato de `crm_stage_events` e `crm_green_flags` nao aparecerem no schema cache e coerente com:

- nenhum SQL Dual Pipeline executado ate o momento.

Isso nao e problema por si so; e esperado.

## O que nao foi possivel provar nesta sprint

Com o acesso disponivel nesta sprint, nao foi possivel inventariar completamente:

- tabelas com RLS
- policies existentes
- grants existentes

no nivel de catalogo do banco.

## Risco

Alto.

Motivo:

- as policies do novo dominio dependem de funcoes organizacionais;
- a existencia/validade operacional delas ainda nao foi provada com evidência runtime suficiente.

## Impacto

Bloqueia a certificacao positiva para execucao controlada.

## Recomendacao

Antes da execucao futura:

1. confirmar em modo read-only e com nivel de acesso adequado:
   - existencia das funcoes
   - definicao compatível
   - estado real de RLS/policies/grants
2. somente depois liberar a janela de apply.
