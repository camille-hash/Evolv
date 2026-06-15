# Sprint 97.1.5 - Authenticated Bridge

## Objetivo

Preparar artefatos manuais e revisaveis para permitir, futuramente, acesso `authenticated` a `public.crm_leads` em paralelo ao acesso `anon` atual.

Esta sprint nao executa SQL, nao remove `anon`, nao altera frontend e nao modifica o comportamento operacional do EVOLV.

## Estado atual

O estado confirmado e:

- `public.crm_leads` contem 763 leads reais.
- `crm_leads` esta com RLS ativo.
- As policies anon atuais sustentam o CRM browser-side:
  - `Allow public read crm_leads`
  - `Allow public update crm_leads`
- Os grants anon atuais sustentam `SELECT` e `UPDATE`.
- `authenticated` ainda nao possui `SELECT`/`UPDATE` funcional em `crm_leads`.
- `public.organizations` existe.
- A organization `patrion-evolv` existe.
- `public.profiles` existe.
- Camille e Bruno existem como admins.
- O CRM atual usa browser, publishable key e `persistSession:false`.

## Por que anon nao sera removido

Anon nao pode ser removido agora porque o CRM em producao ainda depende dele para:

- listar leads;
- atualizar leads;
- manter fallback operacional do Bruno;
- preservar a operacao enquanto Auth/RLS por organizacao ainda nao esta pronto.

Remover anon antes do bridge autenticado validado teria risco critico de indisponibilidade do CRM.

## Objetivo do bridge authenticated

O bridge authenticated e uma ponte temporaria para permitir testes futuros de acesso autenticado sem desligar o caminho anon.

Ele nao e a RLS final por organizacao. Ele nao usa `organization_id`. Ele nao depende de backfill. Ele apenas cria permissao paralela e transitiva para o role `authenticated`, equivalente ao comportamento anon atual, mas restrita ao role autenticado.

## Artefatos criados

- Diagnostico:
  `supabase/sql/20260614_sprint97_1_5_authenticated_bridge_diagnostics.sql`

- Bridge manual:
  `supabase/sql/20260614_sprint97_1_5_authenticated_bridge.sql`

- Validacao:
  `supabase/sql/20260614_sprint97_1_5_authenticated_bridge_validation.sql`

- Rollback:
  `supabase/sql/20260614_sprint97_1_5_authenticated_bridge_rollback.sql`

## Ordem futura de execucao

1. Executar manualmente o diagnostico.
2. Confirmar total de leads igual a 763.
3. Confirmar RLS ativo e policies anon ainda presentes.
4. Confirmar ausencia ou insuficiencia de acesso authenticated atual.
5. Revisar o SQL bridge.
6. Executar manualmente o SQL bridge somente apos aprovacao humana.
7. Executar manualmente a validacao.
8. Testar acesso authenticated em ambiente controlado, sem desligar anon.
9. Se houver qualquer anomalia, executar rollback manual do bridge.

## Criterios de sucesso

- `authenticated` passa a ter `SELECT` e `UPDATE` em `public.crm_leads`.
- As policies authenticated temporarias existem.
- As policies anon continuam existindo.
- RLS permanece ativo e no mesmo estado.
- Total de leads permanece 763.
- Nenhum dado de `crm_leads` e alterado.
- Bruno nao percebe diferenca operacional.

## Criterios de abortar

Abortar antes de qualquer execucao se:

- `crm_leads_total` for diferente de 763;
- as policies anon esperadas nao existirem;
- RLS estiver em estado inesperado;
- profiles/admins nao estiverem consistentes;
- houver divergencia entre diagnostico e contexto confirmado;
- houver duvida sobre impacto operacional.

## Riscos

| Risco | Severidade | Controle |
| --- | --- | --- |
| Criar bridge permissivo demais e esquecer de remover | Alto | Documentar como transitorio e criar rollback dedicado. |
| Remover anon por engano | Critico | Nenhum SQL desta sprint remove policies/grants anon. |
| Confundir bridge com RLS final | Alto | Documento declara que `USING (true)` e temporario. |
| Executar sem validar total de leads | Alto | Diagnostico e validacao conferem total. |
| Alterar dados do CRM | Critico | SQL bridge nao contem `UPDATE`, `INSERT` ou `DELETE`. |

## Rollback

O rollback desfaz somente o bridge authenticated:

- remove as policies authenticated criadas nesta sprint;
- revoga `SELECT` de `authenticated`;
- revoga `UPDATE` de `authenticated`.

Rollback nao remove anon, nao altera dados, nao altera RLS e nao altera policies anon.

## Confirmacoes de escopo

- Nenhum SQL foi executado nesta sprint.
- Nenhuma migration foi criada.
- Nenhum codigo funcional foi alterado.
- Policies anon nao foram removidas nem alteradas.
- Grants anon nao foram removidos nem alterados.
- `crm_leads` nao teve dados ou colunas alterados.
- Frontend, repositories, login, middleware, `.env` e flags permanecem intactos.
