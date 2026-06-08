# 41 — Supabase Schema Draft

## Visao Geral

Esta sprint cria o primeiro draft de schema Supabase do EVOLV sem conectar o aplicativo ao banco.

O app continua 100% baseado em `localStorage`. Nenhuma migration foi aplicada automaticamente, nenhuma tela foi alterada e nenhuma funcionalidade passou a depender de Supabase.

Arquivo SQL criado:

- `supabase/migrations/20260610_evolv_initial_schema.sql`

## Tabelas Criadas no Draft

O draft contempla as seguintes tabelas:

- `organizations`;
- `profiles`;
- `clients`;
- `client_profiles`;
- `portfolio_properties`;
- `consortium_cards`;
- `simulations`;
- `operations`;
- `strategies`;
- `followup_events`;
- `reports`;
- `administrators`;
- `notification_preferences`.

Todas as tabelas possuem `id uuid primary key`, `created_at` e `updated_at`.

As tabelas operacionais incluem `organization_id` quando pertencem a uma empresa e `client_id` quando pertencem ao contexto de um cliente.

## Relações Principais

O desenho segue o plano documentado em `docs/37_SUPABASE_DATA_MODEL_PLAN.md`.

Relações principais:

- `organizations` possui muitos `profiles`;
- `organizations` possui muitos `clients`;
- `organizations` possui muitas `administrators`;
- `clients` possui um `client_profiles`;
- `clients` possui muitos `portfolio_properties`;
- `clients` possui muitas `consortium_cards`;
- `clients` possui muitas `simulations`;
- `clients` possui muitas `operations`;
- `clients` possui muitas `strategies`;
- `clients` possui muitos `followup_events`;
- `clients` possui muitos `reports`;
- `operations` pode pertencer a uma `strategy`;
- `operations` pode referenciar uma `simulation`;
- `simulations` pode gerar `reports`;
- `followup_events` pode pertencer a uma `operation`;
- `followup_events` pode pertencer a uma `consortium_card`;
- `notification_preferences` pode pertencer a um `profile` ou `client`.

## Campos Principais

### organizations

Representa a empresa raiz do ambiente, como Patrion ou futuras empresas parceiras.

Campos principais:

- `name`;
- `legal_name`;
- `document_number`;
- `brand_name`;
- `status`.

### profiles

Representa usuarios do sistema em uma organizacao.

Campos principais:

- `organization_id`;
- `auth_user_id`;
- `name`;
- `email`;
- `phone`;
- `role`;
- `status`.

### clients e client_profiles

Substituem futuramente o conceito atual de cliente ativo local.

Campos principais:

- dados de contato em `clients`;
- perfil patrimonial, metas, renda e observacoes em `client_profiles`.

### portfolio_properties e consortium_cards

Modelam a carteira patrimonial do cliente.

Campos principais:

- imoveis com valor atual e renda mensal;
- cartas com administradora, credito e status de contemplacao.

### simulations e operations

Guardam parametros, snapshots e estado operacional das simulacoes e operacoes.

Campos principais:

- `form_state`;
- `commercial_data`;
- `selected_scenario_key`;
- `insurance_option`;
- `contemplation_month`;
- `bid_type`;
- `result_snapshot`;
- `simulation_state`;
- `snapshot`.

### followup_events

Modela eventos de acompanhamento como boleto, assembleia, lance, contemplacao ou personalizado.

Campos principais:

- `title`;
- `type`;
- `event_date`;
- `notes`;
- `completed`;
- `notification_settings`.

### reports

Prepara metadados para PDF da simulacao e Dossie EVOLV.

Campos principais:

- `type`;
- `title`;
- `file_path`;
- `metadata`.

### administrators

Modela administradoras e parametros comerciais por organizacao.

Campos principais:

- `name`;
- `administrative_fee_percent`;
- `reserve_fund_percent`;
- `term_months`;
- `monthly_insurance_percent`;
- `insurance_required`.

### notification_preferences

Prepara preferencias futuras de notificacao.

Campos principais:

- `push_enabled`;
- `push_permission`;
- `push_token`;
- `whatsapp_enabled`;
- `whatsapp_number`;
- `email_enabled`;
- `email_address`.

## Segurança e RLS Futura

O SQL inclui comentarios de preparacao para RLS futura, mas nao cria politicas complexas.

Plano futuro:

- habilitar RLS somente quando houver autenticacao;
- escopar dados por `organization_id`;
- usar `profiles.role` para permissoes;
- restringir service role a fluxos server-side;
- impedir acesso entre organizacoes.

Papeis planejados:

- `owner`;
- `admin`;
- `consultant`;
- `assistant`;
- `viewer`.

## O Que Ainda Nao Esta Conectado

Ainda nao esta conectado:

- app Next.js ao Supabase;
- autenticacao;
- repositories;
- leitura ou escrita no banco;
- upload de relatorios;
- notificacoes;
- RLS real;
- migracao de dados do `localStorage`.

O EVOLV continua usando as chaves locais atuais:

- `evolv.client-context.v1`;
- `evolv.portfolio.v1`;
- `evolv.simulations.v1`;
- `evolv.operations.v1`;
- `evolv.strategies.v1`;
- `evolv.followup.v1`;
- `evolv.administrators.v1`;
- `evolv.wealth.evolution.v1`.

## Próximas Fases

Fases recomendadas:

1. Revisar o schema draft antes de aplicar em qualquer ambiente.
2. Ajustar possiveis conflitos com migrations antigas de fundacao.
3. Criar camada repository mantendo `localStorage` como primeira fonte.
4. Criar ambiente Supabase de desenvolvimento.
5. Aplicar schema revisado manualmente.
6. Implementar autenticacao e RLS.
7. Migrar `Client Context`.
8. Migrar `Portfolio` e `FollowUp`.
9. Migrar `Simulations` e `Operations`.
10. Migrar relatorios e notificacoes futuras.

## Não Fazer Nesta Sprint

Nesta sprint, nao foi feito:

- conexao do app com Supabase;
- aplicacao automatica de migrations;
- criacao de login;
- alteracao de `localStorage`;
- alteracao de UI;
- alteracao de Dashboard;
- alteracao de Apresentacao;
- alteracao de Simulacoes;
- alteracao de calculos.
