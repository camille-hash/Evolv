# Sprint 100C - Integration Schema Proposal

## 1. Resumo Executivo

Esta sprint transforma o modelo de dominio da Sprint 100B em uma proposta conceitual de schema Supabase para futuras integracoes do EVOLV.

Nenhum SQL foi criado ou executado. Nenhuma migration real foi criada. Esta proposta serve apenas para revisao tecnica antes de qualquer implementacao real.

O objetivo e definir, em markdown, tabelas futuras, colunas, indices, constraints, RLS conceitual, riscos e ordem segura de migrations, mantendo a producao estavel.

## 2. Dependencias Documentais

Documentos base:

- `docs/27-sprint-100a-integration-architecture-audit.md`
- `docs/28-sprint-100b-integration-domain-model.md`

A Sprint 100C herda:

- server-side first;
- provider-agnostic design;
- `organization_id` como fronteira de ownership;
- timeline desacoplada;
- eventos normalizados;
- auditoria por profile/usuario;
- idempotencia;
- correlation IDs;
- observabilidade;
- rollback planejado.

## 3. Principios Do Schema

- `organization_id` obrigatorio em toda tabela tenant-scoped.
- Server-side first: client nao escreve direto em provedores nem em estruturas sensiveis.
- Provider-agnostic: evitar tabelas amarradas a um unico provider.
- Timeline desacoplada: eventos tecnicos nao entram automaticamente no dossie.
- Raw payload controlado: evitar dados sensiveis desnecessarios.
- Auditoria por `profile`: registrar quem iniciou a acao.
- Idempotencia: comandos e webhooks devem resistir a repeticao.
- `correlation_id`: rastrear operacoes ponta a ponta.
- RLS futura obrigatoria antes de exposicao ampla.
- Menor privilegio.
- Nenhuma secret no client.

## 4. Tabelas Propostas

As tabelas abaixo sao propostas conceituais. Nenhuma tabela foi criada nesta sprint.

## 5. Campos Obrigatorios Por Padrao

Padrao recomendado para tabelas multi-tenant:

| Campo | Tipo sugerido | Uso |
| --- | --- | --- |
| `id` | `uuid` | Identificador primario. |
| `organization_id` | `uuid` | Isolamento por tenant. |
| `created_at` | `timestamptz` | Auditoria de criacao. |
| `updated_at` | `timestamptz` | Auditoria de atualizacao. |
| `created_by_profile_id` | `uuid` | Profile que iniciou/criou, quando aplicavel. |
| `updated_by_profile_id` | `uuid` | Profile que atualizou, quando aplicavel. |
| `deleted_at` | `timestamptz` | Soft delete quando o registro tiver valor historico. |
| `metadata` | `jsonb` | Extensoes controladas e dados nao estruturais. |

`deleted_at` deve ser usado em entidades operacionais com valor historico ou auditoria, como mensagens, comunicacoes, eventos de timeline e contas. Pode nao ser necessario em logs tecnicos append-only, como sync logs, se a politica for imutabilidade.

## 6. Entidade: `integration_providers`

Objetivo: catalogar provedores suportados pelo EVOLV.

| Coluna | Tipo sugerido | Obrigatorio | Relacao/observacao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | PK. |
| `provider_key` | `text` | Sim | Ex.: `meta_whatsapp`, `twilio`, `google_calendar`, `smtp`. |
| `display_name` | `text` | Sim | Nome legivel. |
| `category` | `text` | Sim | `whatsapp`, `calendar`, `email`. |
| `status` | `text` | Sim | `planned`, `active`, `disabled`. |
| `supports_webhooks` | `boolean` | Sim | Capacidade. |
| `supports_oauth` | `boolean` | Sim | Capacidade. |
| `supports_outbound` | `boolean` | Sim | Capacidade. |
| `supports_inbound` | `boolean` | Sim | Capacidade. |
| `metadata` | `jsonb` | Nao | Configuracoes nao sensiveis. |
| `created_at` | `timestamptz` | Sim | Auditoria. |
| `updated_at` | `timestamptz` | Sim | Auditoria. |

Indices sugeridos:

- `provider_key` unique.
- `category`.
- `status`.

Constraints sugeridas:

