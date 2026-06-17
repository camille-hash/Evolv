# Sprint 101B.10 — Risk Assessment

## Metodo

Classificacao:

- baixo
- medio
- alto
- critico

## CRM

- Risco: quebra de leitura/edicao de leads durante transicao de policies.
- Nivel: alto
- Motivo: `crm_leads` e o centro operacional do CRM.
- Mitigacao: migracao em fases, validacao paralela e convivio controlado antes da remocao do bridge.

## Auth

- Risco: identidade autenticada nao resolver corretamente a organizacao nas novas funcoes.
- Nivel: alto
- Motivo: o modelo final depende de `profiles` como fonte de contexto.
- Mitigacao: criar funcoes primeiro e validalas isoladamente antes de trocar policies.

## Recovery

- Risco: baixo impacto direto, mas possivel regressao indireta se as validacoes de acesso dependerem de profile/organizacao apos login.
- Nivel: medio
- Motivo: recovery depende de estabilidade do fluxo de autenticacao.
- Mitigacao: nao acoplar recovery a mudancas abruptas de policy; validar jornada completa.

## RLS

- Risco: policy incorreta bloquear usuarios legitimos ou permitir acesso cruzado.
- Nivel: critico
- Motivo: RLS mal configurado afeta seguranca e operacao ao mesmo tempo.
- Mitigacao: funcoes canonicas, rollout incremental, validacao real e rollback pronto.

## Multi-tenant

- Risco: ausencia de scoping real permitir vazamento entre organizacoes futuras.
- Nivel: critico
- Motivo: o estado atual ainda nao e multi-tenant hardenizado.
- Mitigacao: substituir `true` por organization-scoped antes de escalar a base.

## Dual Pipeline

- Risco: novas tabelas nascerem sobre um modelo organizacional ainda indefinido.
- Nivel: alto
- Motivo: isso propagaria inseguranca para `crm_stage_events` e `crm_green_flags`.
- Mitigacao: endurecer `crm_leads` e funcoes canonicas antes da execucao controlada do Dual Pipeline.

## Conclusao de risco

O maior risco atual nao e estruturalmente o dado, porque `crm_leads.organization_id` ja esta integro. O maior risco esta nas **policies permissivas** e na **ausencia de funcoes canonicas de contexto organizacional**.

Por isso, o endurecimento deve priorizar:

1. funcoes canonicas;
2. validacao paralela;
3. policies organization-scoped;
4. remocao controlada das bridge policies.
