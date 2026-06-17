# Sprint 101B.10 — Organization Context Hardening Plan

## Resumo executivo

As evidencias reais coletadas nas Sprints 101B.7, 101B.8 e 101B.9 mostram que o EVOLV ja possui a base minima para endurecimento organizacional:

- `crm_leads` com `organization_id` integro em 763 registros;
- `profiles` com 2 registros, ambos `admin`, na mesma organizacao;
- RLS habilitado em `crm_leads` e `profiles`;
- `crm_lead_notes` ja operando com isolamento por organizacao baseado em `profiles`.

Ao mesmo tempo, o estado atual ainda e transitorio e inseguro para multi-tenant real:

- `public.evolv_current_organization_id()` nao existe;
- `public.evolv_current_role()` nao existe;
- `crm_leads` ainda depende de policies bridge/publicas com `qual = true` e `with_check = true`;
- `authenticated bridge` tambem continua permissivo demais;
- o escopo organizacional ainda nao e canonicamente centralizado em funcoes reutilizaveis.

Conclusao arquitetural: o proximo endurecimento deve padronizar o contexto organizacional em funcoes canonicas e migrar `crm_leads` para policies organization-scoped, mantendo compatibilidade operacional com CRM, Auth e Recovery durante a transicao.

## Diagnostico do estado atual

### `crm_leads`

- 763 registros
- `organization_id` integro
- 0 nulos
- pronto para scoping organizacional real

### `profiles`

- 2 registros
- ambos `admin`
- mesma `organization_id`
- base suficiente para inferencia organizacional controlada

### Funcoes organizacionais

- `evolv_current_organization_id()` inexistente
- `evolv_current_role()` inexistente

Impacto:

- policies futuras ainda nao possuem helper canonico para contexto organizacional;
- logica de scoping fica repetitiva, mais fragil e mais dificil de auditar.

### RLS atual

- `crm_leads`: enabled
- `profiles`: enabled

### Policies reais encontradas em `crm_leads`

- `Allow public read crm_leads`
- `Allow public update crm_leads`
- `Authenticated bridge read crm_leads`
- `Authenticated bridge update crm_leads`

Todas baseadas em:

- `qual = true`
- `with_check = true`

Impacto:

- policies atuais nao isolam por organizacao;
- ainda preservam comportamento legado/bridge;
- nao sao adequadas como estado final para hardening organizacional.

## Limitacoes encontradas

1. O CRM ainda precisa continuar funcionando sem interrupcao durante a migracao.
2. O login, recovery e fluxo comercial nao podem sofrer degradacao.
3. O estado atual depende de convivio controlado entre policies legadas e futuras.
4. O endurecimento de `crm_leads` precisa permanecer alinhado ao padrao ja validado em `crm_lead_notes`.

## Arquitetura alvo proposta

### Principio central

Toda autorizacao organizacional futura deve convergir para duas funcoes canonicas em `public`:

- `evolv_current_organization_id()`
- `evolv_current_role()`

Essas funcoes passam a ser o contrato oficial para:

- policies RLS em `crm_leads`;
- policies das futuras tabelas `crm_stage_events`;
- policies das futuras tabelas `crm_green_flags`;
- demais entidades organizacionais do CRM.

### Papel de cada funcao

#### `evolv_current_organization_id()`

Responsabilidade:

- resolver a `organization_id` do usuario autenticado a partir de `profiles`.

Uso esperado:

- `USING` e `WITH CHECK` em policies organization-scoped;
- comparacao com `crm_leads.organization_id`;
- comparacao com ownership de tabelas futuras.

#### `evolv_current_role()`

Responsabilidade:

- resolver o `role` efetivo do usuario autenticado a partir de `profiles`.

Uso esperado:

- refinamentos futuros entre `admin`, `sdr` e outros papeis;
- delete restrito;
- operacoes administrativas do CRM;
- regras futuras do Dual Pipeline.

### Estado final desejado para `crm_leads`

Policies finais devem:

- remover dependencia de `qual = true`;
- remover dependencia de `with_check = true` irrestrito;
- restringir `SELECT` a usuarios autenticados da mesma organizacao;
- restringir `UPDATE` a usuarios autenticados da mesma organizacao;
- manter `anon` fora do modelo final;
- preservar caminho de leitura/escrita necessario ao CRM com escopo correto.

### Preparacao para Dual Pipeline

O Dual Pipeline deve nascer ja alinhado a esse modelo:

- `crm_stage_events` organization-scoped;
- `crm_green_flags` organization-scoped;
- reaproveitamento das funcoes canonicas;
- sem repetir bridge policies permissivas.

## Dependencias

1. `profiles` precisa continuar consistente como fonte de verdade organizacional.
2. Supabase Auth precisa continuar entregando identidade valida.
3. `crm_lead_notes` permanece como referencia de isolamento ja existente.
4. `crm_leads.organization_id` precisa continuar integro.

## Riscos

### Operacionais

- quebra do CRM se a substituicao das policies ocorrer cedo demais;
- perda de acesso em runtime se as funcoes forem criadas mas nao validadas;
- conflito entre bridge antigo e scoping novo, se a ordem for invertida.

### Arquiteturais

- duplicacao de logica de organizacao se funcoes canonicas nao forem adotadas como unico contrato;
- divergencia entre `crm_leads` e `crm_lead_notes` se os modelos de isolamento ficarem diferentes.

## Estrategia de rollout

1. criar funcoes canonicas primeiro;
2. validar funcoes em paralelo, sem trocar policies ainda;
3. criar policies novas organization-scoped;
4. manter convivio controlado durante janela curta de validacao;
5. remover bridge policies apenas apos confirmacao operacional;
6. usar esse mesmo padrao como base do Dual Pipeline.

## Conclusao

O endurecimento definitivo do EVOLV deve se apoiar em:

- contexto organizacional canonico por funcao;
- policies organization-scoped;
- transicao gradual e observavel;
- reaproveitamento do padrao ja comprovado em `crm_lead_notes`;
- preparacao explicita para as futuras tabelas do Dual Pipeline.
