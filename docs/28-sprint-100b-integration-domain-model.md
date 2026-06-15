# Sprint 100B - Integration Domain Model

## 1. Resumo Executivo

Esta sprint transforma a arquitetura definida na Sprint 100A em um modelo conceitual de dominio para as futuras integracoes do EVOLV.

Nada e implementado nesta etapa. O objetivo e reduzir risco antes de qualquer schema, migration, provider, SDK ou endpoint real.

A proposta organiza WhatsApp, Google Agenda/Meet e e-mail em um dominio proprio de integracoes, separado do CRM, do Dossie Executivo Vivo, das notas estruturadas e do pipeline. Essa separacao preserva a estabilidade da producao e permite que cada integracao futura seja criada em sprints pequenas, reversiveis e auditaveis.

## 2. Dependencia Da Sprint 100A

Documento base:

```text
docs/27-sprint-100a-integration-architecture-audit.md
```

Decisoes herdadas da Sprint 100A:

- server-side first;
- provider-agnostic design;
- `organization_id` como fronteira de ownership;
- eventos normalizados;
- timeline desacoplada da UI;
- observabilidade propria para integracoes;
- auditoria por usuario, lead e organizacao;
- rollback planejado antes de rollout;
- secrets e tokens sempre fora do client;
- UI apenas dispara intencao, nunca conversa direto com provider.

## 3. Glossario De Dominio

### Integration Provider

Provedor externo ou interno capaz de executar uma integracao. Exemplos: Meta Cloud API, Twilio, Z-API, Google Calendar, Gmail, SendGrid, Resend.

### Integration Account

Conta configurada para uma organizacao ou usuario. Pode representar uma conta WhatsApp, conta Google, dominio de e-mail ou credencial de provider.

### Integration Connection

Vinculo operacional entre uma conta do EVOLV e um provider, incluindo status, escopos, credenciais referenciadas e validade.

### Integration Event

Evento normalizado gerado por comando interno, webhook, sincronizacao ou resposta de provider.

### Integration Message

Mensagem enviada ou recebida por canal de comunicacao, como WhatsApp ou e-mail.

### Integration Calendar Event

Evento de agenda/reuniao criado, atualizado, cancelado ou sincronizado com provider externo.

### Integration Email

Registro conceitual de e-mail enviado, recebido, falho ou sincronizado.

### Integration Sync Log

Registro de uma tentativa de sincronizacao, webhook, retry ou job de integracao.

### Integration Error

Erro tecnico ou operacional normalizado, com contexto suficiente para suporte sem expor dados sensiveis desnecessarios.

### Lead Communication

Comunicacao comercial vinculada a um lead, independente do provider.

### Lead Timeline Event

Evento elegivel para aparecer no Dossie Executivo Vivo ou no historico completo do lead.

### External Thread

Conversa ou encadeamento externo do provider, como thread de e-mail, conversa WhatsApp ou evento recorrente de calendario.

### External Message ID

Identificador externo de uma mensagem/evento no provider.

### Correlation ID

Identificador interno para rastrear uma operacao ponta a ponta no EVOLV.

### Idempotency Key

Chave usada para evitar duplicidade em comandos, webhooks e retries.

### Provider Payload

Payload bruto recebido do provider. Pode conter dados sensiveis e nao deve ser exposto diretamente ao client.

### Normalized Payload

Representacao interna, limpa e padronizada do payload externo.

## 4. Entidades Conceituais Futuras

As entidades abaixo sao propostas documentais. Nenhuma tabela foi criada nesta sprint.

### `integration_providers`

- Objetivo: catalogar provedores suportados.
- Campos conceituais: `id`, `key`, `name`, `category`, `status`, `capabilities`, `created_at`.
- `organization_id`: nao obrigatorio se for catalogo global.
- `lead_id`: nao se aplica.
- User/profile: nao se aplica.
- Provider: representa o proprio provider.
- Riscos: catalogo global usado indevidamente para regras por tenant.
- Seguranca: nao armazenar secrets nesta entidade.

