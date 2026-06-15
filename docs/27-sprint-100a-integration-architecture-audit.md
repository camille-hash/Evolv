# Sprint 100A - Integration Architecture Audit

## 1. Resumo Executivo

As futuras integracoes do EVOLV com WhatsApp, Google Agenda/Meet e e-mail devem ser tratadas como uma camada arquitetural separada, e nao como codigo acoplado diretamente ao Dossie Executivo, notas ou pipeline.

Motivos:

- integracoes envolvem credenciais, tokens, webhooks, retries, auditoria e falhas externas;
- provedores mudam comportamento, limites e precos;
- mensagens, eventos e reunioes precisam ser rastreaveis por lead, usuario e organizacao;
- o CRM operacional deve continuar estavel mesmo se um provider externo falhar;
- a UI deve apenas acionar fluxos controlados, nunca carregar secrets ou regras criticas.

O desenho recomendado e:

```text
UI do EVOLV
-> camada server-side EVOLV
-> servicos de integracao
-> providers externos
-> logs/eventos
-> timeline/dossie
```

Essa separacao preserva a estabilidade da producao porque permite implementar cada integracao em sprints pequenas, reversiveis, com logs, rollback e validacao antes de aparecer para Bruno.

## 2. Estado Atual Relevante

### CRM

O CRM operacional esta em producao, com pipeline, dossie do lead, cards operacionais e fluxo comercial ja estabilizado.

### Supabase

Supabase ja esta ativo para dados compartilhados do CRM e para fundacoes recentes de Auth/Profile/Ownership. Qualquer integracao futura deve respeitar o modelo multi-tenant e evitar acesso direto inseguro pelo browser.

### Ownership

O modelo oficial usa `organizations` e `organization_id`. Integracoes futuras devem ser sempre organization-aware.

### Observabilidade

O EVOLV ja possui observabilidade operacional do caminho do CRM. Integracoes devem adicionar observabilidade propria sem misturar logs tecnicos com dados sensiveis de clientes.

### Dossie Executivo Vivo

O Dossie Executivo Vivo e o ponto natural de leitura dos eventos comerciais, mas nao deve ser responsavel por executar integracoes externas.

### Notas Estruturadas

Notas estruturadas persistentes ja existem e podem servir como memoria comercial, mas nao devem substituir eventos de integracao. Uma mensagem enviada ou reuniao criada deve ser evento rastreavel, podendo tambem aparecer no dossie.

### API Server-side De Notas

A API server-side de notas confirmou o padrao correto para proximas evolucoes: frontend chama camada server-side, que valida sessao, profile, organizacao e lead antes de acessar Supabase.

### Shadow Runtime

Shadow Runtime deve permanecer preservado. Integracoes futuras nao devem alterar a ordem de fallback do CRM nem misturar regras de leitura/escrita de leads com conectores externos.

## 3. Principios Arquiteturais

- Server-side first.
- Multi-tenant / organization-aware.
- Auditavel por usuario, lead e organizacao.
- Observavel com logs tecnicos e comerciais separados.
- Reversivel por feature flag ou isolamento de modulo.
- Sem dependencia critica de front-end.
- Sem exposicao de secrets no client.
- Sem acoplamento direto com UI.
- Provider-agnostic sempre que possivel.
- Idempotencia para eventos externos e webhooks.
- Rollback planejado antes de rollout.

## 4. Modelo Conceitual De Integracoes

Nomes sugeridos para estudo futuro, apenas documentais:

- `integration_providers`
- `integration_accounts`
- `integration_events`
- `integration_messages`
- `integration_sync_logs`
- `integration_errors`
- `lead_communications`
- `lead_calendar_events`

Essas tabelas nao foram criadas nesta sprint.

Modelo conceitual:

- `integration_providers`: catalogo de provedores habilitados, como Meta, Twilio, Google ou provider SMTP.
- `integration_accounts`: conexoes configuradas por organizacao ou usuario.
- `integration_events`: trilha tecnica/comercial de eventos normalizados.
- `integration_messages`: mensagens enviadas/recebidas via WhatsApp/e-mail.
- `integration_sync_logs`: execucoes de sincronizacao, webhooks e retries.
- `integration_errors`: falhas tecnicas normalizadas.
- `lead_communications`: comunicacoes vinculadas ao lead.
- `lead_calendar_events`: reunioes e compromissos vinculados ao lead.

