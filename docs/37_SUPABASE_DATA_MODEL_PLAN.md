# 37 — Supabase Data Model Plan

## 1. Visao Geral

O EVOLV utiliza `localStorage` nesta fase para validar rapidamente a experiencia, os fluxos comerciais e a arquitetura modular sem depender de autenticacao, banco de dados ou ambiente remoto.

Essa abordagem e adequada para prototipacao operacional local, mas a versao real de uso interno e multiusuario exigira persistencia centralizada, seguranca, permissoes, auditoria e isolamento por empresa e cliente. Para essa etapa futura, o Supabase devera ser a camada principal de dados.

Esta sprint nao implementa Supabase. O objetivo e apenas planejar o modelo de dados futuro para reduzir retrabalho quando a migracao for iniciada.

## 2. Entidades Principais

### organizations

Entidade raiz do sistema. Representa a empresa ou operacao que usa o EVOLV.

Exemplos futuros:

- Patrion;
- outras empresas;
- imobiliarias;
- consultores parceiros.

### users

Usuarios vinculados a uma organizacao. Representam donos, administradores, consultores, assistentes e visualizadores.

### clients

Clientes atendidos dentro de uma organizacao. Tudo que hoje e tratado como "cliente atual" devera virar um registro persistente em `clients`.

### client_profiles

Perfil patrimonial e comercial do cliente. Deve concentrar dados como perfil, patrimonio atual, metas, renda atual, meta de renda, prazo e observacoes.

### portfolios

Carteira consolidada do cliente. Pode funcionar como agregador logico para imoveis, cartas e outros ativos futuros.

### portfolio_properties

Imoveis cadastrados na carteira do cliente.

### consortium_cards

Cartas de consorcio cadastradas na carteira do cliente, contempladas ou nao contempladas.

### simulations

Simulacoes comerciais salvas, com parametros suficientes para reconstruir a simulacao e snapshots dos principais resultados.

### operations

Operacoes patrimoniais vinculadas ao cliente. Podem consumir dados de simulacao e representar o portfolio operacional do plano patrimonial.

### strategies

Estrategias patrimoniais cadastradas para o cliente, como estrategia patrimonial, renda passiva, acelerada ou conservadora.

### followup_events

Eventos de acompanhamento do cliente, como boleto, assembleia, lance, contemplacao ou evento personalizado.

### reports

Relatorios gerados, incluindo PDF da simulacao e futuro Dossie Patrimonial EVOLV.

### administrators

Administradoras de consorcio e seus parametros padrao por organizacao.

### notification_preferences

Preferencias futuras de notificacao por usuario, cliente, evento ou organizacao.

## 3. Relacoes

- `organization` has many `users`;
- `organization` has many `clients`;
- `organization` has many `administrators`;
- `client` has one `client_profile`;
- `client` has one or many `portfolios`;
- `client` has many `portfolio_properties`;
- `client` has many `consortium_cards`;
- `client` has many `operations`;
- `client` has many `simulations`;
- `client` has many `strategies`;
- `client` has many `followup_events`;
- `client` has many `reports`;
- `operation` belongs to `client`;
- `operation` may belong to `strategy`;
- `operation` may reference `administrator`;
- `simulation` belongs to `client`;
- `simulation` may generate `report`;
- `report` may belong to `simulation`;
- `report` may belong to `client`;
- `followup_event` belongs to `client`;
- `followup_event` may belong to `consortium_card`;
- `followup_event` may belong to `operation`;
- `notification_preferences` may belong to `user`, `client` or `organization`, depending on the future notification scope.

## 4. Mapeamento localStorage para Supabase

| Chave atual | Uso atual | Tabelas futuras sugeridas |
| --- | --- | --- |
| `evolv.client-context.v1` | Cliente atual e contexto patrimonial basico | `clients`, `client_profiles` |
| `evolv.portfolio.v1` | Imoveis e cartas da carteira local | `portfolios`, `portfolio_properties`, `consortium_cards` |
| `evolv.simulations.v1` | Simulacoes salvas e snapshots | `simulations`, `reports` |
| `evolv.operations.v1` | Operacoes patrimoniais por cliente | `operations`, `simulations`, `administrators` |
| `evolv.strategies.v1` | Estrategias patrimoniais | `strategies` |
| `evolv.followup.v1` | Eventos de acompanhamento | `followup_events`, `notification_preferences` |
| `evolv.administrators.v1` | Administradoras e parametros padrao | `administrators` |
| `evolv.wealth.evolution.v1` | Metas e parametros da jornada patrimonial | `client_profiles`, possivelmente `strategies` |