### `integration_accounts`

- Objetivo: representar uma conta configurada para uma organizacao.
- Campos conceituais: `id`, `organization_id`, `provider_id`, `display_name`, `status`, `owner_profile_id`, `metadata`.
- `organization_id`: obrigatorio.
- `lead_id`: nao se aplica.
- User/profile: pode ter responsavel ou proprietario.
- Provider: referencia `integration_providers`.
- Riscos: conta usada por organizacao errada.
- Seguranca: guardar apenas referencias a secrets, nunca segredo em claro.

### `integration_connections`

- Objetivo: representar conexao tecnica ativa/inativa com provider.
- Campos conceituais: `id`, `organization_id`, `account_id`, `connection_type`, `scopes`, `status`, `expires_at`, `last_checked_at`.
- `organization_id`: obrigatorio.
- `lead_id`: nao se aplica.
- User/profile: pode registrar quem autorizou.
- Provider: via account.
- Riscos: token expirado, escopo excessivo, desconexao silenciosa.
- Seguranca: tokens devem ficar server-side/secret storage.

### `integration_events`

- Objetivo: registrar eventos normalizados de integracao.
- Campos conceituais: `id`, `organization_id`, `provider`, `event_type`, `direction`, `lead_id`, `actor_profile_id`, `external_id`, `correlation_id`, `idempotency_key`, `occurred_at`, `normalized_payload`, `raw_payload_ref`, `timeline_eligible`.
- `organization_id`: obrigatorio.
- `lead_id`: opcional, mas obrigatorio quando evento for comercial do lead.
- User/profile: `actor_profile_id` quando houver acao humana.
- Provider: obrigatorio.
- Riscos: duplicidade e poluicao de timeline.
- Seguranca: payload normalizado deve minimizar dados sensiveis.

### `integration_messages`

- Objetivo: armazenar mensagens WhatsApp/e-mail normalizadas.
- Campos conceituais: `id`, `organization_id`, `lead_id`, `provider`, `channel`, `direction`, `external_message_id`, `external_thread_id`, `status`, `sent_at`, `received_at`, `summary`, `metadata`.
- `organization_id`: obrigatorio.
- `lead_id`: obrigatorio quando associada a lead.
- User/profile: remetente/responsavel quando enviado pelo EVOLV.
- Provider: obrigatorio.
- Riscos: armazenar conteudo sensivel em excesso.
- Seguranca: definir retencao e opt-out antes da implementacao.

### `integration_calendar_events`

- Objetivo: representar reunioes e eventos de calendario.
- Campos conceituais: `id`, `organization_id`, `lead_id`, `provider`, `external_event_id`, `title`, `starts_at`, `ends_at`, `status`, `meeting_url`, `created_by_profile_id`.
- `organization_id`: obrigatorio.
- `lead_id`: recomendado para eventos comerciais.
- User/profile: criador/responsavel.
- Provider: Google Calendar ou outro.
- Riscos: evento criado no calendario errado.
- Seguranca: tokens OAuth nunca no client.

### `integration_emails`

- Objetivo: representar e-mails comerciais enviados/recebidos.
- Campos conceituais: `id`, `organization_id`, `lead_id`, `provider`, `direction`, `external_message_id`, `subject`, `summary`, `status`, `sent_at`, `received_at`.
- `organization_id`: obrigatorio.
- `lead_id`: obrigatorio quando associado ao CRM.
- User/profile: remetente ou responsavel.
- Provider: Gmail, SMTP, SendGrid, Resend etc.
- Riscos: leitura indevida de caixa de entrada.
- Seguranca: evitar armazenar corpo completo sem necessidade.

### `integration_sync_logs`