- `category in ('whatsapp', 'calendar', 'email')`.
- `status in ('planned', 'active', 'disabled')`.

RLS:

- Pode ser catalogo global de leitura controlada.
- Escrita restrita a admin tecnico/server-side.

Riscos:

- Salvar secrets em `metadata`. Proibir expressamente.

## 7. Entidade: `integration_accounts`

Objetivo: representar contas configuradas por organizacao.

| Coluna | Tipo sugerido | Obrigatorio | Relacao/observacao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | PK. |
| `organization_id` | `uuid` | Sim | FK `organizations`. |
| `provider_id` | `uuid` | Sim | FK `integration_providers`. |
| `account_label` | `text` | Sim | Nome interno. |
| `external_account_id` | `text` | Nao | ID no provider. |
| `status` | `text` | Sim | `active`, `disconnected`, `disabled`, `error`. |
| `auth_type` | `text` | Sim | `oauth`, `api_key`, `smtp`, `manual`. |
| `connected_by_profile_id` | `uuid` | Nao | FK `profiles`. |
| `connected_at` | `timestamptz` | Nao | Quando conectou. |
| `disconnected_at` | `timestamptz` | Nao | Quando desconectou. |
| `token_ref` | `text` | Nao | Referencia segura, nunca token puro. |
| `token_expires_at` | `timestamptz` | Nao | Expiracao. |
| `scopes` | `text[]` | Nao | Escopos OAuth/permissoes. |
| `metadata` | `jsonb` | Nao | Dados nao sensiveis. |
| `created_at` | `timestamptz` | Sim | Auditoria. |
| `updated_at` | `timestamptz` | Sim | Auditoria. |

Indices:

- `organization_id`.
- `provider_id`.
- `(organization_id, provider_id, external_account_id)`.
- `status`.

Constraints:

- `status in ('active', 'disconnected', 'disabled', 'error')`.
- `auth_type in ('oauth', 'api_key', 'smtp', 'manual')`.

RLS:

- Usuarios veem contas da propria organizacao.
- Campos sensiveis como `token_ref` devem ser retornados apenas server-side/admin.

Riscos:

- `token_ref` mal usado como token real.
- Conta ativa sem provider valido.

## 8. Entidade: `integration_connections`

Objetivo: detalhar conexoes tecnicas de uma conta.

| Coluna | Tipo sugerido | Obrigatorio | Relacao/observacao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | PK. |
| `organization_id` | `uuid` | Sim | FK `organizations`. |
| `provider_id` | `uuid` | Sim | FK provider. |
| `integration_account_id` | `uuid` | Sim | FK account. |
| `connection_type` | `text` | Sim | `whatsapp_sender`, `calendar`, `email_sender`, `webhook`. |
| `status` | `text` | Sim | `active`, `inactive`, `error`, `expired`. |
| `default_from_address` | `text` | Nao | E-mail padrao. |
| `default_phone_number` | `text` | Nao | Numero WhatsApp. |
| `calendar_id` | `text` | Nao | Calendario externo. |
| `webhook_status` | `text` | Nao | Estado do webhook. |
| `last_verified_at` | `timestamptz` | Nao | Ultima checagem. |
| `metadata` | `jsonb` | Nao | Nao sensivel. |
| `created_at` | `timestamptz` | Sim | Auditoria. |
| `updated_at` | `timestamptz` | Sim | Auditoria. |

Indices:

- `organization_id`.
- `provider_id`.
- `integration_account_id`.
- `status`.

Constraints:

- `status in ('active', 'inactive', 'error', 'expired')`.
- `connection_type` controlado por check.

RLS:

- Escopo por `organization_id`.
- Escrita via server-side.

Riscos:

- Conexao default incorreta enviar comunicacao por canal errado.

## 9. Entidade: `integration_events`

Objetivo: registrar eventos tecnicos/comerciais normalizados.

