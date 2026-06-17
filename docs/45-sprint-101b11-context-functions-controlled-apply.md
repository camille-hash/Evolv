# Sprint 101B.11 — Context Functions Controlled Apply

## Contexto

As evidencias reais consolidadas ate a Sprint 101B.10 indicam:

- `crm_leads` possui 763 registros;
- `crm_leads.organization_id` possui 0 nulos;
- `profiles` possui 2 registros;
- os 2 `profiles` sao `admin`;
- os 2 `profiles` pertencem a mesma `organization_id`;
- `crm_leads` esta com RLS habilitado;
- `profiles` esta com RLS habilitado;
- `crm_lead_notes` ja usa isolamento por organizacao baseado em `profiles`;
- `public.evolv_current_organization_id()` ainda nao existe;
- `public.evolv_current_role()` ainda nao existe;
- `crm_leads` ainda possui bridge policies permissivas com `qual = true` e `with_check = true`.

## Razao da sprint

O EVOLV precisa de funcoes canonicas de contexto organizacional antes de endurecer as policies de `crm_leads`.

Esta sprint prepara a criacao manual e supervisionada de:

- `public.evolv_current_organization_id()`
- `public.evolv_current_role()`

sem alterar nenhuma policy existente e sem alterar o comportamento atual do CRM.

## Escopo

Criar artefatos versionaveis:

- SQL de apply;
- SQL de validation;
- SQL de rollback;
- documentacao operacional.

## Nao escopo

Esta sprint nao:

- executa SQL pelo Codex;
- aplica migrations;
- altera policies;
- remove bridge policies;
- altera grants de tabelas;
- altera `crm_leads`;
- altera `profiles`;
- cria tabelas Dual Pipeline;
- altera CRM, Auth, Recovery, middleware, UI ou Vercel.

## Arquitetura das funcoes

### `public.evolv_current_organization_id()`

Responsabilidade:

- resolver a organizacao do usuario autenticado a partir de `auth.uid()`;
- consultar `public.profiles`;
- exigir `p.id = auth.uid()`;
- exigir `p.is_active = true`;
- retornar apenas `p.organization_id`.

Contrato:

- sem argumentos;
- retorno `uuid`;
- uso primario em RLS;
- sem exposicao de outros campos do profile.

### `public.evolv_current_role()`

Responsabilidade:

- resolver o role do usuario autenticado a partir de `auth.uid()`;
- consultar `public.profiles`;
- exigir `p.id = auth.uid()`;
- exigir `p.is_active = true`;
- retornar apenas `p.role`.

Contrato:

- sem argumentos;
- retorno `text`;
- uso futuro em RLS e regras administrativas;
- sem exposicao de outros campos do profile.

## Decisao tecnica proposta

Os SQLs desta sprint usam funcoes `SECURITY DEFINER` com `search_path` explicito.

Motivo:

- as funcoes serao usadas como base de policies RLS;
- `profiles` tambem possui RLS habilitado;
- o objetivo e ter um ponto canonico e confiavel para resolver contexto organizacional;
- a funcao retorna somente um valor escalar minimo, reduzindo exposicao.

Controle:

- revogar execucao de `public`;
- conceder execucao apenas a `authenticated`;
- nao conceder execucao a `anon`.

## Por que nao alterar bridge policies ainda

As bridge policies atuais ainda sustentam o funcionamento operacional do CRM durante a transicao.

Remover ou substituir essas policies antes de validar as funcoes criaria risco de:

- quebra de leitura de leads;
- quebra de update de leads;
- regressao no CRM;
- interrupcao operacional.

Por isso, esta sprint cria apenas o prerequisito tecnico. O hardening de `crm_leads` deve ocorrer em sprint posterior, apos validacao paralela.

## Ordem manual de execucao

Somente se a operadora autorizar fora do Codex:

1. confirmar backup e janela operacional;
2. executar manualmente `20260617_sprint101b11_context_functions_apply.sql`;
3. executar manualmente `20260617_sprint101b11_context_functions_validation.sql`;
4. registrar evidencia sanitizada;
5. validar CRM, Auth e Recovery;
6. manter bridge policies intactas.

## Criterios de sucesso

- as duas funcoes existem;
- ambas nao recebem argumentos;
- `evolv_current_organization_id()` retorna `uuid`;
- `evolv_current_role()` retorna `text`;
- grants estao limitados a `authenticated`;
- `anon` nao recebe permissao explicita;
- CRM continua funcionando;
- Auth continua funcionando;
- Recovery continua funcionando;
- nenhuma policy foi alterada.

## Criterios de abortar

Abortar a janela se:

- a criacao das funcoes falhar;
- grants ficarem mais amplos que o planejado;
- a validacao indicar retorno inesperado;
- CRM, Auth ou Recovery apresentarem regressao;
- houver qualquer duvida sobre ambiente ou operador.

## Criterios de rollback

Aplicar rollback se:

- as funcoes forem criadas incorretamente;
- a validacao falhar;
- o ambiente apresentar comportamento inesperado apos apply;
- houver necessidade de voltar ao estado anterior antes da proxima sprint.

## Confirmacao operacional

Ao final desta sprint documental, o CRM nao deve mudar. As funcoes so passarao a existir se uma execucao manual supervisionada for feita posteriormente pela operadora.