- Objetivo: registrar jobs, webhooks, retries e sincronizacoes.
- Campos conceituais: `id`, `organization_id`, `provider`, `operation`, `status`, `started_at`, `finished_at`, `retry_count`, `correlation_id`, `summary`.
- `organization_id`: obrigatorio quando aplicavel.
- `lead_id`: opcional.
- User/profile: opcional.
- Provider: obrigatorio.
- Riscos: logs insuficientes para suporte.
- Seguranca: nao gravar secrets ou payload bruto completo.

### `integration_errors`

- Objetivo: registrar falhas normalizadas de provider/EVOLV.
- Campos conceituais: `id`, `organization_id`, `provider`, `operation`, `error_code`, `error_message`, `severity`, `correlation_id`, `occurred_at`, `resolved_at`.
- `organization_id`: obrigatorio quando aplicavel.
- `lead_id`: opcional.
- User/profile: opcional.
- Provider: obrigatorio quando erro vier de provider.
- Riscos: vazar dados sensiveis em mensagem de erro.
- Seguranca: sanitizar erro antes de exibir/logar.

### `lead_communications`

- Objetivo: visao comercial das comunicacoes vinculadas ao lead.
- Campos conceituais: `id`, `organization_id`, `lead_id`, `channel`, `direction`, `status`, `summary`, `integration_event_id`, `created_at`.
- `organization_id`: obrigatorio.
- `lead_id`: obrigatorio.
- User/profile: responsavel quando houver.
- Provider: indireto via evento.
- Riscos: duplicar mensagens/eventos.
- Seguranca: exibir apenas resumo seguro.

### `lead_timeline_events`

- Objetivo: representar eventos elegiveis para Dossie Executivo.
- Campos conceituais: `id`, `organization_id`, `lead_id`, `event_type`, `title`, `description`, `source`, `source_id`, `visibility`, `occurred_at`.
- `organization_id`: obrigatorio.
- `lead_id`: obrigatorio.
- User/profile: ator quando houver.
- Provider: indireto.
- Riscos: poluir historico completo.
- Seguranca: diferenciar eventos internos de eventos visiveis ao cliente.

## 5. Fronteiras De Responsabilidade

### UI

- Dispara intencoes.
- Exibe estados e historico autorizado.
- Nunca conversa direto com provider.
- Nunca carrega secret/token.
- Nunca decide autorizacao final.

### API Server-side

- Valida sessao.
- Resolve profile.
- Valida `organization_id`.
- Valida lead dentro da organizacao.
- Encaminha comando ao service layer.

### Integration Service Layer

- Orquestra regras de dominio.
- Cria correlation/idempotency keys.
- Decide se comando pode seguir.
- Aciona adapter e event log.

### Provider Adapter

- Conversa com provider externo.
- Traduz contrato interno para API externa.
- Nunca vaza payload bruto para UI.

### Normalizer

- Transforma payload externo em evento interno.
- Remove excesso sensivel.
- Garante formato padrao.

### Event Log

- Guarda evento normalizado.
- Garante idempotencia.
- Alimenta observabilidade e auditoria.

### Timeline Writer

- Decide o que entra no Dossie Executivo.
- Evita ruido tecnico.
- Mantem notas humanas separadas de eventos automaticos.

### Observability Logger

- Registra logs tecnicos, retries, erro, provider status e correlation IDs.

### Supabase Persistence Layer

- Persiste entidades futuras com `organization_id`.
- Respeita RLS futura.
- Nunca deve ser acessada diretamente pelo client para operacoes sensiveis.

## 6. Contratos Internos Futuros

Contratos conceituais em TypeScript, apenas documentais:

```ts
type IntegrationProvider = {
  id: string;
  key: "whatsapp" | "google_calendar" | "email";
  name: string;
  category: "messaging" | "calendar" | "email";
  status: "planned" | "active" | "disabled";
  capabilities: string[];
};

type IntegrationAccount = {
  id: string;
  organizationId: string;
  providerId: string;
  displayName: string;
  status: "active" | "disconnected" | "disabled";
  ownerProfileId?: string;
};

type IntegrationConnection = {
  id: string;
  organizationId: string;
  accountId: string;
  scopes: string[];
  status: "valid" | "expired" | "revoked";
  expiresAt?: string;
};

type IntegrationEvent = {
  id: string;
  organizationId: string;
  provider: string;
  eventType: string;
  direction: "inbound" | "outbound" | "internal";
  leadId?: string;
  actorProfileId?: string;
  occurredAt: string;
  correlationId: string;
  idempotencyKey: string;
  normalizedPayload: Record<string, unknown>;
  rawPayloadRef?: string;
  timelineEligible: boolean;
};

type IntegrationMessage = {
  id: string;
  organizationId: string;
  leadId: string;
  channel: "whatsapp" | "email";
  provider: string;
  direction: "inbound" | "outbound";
  externalMessageId?: string;
  externalThreadId?: string;
  status: "pending" | "sent" | "received" | "failed";
  summary: string;
};

type IntegrationCalendarEvent = {
  id: string;
  organizationId: string;
  leadId: string;
  provider: "google_calendar";
  externalEventId?: string;
  title: string;
  startsAt: string;
  endsAt: string;
  meetingUrl?: string;
  status: "created" | "updated" | "cancelled" | "completed";
};

type IntegrationEmail = {
  id: string;
  organizationId: string;
  leadId: string;
  provider: string;
  direction: "inbound" | "outbound";
  subject: string;
  summary: string;
  status: "draft" | "sent" | "received" | "failed";
};

type LeadCommunication = {
  id: string;
  organizationId: string;
  leadId: string;
  channel: "whatsapp" | "email" | "calendar";
  direction: "inbound" | "outbound" | "internal";
  summary: string;
  sourceEventId: string;
};

type LeadTimelineEvent = {
  id: string;
  organizationId: string;
  leadId: string;
  eventType: string;
  title: string;
  description: string;
  source: "integration" | "note" | "crm";
  sourceId: string;
  visibility: "internal";
  occurredAt: string;
};

type IntegrationSyncResult = {
  correlationId: string;
  status: "success" | "partial" | "failed";
  processed: number;
  skipped: number;
  errors: number;
};

type IntegrationErrorRecord = {
  id: string;
  organizationId?: string;
  provider: string;
  operation: string;
  errorCode?: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  correlationId: string;
};
```

## 7. Contrato De Comando

### `SendWhatsAppMessageCommand`

- Input conceitual: `organizationId`, `leadId`, `actorProfileId`, `message`, `providerAccountId`.
- Validacoes: sessao, profile ativo, lead da organizacao, opt-out, telefone seguro, provider ativo.
- Resultado esperado: mensagem enviada ou enfileirada, evento normalizado criado.
- Erros possiveis: provider indisponivel, telefone invalido, opt-out, limite excedido.
- Impacto na timeline: "WhatsApp enviado" se sucesso; erro tecnico fica em log.

### `CreateCalendarMeetingCommand`

- Input conceitual: `organizationId`, `leadId`, `actorProfileId`, `startsAt`, `endsAt`, `title`, `attendees`.
- Validacoes: lead da organizacao, conta Google valida, horario valido, escopo OAuth.
- Resultado esperado: evento criado e link Meet quando disponivel.
- Erros possiveis: token expirado, conflito de calendario, provider indisponivel.
- Impacto na timeline: "Reuniao criada" e "Meet gerado".

### `SendEmailCommand`

- Input conceitual: `organizationId`, `leadId`, `actorProfileId`, `to`, `subject`, `body`, `templateId`.
- Validacoes: lead da organizacao, e-mail valido, opt-out, template permitido.
- Resultado esperado: e-mail enviado ou enfileirado.
- Erros possiveis: bounce, provider recusou, opt-out, dominio nao verificado.
- Impacto na timeline: "E-mail enviado"; falha fica em log e pode gerar alerta.

### `RegisterInboundProviderEventCommand`