| Coluna | Tipo sugerido | Obrigatorio | Relacao/observacao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | PK. |
| `organization_id` | `uuid` | Sim | FK `organizations`. |
| `provider_id` | `uuid` | Nao | FK provider. |
| `integration_account_id` | `uuid` | Nao | FK account. |
| `lead_id` | `uuid` | Nao | FK `crm_leads`. |
| `actor_profile_id` | `uuid` | Nao | FK `profiles`. |
| `event_type` | `text` | Sim | Evento normalizado. |
| `direction` | `text` | Sim | `inbound`, `outbound`, `internal`. |
| `occurred_at` | `timestamptz` | Sim | Quando aconteceu. |
| `external_event_id` | `text` | Nao | ID do provider. |
| `external_thread_id` | `text` | Nao | Thread/conversa externa. |
| `correlation_id` | `text` | Sim | Rastreio ponta a ponta. |
| `idempotency_key` | `text` | Sim | Dedupe. |
| `normalized_payload` | `jsonb` | Sim | Payload interno minimizado. |
| `raw_payload_ref` | `text` | Nao | Referencia segura ao raw. |
| `visibility` | `text` | Sim | `internal`, talvez futuro `admin_only`. |
| `timeline_eligible` | `boolean` | Sim | Pode entrar no dossie. |
| `processed_at` | `timestamptz` | Nao | Processamento. |
| `processing_status` | `text` | Sim | `pending`, `processed`, `failed`, `ignored`. |
| `metadata` | `jsonb` | Nao | Extensao controlada. |
| `created_at` | `timestamptz` | Sim | Auditoria. |

Indices:

- `organization_id`.
- `lead_id`.
- `provider_id`.
- `integration_account_id`.
- `event_type`.
- `occurred_at desc`.
- `correlation_id`.
- `idempotency_key` unique quando aplicavel.
- `external_event_id`.
- `processing_status`.
- `timeline_eligible`.

Constraints:

- `direction in ('inbound', 'outbound', 'internal')`.
- `processing_status in ('pending', 'processed', 'failed', 'ignored')`.
- `visibility in ('internal', 'admin_only')`.

RLS:

- Leitura por organizacao.
- Logs tecnicos completos podem ser admin-only.

Riscos:

- Payload normalizado ainda conter dado sensivel.
- Eventos duplicados sem idempotencia.

## 10. Entidade: `integration_messages`

Objetivo: registrar mensagens WhatsApp/e-mail normalizadas.

| Coluna | Tipo sugerido | Obrigatorio | Relacao/observacao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | PK. |
| `organization_id` | `uuid` | Sim | FK organization. |
| `provider_id` | `uuid` | Nao | FK provider. |
| `integration_account_id` | `uuid` | Nao | FK account. |
| `lead_id` | `uuid` | Nao | FK lead. |
| `event_id` | `uuid` | Nao | FK event. |
| `channel` | `text` | Sim | `whatsapp`, `email`. |
| `direction` | `text` | Sim | `inbound`, `outbound`. |
| `status` | `text` | Sim | `pending`, `sent`, `received`, `delivered`, `read`, `failed`. |
| `sender_label` | `text` | Nao | Display seguro. |
| `sender_external_id` | `text` | Nao | ID provider. |
| `recipient_label` | `text` | Nao | Display seguro. |
| `recipient_external_id` | `text` | Nao | ID provider. |
| `subject` | `text` | Nao | Para e-mail. |
| `body_preview` | `text` | Nao | Resumo curto. |
| `body_ref` | `text` | Nao | Referencia a corpo seguro. |
| `external_message_id` | `text` | Nao | ID provider. |
| `external_thread_id` | `text` | Nao | Thread provider. |
| `sent_at` | `timestamptz` | Nao | Envio. |
| `received_at` | `timestamptz` | Nao | Recebimento. |
| `delivered_at` | `timestamptz` | Nao | Entrega. |
| `read_at` | `timestamptz` | Nao | Leitura. |
| `failed_at` | `timestamptz` | Nao | Falha. |
| `metadata` | `jsonb` | Nao | Nao sensivel. |
| `created_at` | `timestamptz` | Sim | Auditoria. |

Indices:

- `organization_id`.
- `lead_id`.
- `event_id`.
- `external_message_id`.
- `external_thread_id`.
- `(organization_id, channel, status)`.

Constraints:

- Checks para `channel`, `direction`, `status`.
- Unique por `(organization_id, provider_id, external_message_id)` quando existir.

RLS:

