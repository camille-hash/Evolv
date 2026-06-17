# Sprint 101B.15 — Emergency Rollback Runbook

## Objetivo

Remover somente as duas policies organization-scoped criadas na futura execucao da Sprint 101B.15.

## Quando executar rollback

Executar rollback se:

- CRM ficar indisponivel;
- Auth ficar indisponivel;
- Lead Notes ficar indisponivel;
- Recovery apresentar regressao relevante;
- houver divergencia de contagem em `crm_leads`;
- houver erro de policy;
- houver erro de RLS;
- houver erro de organizacao;
- a operadora decidir abortar a janela.

## O que o rollback remove

Somente:

- `crm_leads authenticated read same organization`;
- `crm_leads authenticated update same organization`.

## O que o rollback nao altera

Rollback nao altera:

- bridge policies;
- policies anon existentes;
- `profiles`;
- Auth;
- Recovery;
- Lead Notes;
- dados;
- tabelas;
- funcoes organizacionais.

## Ordem do rollback

1. interromper a janela;
2. registrar erro observado;
3. executar manualmente `20260617_sprint101b15_rls_rollback.sql`;
4. executar manualmente `20260617_sprint101b15_rls_validation.sql`;
5. confirmar ausencia das duas policies novas;
6. confirmar bridge policies presentes;
7. executar smoke test minimo de CRM;
8. registrar evidencia sanitizada.

## Criterio de sucesso do rollback

Rollback bem-sucedido quando:

- policies novas removidas;
- bridge policies intactas;
- CRM volta a operar;
- Auth opera;
- Lead Notes opera;
- Recovery opera;
- contagem de `crm_leads` permanece consistente.