- Input conceitual: `provider`, `headers`, `rawPayload`, `receivedAt`.
- Validacoes: assinatura do webhook, provider conhecido, idempotency key, tenant resolvido.
- Resultado esperado: evento normalizado, comunicacao vinculada ao lead quando possivel.
- Erros possiveis: assinatura invalida, evento duplicado, lead nao encontrado.
- Impacto na timeline: apenas eventos comerciais relevantes entram.

### `SyncProviderEventsCommand`

- Input conceitual: `organizationId`, `providerAccountId`, `from`, `to`, `correlationId`.
- Validacoes: conta ativa, escopos validos, janela de sync segura.
- Resultado esperado: eventos sincronizados e log de sync.
- Erros possiveis: token expirado, rate limit, provider fora.
- Impacto na timeline: eventos comerciais novos entram; sync tecnico fica em logs.

## 8. Contrato De Evento Normalizado

Formato conceitual:

```ts
type NormalizedIntegrationEvent = {
  event_type: string;
  provider: string;
  direction: "inbound" | "outbound" | "internal";
  organization_id: string;
  lead_id?: string;
  actor_profile_id?: string;
  occurred_at: string;
  external_id?: string;
  correlation_id: string;
  idempotency_key: string;
  normalized_payload: Record<string, unknown>;
  raw_payload_ref?: string;
  visibility: "internal";
  timeline_eligible: boolean;
};
```

Tipos sugeridos:

- `whatsapp.message.sent`
- `whatsapp.message.received`
- `whatsapp.delivery.updated`
- `calendar.meeting.created`
- `calendar.meeting.updated`
- `calendar.meeting.cancelled`
- `calendar.meeting.completed`
- `email.sent`
- `email.received`
- `email.delivery.failed`
- `provider.sync.started`
- `provider.sync.completed`
- `provider.sync.failed`
- `provider.webhook.received`
- `provider.webhook.rejected`

## 9. Relacao Com Dossie Executivo Vivo

Devem entrar no dossie:

- comunicacoes enviadas/recebidas relevantes;
- reunioes criadas/canceladas/realizadas;
- e-mails enviados/recebidos;
- follow-ups comerciais;
- erros operacionais que exigem acao do consultor.

Devem ficar apenas em logs tecnicos:

- retries internos;
- webhooks duplicados;
- provider heartbeat;
- payload rejeitado por assinatura invalida;
- detalhes de token/refresh.

Para evitar poluir o historico completo:

- timeline deve receber apenas eventos `timeline_eligible`;
- agrupamentos podem ser usados futuramente;
- evento tecnico nao deve virar evento comercial automaticamente.

Notas humanas continuam como camada editorial separada. Uma nota explica contexto e intencao; um evento registra fato.

## 10. Relacao Com Notas Estruturadas

- Nota humana nao e evento tecnico.
- Evento de integracao nao deve virar nota automaticamente.
- Uma nota pode referenciar uma comunicacao.
- Uma comunicacao pode gerar sugestao futura de nota, mas nao deve criar curadoria sem acao humana.
- Autoria e intencao precisam ser preservadas.
- Se IA existir no futuro, deve sugerir, nunca escrever nota como humano sem revisao.

## 11. Ownership E Multi-tenant

Regras:

- `organization_id` obrigatorio em tudo.
- `lead_id` sempre validado dentro da organizacao.
- `profile_id` vem do usuario autenticado.
- Provider account pertence sempre a uma organizacao.
- Eventos nunca podem cruzar tenants.
- Service role, se usado em server-side, deve aplicar filtros explicitos por organizacao.

Riscos:

- RLS futura incompleta;
- webhook sem tenant resolvido;
- service role usado sem filtro;
- provider account compartilhada entre organizacoes;
- lead vinculado a evento de outra organizacao.

## 12. Observabilidade E Auditoria

Logs necessarios:

- logs de intencao;
- logs de provider;
- logs de webhook;
- logs de normalizacao;
- logs de timeline;
- logs de erro.