- Leitura por organizacao.
- Corpo completo nao deve ser exposto via tabela principal.

Riscos:

- Armazenar conteudo completo sem politica de retencao.

## 11. Entidade: `integration_calendar_events`

Objetivo: representar reunioes/eventos externos de calendario.

| Coluna | Tipo sugerido | Obrigatorio | Relacao/observacao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | PK. |
| `organization_id` | `uuid` | Sim | FK organization. |
| `provider_id` | `uuid` | Nao | FK provider. |
| `integration_account_id` | `uuid` | Nao | FK account. |
| `lead_id` | `uuid` | Nao | FK lead. |
| `event_id` | `uuid` | Nao | FK integration event. |
| `title` | `text` | Sim | Titulo interno. |
| `description_preview` | `text` | Nao | Resumo seguro. |
| `external_calendar_id` | `text` | Nao | ID calendario. |
| `external_event_id` | `text` | Nao | ID evento provider. |
| `meeting_url` | `text` | Nao | Meet/link. |
| `starts_at` | `timestamptz` | Sim | Inicio. |
| `ends_at` | `timestamptz` | Sim | Fim. |
| `timezone` | `text` | Nao | Timezone. |
| `status` | `text` | Sim | `created`, `updated`, `cancelled`, `completed`, `failed`. |
| `attendees` | `jsonb` | Nao | Participantes minimizados. |
| `created_by_profile_id` | `uuid` | Nao | FK profile. |
| `metadata` | `jsonb` | Nao | Extensao. |
| `created_at` | `timestamptz` | Sim | Auditoria. |
| `updated_at` | `timestamptz` | Sim | Auditoria. |
| `cancelled_at` | `timestamptz` | Nao | Cancelamento. |

Indices:

- `organization_id`.
- `lead_id`.
- `starts_at`.
- `external_event_id`.
- `status`.

Constraints:

- `ends_at > starts_at`.
- Check de status.
- Unique por `(organization_id, provider_id, external_event_id)`.

RLS:

- Leitura por organizacao.
- Escrita via server-side.

Riscos:

- URL de reuniao exposta indevidamente.

## 12. Entidade: `integration_emails`

Objetivo: representar e-mails comerciais normalizados.

| Coluna | Tipo sugerido | Obrigatorio | Relacao/observacao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | PK. |
| `organization_id` | `uuid` | Sim | FK organization. |
| `provider_id` | `uuid` | Nao | FK provider. |
| `integration_account_id` | `uuid` | Nao | FK account. |
| `lead_id` | `uuid` | Nao | FK lead. |
| `message_id` | `uuid` | Nao | FK `integration_messages`. |
| `event_id` | `uuid` | Nao | FK event. |
| `direction` | `text` | Sim | `inbound`, `outbound`. |
| `status` | `text` | Sim | `draft`, `sent`, `received`, `failed`, `bounced`. |
| `from_address` | `text` | Nao | Remetente. |
| `to_addresses` | `text[]` | Nao | Destinatarios. |
| `cc_addresses` | `text[]` | Nao | CC. |
| `bcc_addresses` | `text[]` | Nao | BCC, cuidado com exposicao. |
| `subject` | `text` | Nao | Assunto. |
| `body_preview` | `text` | Nao | Resumo. |
| `body_ref` | `text` | Nao | Corpo seguro externo/ref. |
| `external_message_id` | `text` | Nao | ID provider. |
| `external_thread_id` | `text` | Nao | Thread. |
| `sent_at` | `timestamptz` | Nao | Envio. |
| `received_at` | `timestamptz` | Nao | Recebimento. |
| `failed_at` | `timestamptz` | Nao | Falha. |
| `metadata` | `jsonb` | Nao | Extensao. |
| `created_at` | `timestamptz` | Sim | Auditoria. |

Indices:

- `organization_id`.
- `lead_id`.
- `message_id`.
- `external_message_id`.
- `external_thread_id`.
- `status`.

Constraints:

- Checks de direction/status.
- Unique por `(organization_id, provider_id, external_message_id)` quando existir.

RLS:

- Leitura por organizacao.
- Conteudo completo fora da tabela principal.

Riscos:

- Dados pessoais em destinatarios e corpo.

