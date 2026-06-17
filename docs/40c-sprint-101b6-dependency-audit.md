# Sprint 101B.6 - Dependency Audit

## Dependencias criticas

### 1. `crm_leads.organization_id`

Dependencia:

- base para isolamento por organizacao
- usada implicitamente pelo modelo de policies organization-scoped

Risco:

- nulos ou inconsistencias impedem certificacao de execucao

### 2. `profiles.organization_id`

Dependencia:

- coerencia entre identidade autenticada e tenant operacional

Risco:

- mismatch entre profile e lead pode invalidar policies novas

### 3. `public.evolv_current_organization_id()`

Dependencia:

- funcao base do scoping organization-scoped

Risco:

- se inexistente ou incorreta, policies novas ficam invalidas

### 4. `public.evolv_current_role()`

Dependencia:

- apoio ao modelo atual de autorizacao do projeto

Risco:

- se inexistente ou incorreta, pode comprometer consistencia com o padrao atual

### 5. RLS atual

Dependencia:

- o novo dominio precisa nascer aderente ao modelo de RLS ja existente

Risco:

- divergencia entre o estado real e o estado esperado nos docs/scripts

### 6. Policies atuais

Dependencia:

- o novo dominio nao pode conflitar com o CRM atual

Risco:

- policies legadas inconsistentes podem causar efeito colateral inesperado

### 7. Novas tabelas

Dependencias:

- `crm_stage_events`
- `crm_green_flags`

Risco:

- ainda nao existem no banco real
- dependem da aplicacao correta do schema 101B.2

### 8. Domain Wiring

Dependencia:

- camada criada na 101B.4 pressupoe o dominio futuro, mas esta corretamente isolada

Risco:

- baixo no estado atual, porque nao esta conectada

## Conclusao do dependency audit

As dependencias mais criticas para liberar a execucao nao estao no codigo local, e sim no **estado real atual do banco** e na **operacao manual supervisionada**.

Por isso:

- a cadeia documental esta madura;
- a cadeia de execucao ainda depende de evidencias de preflight e governanca operacional.