## 5. WhatsApp

### Objetivo Futuro

Permitir que o consultor envie mensagens, registre comunicacoes e visualize interacoes relevantes no Dossie Executivo.

### Possiveis Provedores

- Z-API.
- Twilio.
- Meta Cloud API.
- Outro provider homologado pela operacao.

### Riscos

- bloqueio de numero por uso inadequado;
- limites de envio;
- custo por mensagem/conversa;
- templates obrigatorios em alguns cenarios;
- consentimento e opt-out;
- vazamento de telefone ou mensagem entre tenants;
- webhooks duplicados ou fora de ordem.

### Eventos Relevantes

- mensagem enviada;
- mensagem recebida;
- falha de envio;
- mensagem entregue;
- mensagem lida, se provider suportar;
- opt-out registrado;
- webhook recebido;
- erro de provider.

### Relacao Com Lead

Cada mensagem deve estar vinculada a:

- `organization_id`;
- `lead_id`;
- usuario responsavel, quando aplicavel;
- provider externo;
- identificador externo da mensagem.

### Relacao Com Notas

Mensagens nao devem ser salvas como notas livres por padrao. Elas devem ser eventos/comunicacoes proprias e podem gerar uma nota resumida apenas se houver decisao de produto posterior.

### Relacao Com Timeline/Dossie

O Dossie deve exibir comunicacoes importantes como eventos normalizados:

- "WhatsApp enviado";
- "WhatsApp recebido";
- "Falha no envio";
- "Opt-out registrado".

### O Que Deve Ser Server-side

- uso de token do provider;
- assinatura de webhook;
- validacao de lead/organizacao;
- envio de mensagem;
- retries;
- logs;
- normalizacao de payload externo.

### O Que Nunca Deve Ficar No Client

- token de API;
- secrets;
- assinatura de webhook;
- payload bruto sensivel;
- log completo de provider;
- regras de autorizacao.

### Estrategia Futura De Webhooks

Criar endpoint server-side por provider:

```text
POST /api/integrations/whatsapp/{provider}/webhook
```

Requisitos:

- validar assinatura;
- garantir idempotencia por `external_event_id`;
- registrar payload tecnico minimo;
- normalizar evento;
- vincular a lead quando possivel;
- nunca confiar em dados do provider sem validacao.

### Estrategia Futura De Logs

Separar:

- log tecnico de provider;
- evento comercial do lead;
- erro operacional;
- auditoria do usuario que disparou acao.

## 6. Google Agenda / Meet

### Objetivo Futuro

Criar e sincronizar reunioes comerciais vinculadas a leads, com possibilidade de gerar link Google Meet e registrar eventos no dossie.

### Criacao De Reunioes

Fluxo recomendado:

```text
Dossie/Pipeline
-> server-side EVOLV
-> validacao de usuario/profile/organizacao/lead
-> Google Calendar API
-> lead_calendar_events
-> timeline/dossie
```

### Sincronizacao De Eventos

Sincronizar:

- reuniao criada;
- reuniao atualizada;
- reuniao cancelada;
- reuniao realizada, se houver sinal confiavel;
- conflito ou erro de sincronizacao.

### Relacao Com Lead

Toda reuniao deve conter:

- `organization_id`;
- `lead_id`;
- `created_by_profile_id`;
- account Google usada;
- `external_calendar_event_id`;
- horario;
- status.

### Relacao Com Atividades Comerciais

Eventos de agenda podem alimentar atividades comerciais futuras, mas nao devem reescrever automaticamente pipeline/etapa sem decisao explicita.

### Relacao Com Proposta / Reuniao / Follow-up

Reunioes podem ser associadas a:

- apresentacao de proposta;
- follow-up comercial;
- reuniao de fechamento;
- revisao documental.

Essa associacao deve ser metadado estruturado, nao texto solto.

### OAuth E Riscos

Decisao pendente:

- conta Google institucional do EVOLV/Patrion;
- OAuth por usuario;
- modelo hibrido.