## 13. Entidade: `integration_sync_logs`

Objetivo: registrar sincronizacoes, webhooks e jobs.

| Coluna | Tipo sugerido | Obrigatorio | Relacao/observacao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | PK. |
| `organization_id` | `uuid` | Nao | Pode ser null para evento global tecnico. |
| `provider_id` | `uuid` | Nao | FK provider. |
| `integration_account_id` | `uuid` | Nao | FK account. |
| `sync_type` | `text` | Sim | `webhook`, `polling`, `manual`, `retry`. |
| `status` | `text` | Sim | `started`, `completed`, `failed`, `partial`. |
| `started_at` | `timestamptz` | Sim | Inicio. |
| `finished_at` | `timestamptz` | Nao | Fim. |
| `records_seen` | `integer` | Nao | Contagem. |
| `records_created` | `integer` | Nao | Contagem. |
| `records_updated` | `integer` | Nao | Contagem. |
| `records_failed` | `integer` | Nao | Contagem. |
| `cursor_before` | `text` | Nao | Cursor. |
| `cursor_after` | `text` | Nao | Cursor. |
| `correlation_id` | `text` | Sim | Rastreio. |
| `error_summary` | `text` | Nao | Resumo seguro. |
| `metadata` | `jsonb` | Nao | Extensao. |
| `created_at` | `timestamptz` | Sim | Auditoria. |

Indices:

- `organization_id`.
- `provider_id`.
- `integration_account_id`.
- `sync_type`.
- `status`.
- `correlation_id`.
- `started_at desc`.

Constraints:

- Checks de sync_type/status.
- Contagens >= 0.

RLS:

- Logs tecnicos podem ser admin-only.

Riscos:

- Logs com payload sensivel em `metadata`.

## 14. Entidade: `integration_errors`

Objetivo: registrar erros tecnicos e operacionais.

| Coluna | Tipo sugerido | Obrigatorio | Relacao/observacao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | PK. |
| `organization_id` | `uuid` | Nao | FK organization quando aplicavel. |
| `provider_id` | `uuid` | Nao | FK provider. |
| `integration_account_id` | `uuid` | Nao | FK account. |
| `event_id` | `uuid` | Nao | FK event. |
| `sync_log_id` | `uuid` | Nao | FK sync log. |
| `error_type` | `text` | Sim | `provider`, `validation`, `auth`, `rate_limit`, `unknown`. |
| `error_code` | `text` | Nao | Codigo interno/provider. |
| `error_message` | `text` | Sim | Sanitizado. |
| `provider_status_code` | `integer` | Nao | HTTP/provider. |
| `retryable` | `boolean` | Sim | Pode tentar de novo. |
| `retry_count` | `integer` | Sim | Tentativas. |
| `next_retry_at` | `timestamptz` | Nao | Proximo retry. |
| `resolved_at` | `timestamptz` | Nao | Resolucao. |
| `correlation_id` | `text` | Sim | Rastreio. |
| `metadata` | `jsonb` | Nao | Seguro/minimizado. |
| `created_at` | `timestamptz` | Sim | Auditoria. |

Indices:

- `organization_id`.
- `provider_id`.
- `event_id`.
- `sync_log_id`.
- `error_type`.
- `retryable`.
- `next_retry_at`.
- `correlation_id`.

Constraints:

- `retry_count >= 0`.
- Checks de `error_type`.

RLS:

- Admin/support only inicialmente.

Riscos:

- Mensagem de erro vazar payload.

## 15. Entidade: `lead_communications`

Objetivo: camada comercial de comunicacoes por lead.