Campos conceituais:

- `correlation_id`;
- `idempotency_key`;
- `retry_count`;
- `provider_response_status`;
- `actor_profile_id`;
- `organization_id`;
- `lead_id`;
- `provider`;
- `operation`;
- `occurred_at`.

Objetivo:

- permitir suporte tecnico;
- reconstruir fluxo comercial;
- diferenciar erro de provider de erro do EVOLV;
- evitar expor dados sensiveis no console/browser.

## 13. Idempotencia E Retries

Webhooks podem duplicar porque provedores reenviam eventos quando nao recebem confirmacao.

Comandos podem ser reenviados por timeout, duplo clique, retry automatico ou falha parcial.

`idempotency_key` evita:

- mensagem duplicada;
- reuniao duplicada;
- evento repetido na timeline;
- sync repetindo dados.

`correlation_id` permite rastrear uma operacao completa:

```text
UI -> API -> service -> provider -> webhook -> event log -> timeline
```

Retries devem ser registrados em `integration_sync_logs` ou entidade equivalente, sem criar novos eventos comerciais duplicados.

## 14. Seguranca

### Tokens E Secrets

Nunca ficam no client. Devem ser server-side, com menor privilegio e rotacao planejada.

### OAuth E Refresh Tokens

Precisam de storage seguro, escopo minimo, revogacao e auditoria.

### Assinatura De Webhooks

Todo webhook deve validar assinatura antes de processar payload.

### Raw Payloads

Payload bruto pode conter dados pessoais. Decisao pendente: persistir inteiro, resumir ou referenciar armazenamento seguro.

### Dados Pessoais

Telefone, e-mail, mensagem e agenda sao dados pessoais. Exigem minimizacao, finalidade e controle de acesso.

### Consentimento E Opt-out

WhatsApp/e-mail devem respeitar consentimento, opt-out e regras do provider.

### Retencao

Definir por quanto tempo comunicacoes e payloads tecnicos ficam armazenados.

### Menor Privilegio

Usuarios e services devem acessar apenas o necessario para a operacao.

### Fronteiras Server-side

Secrets, provider calls, normalizacao, webhooks e autorizacao final ficam no servidor.

## 15. Decisoes Pendentes Antes De Schema

- Nomes finais das entidades.
- Quais entidades entram em migration inicial.
- Se timeline sera tabela propria, view ou materializacao.
- Se raw payload sera persistido inteiro ou apenas referenciado.
- Politica de retencao.
- Provider inicial.
- Estrategia de OAuth Google.
- Estrategia de opt-out WhatsApp/e-mail.
- Quem pode enviar comunicacoes.
- Quais eventos aparecem no dossie.
- Como Bruno validara a experiencia sem risco operacional.

## 16. Recomendacao Para Sprint 100C

Proxima sprint sugerida:

```text
Sprint 100C - Integration Schema Proposal
```

A Sprint 100C deve:

- transformar este modelo conceitual em proposta de schema Supabase;
- ainda nao executar SQL, salvo se explicitamente aprovado depois;
- propor migrations em arquivo separado apenas se autorizado;
- manter implementacao real bloqueada;
- revisar RLS, ownership, idempotencia e retencao antes de qualquer schema final.

## 17. Checklist De Validacao

- Apenas documentacao criada.
- Nenhum codigo alterado.
- Nenhum endpoint criado.
- Nenhuma migration criada.
- Nenhum SQL executado.
- Nenhum SDK instalado.
- Nenhuma variavel alterada.
- Nenhuma integracao implementada.
- Nenhum arquivo produtivo alterado.
- Diretorio proibido nao foi usado.

## Confirmacoes

- Esta sprint nao implementa integracoes.
- Esta sprint nao altera CRM, Auth, Shadow Runtime, Ownership, Observabilidade, notas ou simulador.
- Esta sprint cria apenas um documento de dominio para reduzir risco antes da Sprint 100C.