Riscos:

- refresh token expirado;
- escopo OAuth excessivo;
- usuario desconectar conta;
- acesso cruzado entre usuarios;
- eventos deletados no Google;
- conflito entre calendario externo e CRM.

### Tokens E Refresh Tokens

Devem ficar exclusivamente server-side, criptografados ou armazenados em mecanismo seguro. Nunca devem ser expostos no client.

### O Que Exige Server-side

- OAuth callback;
- refresh token;
- criacao/atualizacao/cancelamento de evento;
- geracao de link Meet;
- webhooks/push notifications;
- logs e retries.

### Como Evitar Acoplamento Com UI

A UI deve chamar uma acao de dominio:

```text
scheduleLeadMeeting(leadId, payload)
```

Nao deve conhecer detalhes da Google Calendar API.

### Como Registrar Eventos No Dossie

Registrar eventos normalizados:

- "Reuniao criada";
- "Meet gerado";
- "Reuniao remarcada";
- "Reuniao cancelada";
- "Erro ao sincronizar agenda".

## 7. E-mail

### Objetivo Futuro

Permitir envio manual futuro de e-mails comerciais, uso de templates e registro de comunicacoes relevantes no Dossie Executivo.

### Envio Manual Futuro

Fluxo recomendado:

```text
UI
-> server-side EVOLV
-> validar usuario/organizacao/lead
-> provider de e-mail
-> registrar evento
-> atualizar dossie/timeline
```

### Templates Futuros

Templates devem ser versionados e vinculados a organizacao. Variaveis devem ser sanitizadas antes do envio.

### Registro De Comunicacoes

Registrar:

- e-mail enviado;
- e-mail recebido, se houver sincronizacao futura;
- falha de envio;
- bounce;
- opt-out;
- abertura/clique apenas se houver base legal e decisao de produto.

### Possivel Leitura/Sincronizacao Futura

Leitura de caixa de entrada aumenta risco LGPD e deve ser etapa posterior, separada do envio manual.

### Riscos De LGPD

- armazenar corpo completo de e-mail sem necessidade;
- coletar tracking sem consentimento;
- expor dados sensiveis na timeline;
- sincronizar conversas pessoais por engano.

### Relacao Com Lead

E-mails devem vincular:

- `organization_id`;
- `lead_id`;
- usuario remetente;
- provider;
- identificador externo;
- assunto;
- resumo seguro.

### Relacao Com Notas

E-mail nao deve ser nota por padrao. Pode gerar evento de comunicacao e, se aprovado, resumo em nota interna.

### Relacao Com Timeline

Eventos sugeridos:

- "E-mail enviado";
- "E-mail recebido";
- "Falha no envio";
- "Resposta recebida";
- "Opt-out registrado".

### Provider-agnostic Design

Evitar acoplar dominio a Gmail, Outlook, Resend, SendGrid ou SMTP especifico. Criar contrato interno:

```text
sendLeadEmail(input)
```

## 8. Eventos E Timeline

Eventos futuros que podem alimentar o Dossie Executivo Vivo:

- mensagem WhatsApp enviada;
- mensagem WhatsApp recebida;
- reuniao criada;
- reuniao realizada;
- e-mail enviado;
- e-mail recebido;
- follow-up pendente;
- erro de integracao;
- sync concluido.

Recomendacao:

- criar camada de eventos normalizados;
- separar evento tecnico de evento comercial;
- exibir no dossie apenas o que ajuda o consultor a decidir o proximo passo.

## 9. Observabilidade Futura

Mapear:

- logs tecnicos por provider;
- logs comerciais por lead;
- erros de provider;
- retries;
- idempotencia;
- webhook signature validation;
- correlation IDs;
- auditoria por usuario e organizacao.

Recomendacao:

- todo evento externo deve ter `correlation_id`;
- todo webhook deve ter `external_event_id`;
- todo envio deve ter estado: `pending`, `sent`, `failed`, `confirmed`, quando aplicavel;
- erros devem ser visiveis para suporte, mas nao poluir a operacao do Bruno.

## 10. Seguranca E LGPD

### Secrets

Secrets devem ficar server-side, nunca no browser.