| Coluna | Tipo sugerido | Obrigatorio | Relacao/observacao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | PK. |
| `organization_id` | `uuid` | Sim | FK organization. |
| `lead_id` | `uuid` | Sim | FK `crm_leads`. |
| `provider_id` | `uuid` | Nao | FK provider. |
| `integration_account_id` | `uuid` | Nao | FK account. |
| `communication_type` | `text` | Sim | `message`, `meeting`, `email`, `follow_up`. |
| `channel` | `text` | Sim | `whatsapp`, `email`, `calendar`, `internal`. |
| `direction` | `text` | Sim | `inbound`, `outbound`, `internal`. |
| `status` | `text` | Sim | `pending`, `completed`, `failed`, `cancelled`. |
| `title` | `text` | Sim | Titulo para UI. |
| `summary` | `text` | Nao | Resumo seguro. |
| `occurred_at` | `timestamptz` | Sim | Quando aconteceu. |
| `actor_profile_id` | `uuid` | Nao | FK profile. |
| `source_event_id` | `uuid` | Nao | FK event. |
| `source_message_id` | `uuid` | Nao | FK message. |
| `source_calendar_event_id` | `uuid` | Nao | FK calendar event. |
| `source_email_id` | `uuid` | Nao | FK email. |
| `visibility` | `text` | Sim | `internal`, `admin_only`. |
| `metadata` | `jsonb` | Nao | Extensao. |
| `created_at` | `timestamptz` | Sim | Auditoria. |

Indices:

- `organization_id`.
- `lead_id`.
- `occurred_at desc`.
- `channel`.
- `status`.
- `source_event_id`.

Constraints:

- Checks de communication_type/channel/direction/status/visibility.

RLS:

- Leitura por organizacao.
- Dados sensiveis devem ficar fora do summary.

Riscos:

- Duplicar comunicacoes se nao houver source unique.

## 16. Entidade: `lead_timeline_events`

Objetivo: camada normalizada para o Dossie Executivo Vivo.

| Coluna | Tipo sugerido | Obrigatorio | Relacao/observacao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | PK. |
| `organization_id` | `uuid` | Sim | FK organization. |
| `lead_id` | `uuid` | Sim | FK lead. |
| `event_source` | `text` | Sim | `integration`, `note`, `crm`, `system`. |
| `event_type` | `text` | Sim | Tipo normalizado. |
| `title` | `text` | Sim | Titulo UI. |
| `description` | `text` | Nao | Texto curto. |
| `occurred_at` | `timestamptz` | Sim | Ordenacao. |
| `actor_profile_id` | `uuid` | Nao | FK profile. |
| `source_table` | `text` | Nao | Origem. |
| `source_id` | `uuid` | Nao | ID origem. |
| `visibility` | `text` | Sim | `internal`, `admin_only`. |
| `priority` | `text` | Nao | `low`, `normal`, `high`. |
| `metadata` | `jsonb` | Nao | Extensao segura. |
| `created_at` | `timestamptz` | Sim | Auditoria. |

Indices:

- `organization_id`.
- `lead_id`.
- `occurred_at desc`.
- `event_source`.
- `event_type`.
- `(source_table, source_id)`.

Constraints:

- Checks de source/visibility/priority.
- Unique opcional por `(organization_id, source_table, source_id)` quando origem for unica.

RLS:

- Mais permissiva que logs tecnicos, mas sempre por organizacao.

Riscos:

- Poluir dossie com eventos tecnicos.

## 17. Relacoes E Cardinalidade

- Provider -> accounts: 1:N.
- Account -> connections: 1:N.
- Account -> events: 1:N.
- Event -> messages/calendar/emails: 1:0..N, dependendo do tipo.
- Lead -> communications: 1:N.
- Lead -> timeline events: 1:N.
- Sync logs -> errors: 1:N.
- Events -> errors: 1:N.
- Organization -> todas as entidades tenant-scoped: 1:N.
- Profile -> acoes/auditoria: 1:N.

## 18. Indices Sugeridos

Indices conceituais recorrentes:

- `organization_id`.
- `lead_id`.
- `provider_id`.
- `integration_account_id`.
- `event_type`.
- `occurred_at desc`.
- `correlation_id`.
- `idempotency_key`.
- `external_event_id`.
- `external_message_id`.
- `processing_status`.
- `timeline_eligible`.

Recomendacao:

- criar indices compostos por `organization_id` + campo de consulta frequente;
- usar unique parcial para external IDs quando nao forem nulos;
- evitar indices em JSONB antes de conhecer consultas reais.

## 19. Constraints Sugeridas

- Unique por `organization_id + provider + external IDs`.
- Unique por `idempotency_key` quando aplicavel.
- Checks de `direction`.
- Checks de `status`.
- Checks de `category`.
- Checks de `visibility`.
- FKs com `organization_id` quando aplicavel.
- Cuidado com FK rigida em payload externo instavel.