## 5. Separacao por Cliente

Tudo que hoje e "cliente atual" devera virar um registro em `clients`.

No futuro, o EVOLV devera permitir:

- listar clientes;
- abrir cliente;
- editar cliente;
- arquivar cliente;
- vincular simulacoes a cada cliente;
- vincular operacoes a cada cliente;
- vincular carteira patrimonial a cada cliente;
- vincular acompanhamento e eventos a cada cliente;
- gerar relatorios por cliente.

Essa separacao e essencial para transformar o EVOLV de uma ferramenta local em uma plataforma operacional consultiva.

## 6. Permissoes Futuras

Os papeis futuros planejados sao:

- `owner`: controle total da organizacao, usuarios, configuracoes e dados;
- `admin`: gestao operacional ampla, sem necessariamente controlar propriedade da conta;
- `consultant`: cria e edita clientes, simulacoes, operacoes, estrategias e acompanhamentos;
- `assistant`: apoia cadastros, follow-up e organizacao de dados, com permissoes limitadas;
- `viewer`: acesso somente leitura para acompanhamento, auditoria ou apresentacao.

Essas permissoes nao devem ser implementadas nesta sprint. Elas devem orientar o desenho futuro de RLS, politicas e camada de acesso.

## 7. Multiempresa Futuro

O EVOLV deve prever uso por mais de uma empresa.

A entidade `organizations` deve ser a raiz do modelo porque a plataforma podera atender:

- Patrion;
- outras empresas de consultoria patrimonial;
- imobiliarias;
- consultores parceiros;
- operacoes comerciais internas com marcas diferentes.

Todas as tabelas operacionais devem ter relacao direta ou indireta com `organization_id` para permitir isolamento de dados, permissoes e configuracoes por empresa.

## 8. Notificacoes Futuras

O modelo deve preparar a evolucao para notificacoes, sem implementar nesta fase.

Casos futuros:

- push notifications;
- WhatsApp;
- e-mail;
- lembrete de boleto;
- prazo de lance;
- assembleia;
- contemplacao;
- retorno comercial;
- tarefa operacional.

Possiveis elementos futuros:

- `notification_preferences`;
- `notification_templates`;
- `notification_deliveries`;
- campos de opt-in por usuario ou cliente;
- historico de tentativas;
- status de entrega;
- canal preferencial.

O modulo `followup` ja foi modelado para aceitar futuramente `pushEnabled`, `pushPermission` e `pushToken`, mas nenhum envio deve ser implementado agora.

## 9. Migracao Futura

### Fase 1: Criar schema Supabase

Criar tabelas, chaves estrangeiras, indices, enums e politicas iniciais de RLS.

### Fase 2: Criar camada repository

Criar uma camada de repositorio que abstraia `localStorage` e Supabase. A UI deve chamar repositorios, nao APIs de storage diretamente.

### Fase 3: Migrar Client Context

Migrar `evolv.client-context.v1` para `clients` e `client_profiles`. Essa deve ser a primeira migracao porque define o eixo de relacionamento das demais entidades.

### Fase 4: Migrar Portfolio e FollowUp

Migrar carteira e acompanhamento para tabelas vinculadas a `client_id`.

Tabelas principais:

- `portfolio_properties`;
- `consortium_cards`;
- `followup_events`;
- `notification_preferences`.

### Fase 5: Migrar Simulations e Operations

Migrar simulacoes, operacoes, administradoras aplicadas e snapshots de resultado.

Tabelas principais:

- `simulations`;
- `operations`;
- `administrators`;
- `reports`.

### Fase 6: Autenticacao e permissoes

Implementar login, organizacoes, usuarios, papeis e RLS com base em `organization_id` e no papel do usuario.

## 10. Nao Fazer Agora

Nesta sprint, nao fazer:

- nao criar banco;
- nao criar tabelas;
- nao migrar dados;
- nao criar login;
- nao criar autenticacao;
- nao reescrever storage atual;
- nao alterar funcionalidades existentes;
- nao alterar calculos;
- nao alterar UI;
- nao implementar notificacoes;
- nao implementar WhatsApp;
- nao implementar e-mail;
- nao implementar automacoes.

Este documento e apenas um plano arquitetural para orientar a migracao futura.