### Tokens OAuth

Tokens e refresh tokens devem ser armazenados de forma segura e escopados por organizacao/usuario.

### Dados Sensiveis

Evitar salvar payload bruto com dados pessoais quando um resumo estruturado basta.

### Consentimento

WhatsApp/e-mail exigem politica clara de consentimento, opt-out e finalidade.

### Opt-out

Opt-out deve ser respeitado antes de qualquer envio ativo.

### Historico De Comunicacao

Historico deve ser restrito por organizacao e, futuramente, por permissao.

### Acesso Por Organizacao

Todas as tabelas futuras devem possuir `organization_id` ou derivar escopo de forma inequívoca.

### Riscos De Vazamento Entre Tenants

Principais riscos:

- webhook sem tenant resolvido;
- token compartilhado indevidamente;
- provider account usada por organizacao errada;
- consulta sem filtro por `organization_id`.

### RLS Futura

RLS deve proteger tabelas de integracao antes de qualquer uso amplo em producao.

### Server-side Boundaries

Client nunca deve:

- assinar requests de provider;
- guardar token;
- chamar provider diretamente;
- decidir autorizacao final;
- receber payload bruto sensivel desnecessario.

## 11. Ordem Recomendada De Implementacao Futura

Sequencia sugerida:

1. Sprint 100B: Integration domain model.
2. Sprint 100C: Supabase schema proposal/migration.
3. Sprint 100D: Internal integration event log.
4. Sprint 100E: Calendar foundation.
5. Sprint 100F: Email foundation.
6. Sprint 100G: WhatsApp foundation.
7. Sprint 100H: Lead timeline integration.
8. Sprint 100I: Observability hardening.
9. Sprint 100J: Production rollout checklist.

## 12. Decisoes Pendentes

- Qual provider de WhatsApp?
- EVOLV tera conta Google propria ou OAuth por usuario?
- E-mail sera por dominio proprio?
- Havera templates comerciais?
- Comunicacao sera manual, automatica ou hibrida?
- Quais eventos entram no dossie?
- Quem pode disparar mensagens?
- Como tratar consentimento e opt-out?
- Quais mensagens exigem aprovacao?
- Qual ambiente de teste sera usado para provedores externos?

## 13. Riscos Criticos

### Tecnicos

- webhooks duplicados;
- falta de idempotencia;
- provider instavel;
- token expirado;
- retries gerando mensagens duplicadas.

### Comerciais

- mensagem enviada para lead errado;
- excesso de automacao;
- perda de contexto no dossie;
- reuniao criada em calendario incorreto.

### LGPD

- coleta excessiva;
- ausencia de opt-out;
- historico sensivel exposto;
- payload bruto armazenado sem necessidade.

### Operacionais

- suporte sem logs suficientes;
- Bruno sem visibilidade de falha;
- provider com custo inesperado;
- dependencia de conta pessoal.

### Produto

- poluicao visual do dossie;
- automacoes antes da maturidade operacional;
- integracoes competindo com fluxo principal do CRM.

### Custo

- cobranca por mensagem;
- custo por contato ativo;
- uso indevido de API;
- ambiente de teste pago.

## 14. Checklist Antes De Qualquer Implementacao Futura

- Producao validada.
- Bruno testou notas.
- Provider escolhido.
- Variaveis definidas.
- Modelo de ownership confirmado.
- RLS revisada.
- Plano de rollback aprovado.
- Logs definidos.
- Ambiente de teste separado.
- Politica de consentimento revisada.
- Escopo de eventos do dossie aprovado.
- Custos estimados.

## 15. Conclusao

Esta sprint nao implementa integracao.

Ela prepara o EVOLV para integrar WhatsApp, Google Agenda/Meet e e-mail sem comprometer a estabilidade da producao.

Qualquer implementacao futura deve ser feita em sprints pequenas, reversiveis, server-side, observaveis e validadas antes de chegar ao fluxo operacional do Bruno.

## Confirmacoes

- Nenhum arquivo produtivo foi alterado.
- Nenhuma migration foi criada.
- Nenhuma integracao foi implementada.
- Apenas o documento desta sprint foi criado.