Observacao:

Nem todo identificador externo deve virar FK rigida. Provider pode enviar dados fora de ordem; eventos devem tolerar chegada parcial.

## 20. RLS Futura

Politicas conceituais:

- usuarios so veem registros da propria `organization_id`;
- service role escreve eventos de provider com validacao server-side;
- usuarios nao acessam raw payload sensivel;
- timeline pode ser mais permissiva que logs tecnicos;
- erros tecnicos podem ficar restritos a admin;
- tokens/secrets nunca expostos;
- inserts/updates do client devem ser proibidos para tabelas sensiveis;
- operacoes de provider devem passar por API server-side.

## 21. Raw Payload Strategy

Opcoes:

### Armazenar `raw_payload` em JSONB

Vantagem: debug completo.

Risco: maior exposicao LGPD e vazamento de dados sensiveis.

### Armazenar `raw_payload_ref`

Vantagem: tabela principal fica limpa; payload pode ir para storage controlado.

Risco: exige politica de storage e retencao.

### Armazenar payload redigido

Vantagem: equilibrio entre suporte e privacidade.

Risco: pode faltar informacao para debug profundo.

### Nao armazenar raw payload

Vantagem: minimo risco.

Risco: baixa capacidade de auditoria/debug.

Recomendacao para MVP:

- `normalized_payload` em `integration_events`;
- `raw_payload_ref` ou payload redigido;
- evitar dados sensiveis desnecessarios;
- definir retencao antes de armazenar qualquer corpo completo.

## 22. Timeline Strategy

- `lead_timeline_events` deve ser camada normalizada para dossie.
- `integration_events` deve ser fonte tecnica.
- `lead_communications` deve ser camada comercial.
- Notas humanas continuam separadas.
- Nem todo evento tecnico entra no dossie.
- Timeline deve priorizar decisao comercial, nao debug.

## 23. Rollback Conceitual

Uma migration futura deveria ser reversivel assim:

1. Criar tabelas sem ativar UI.
2. Nao alterar tabelas criticas no primeiro passo.
3. Nao migrar dados existentes automaticamente.
4. Ativar uso via feature flag futura.
5. Rollback inicial por desligamento de feature.
6. Drop de tabelas apenas antes de dados reais ou apos backup.
7. Nunca remover provider/contas/eventos sem plano de exportacao.

## 24. Ordem Recomendada De Migration Futura

Sem criar migration nesta sprint, a ordem sugerida e:

1. providers
2. accounts
3. connections
4. events
5. sync_logs
6. errors
7. messages
8. calendar_events
9. emails
10. lead_communications
11. lead_timeline_events
12. indexes
13. RLS
14. seed providers

## 25. Decisoes Pendentes Antes De Executar SQL

- Nomes finais das tabelas.
- Uso de JSONB.
- Retencao de payloads.
- Provider inicial.
- Escopo do MVP.
- RLS detalhada.
- Feature flags.
- Permissoes por perfil.
- Estrategia de `token_ref`.
- Se `lead_timeline_events` sera tabela, view ou materialized view.
- Ambiente de teste dos providers.
- Politica de opt-out.
- Politica de auditoria e suporte.

## 26. Recomendacao Final

Preferencia atual:

```text
Sprint 100D - Integration Event Log Proposal
```

Recomendacao: manter 100D documental.

Alternativa: `Supabase Migration Draft`, se e somente se Camille autorizar criar arquivo SQL sem executar.

## 27. Checklist De Validacao

- Apenas markdown criado.
- Nenhum SQL criado.
- Nenhuma migration criada.
- Nenhuma execucao no banco.
- Nenhum codigo alterado.
- Nenhum endpoint criado.
- Nenhuma variavel alterada.
- Nenhum SDK instalado.
- Nenhuma integracao implementada.
- Nenhum arquivo produtivo alterado.
- Diretorio proibido nao usado.

## Confirmacoes

- Esta sprint e apenas documental.
- Esta sprint nao implementa schema real.
- Esta sprint nao altera CRM, Auth, Shadow Runtime, Ownership, Observabilidade, notas ou simulador.
