# Sprint 101B.14 — Rollback Strategy

## Objetivo

Definir rollback completo para uma futura execucao do hardening de `crm_leads`.

## Principio

Rollback deve devolver o ambiente ao estado operacional anterior sem alterar dados.

## Cenario A — Falha apos criar policies novas

Se a falha ocorrer antes de remover bridge policies:

- remover apenas as policies organization-scoped novas;
- manter bridge policies existentes;
- validar CRM/Auth/Recovery/Lead Notes.

Impacto esperado:

- baixo, pois as bridge policies ainda sustentam operacao.

## Cenario B — Falha apos remover policies anon

Se a falha ocorrer apos remover policies `anon`, mas antes de remover bridge authenticated:

- recriar temporariamente as policies anon removidas, se rollback operacional exigir;
- ou manter apenas authenticated se o CRM estiver funcional;
- validar fluxo real.

Decisao depende da falha observada.

## Cenario C — Falha apos remover bridge authenticated

Se a falha ocorrer apos remocao completa das bridges:

- recriar bridge authenticated temporaria;
- se necessario, recriar anon apenas como medida emergencial curta;
- manter evidence log da falha;
- abortar hardening ate diagnostico.

## Ordem geral de rollback

1. interromper a janela;
2. registrar erro observado;
3. restaurar policy minima necessaria para operacao;
4. validar login;
5. validar CRM;
6. validar Lead Notes;
7. validar Recovery;
8. registrar baseline pos-rollback.

## O que rollback nao deve alterar

Rollback nao deve:

- alterar dados;
- alterar `organization_id`;
- alterar `profiles`;
- alterar funcoes organizacionais;
- alterar Auth;
- alterar Recovery;
- alterar UI.

## Criterio de sucesso do rollback

Rollback e considerado bem-sucedido quando:

- CRM lista leads;
- CRM abre lead;
- CRM edita lead;
- Auth funciona;
- Recovery funciona;
- Lead Notes funciona;
- nenhuma perda de dado ocorreu.
