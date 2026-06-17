# Sprint 101B.11 — Rollback Plan

## Objetivo

Definir como remover apenas as funcoes organizacionais criadas na Sprint 101B.11, sem tocar em tabelas, policies, dados ou grants de tabelas.

## Quando aplicar rollback

Aplicar rollback se:

- o apply for executado manualmente e criar funcao incorreta;
- a validation falhar;
- grants das funcoes ficarem fora do planejado;
- houver comportamento inesperado em Auth, CRM, Recovery ou Lead Notes;
- a operadora decidir cancelar a janela antes da proxima etapa.

## O que o rollback remove

Somente:

- `public.evolv_current_organization_id()`
- `public.evolv_current_role()`

## O que o rollback nao altera

O rollback nao altera:

- `crm_leads`;
- `profiles`;
- `crm_lead_notes`;
- policies;
- RLS;
- grants de tabelas;
- dados;
- Auth;
- Recovery;
- CRM;
- Vercel;
- `.env`.

## Ordem do rollback

1. confirmar que o ambiente correto esta selecionado;
2. executar manualmente `20260617_sprint101b11_context_functions_rollback.sql`;
3. executar manualmente `20260617_sprint101b11_context_functions_validation.sql`;
4. confirmar que as funcoes nao existem mais;
5. validar CRM, Auth e Recovery;
6. registrar evidencia sanitizada.

## Validacao pos-rollback

Confirmar:

- funcoes ausentes;
- `crm_leads` ainda acessivel;
- `profiles` sem alteracao de dados;
- policies existentes intactas;
- bridge policies intactas;
- CRM operacional;
- Auth operacional;
- Recovery operacional.

## Impacto esperado

Como nenhuma policy desta sprint depende das funcoes novas, o rollback esperado e de baixo impacto operacional.

Se uma sprint futura passar a depender dessas funcoes em RLS, este rollback devera ser reavaliado antes de uso.
