# 39 — PWA and Push Readiness Plan

## 1. Visao Estrategica

EVOLV, LUMINA, ARUZZ e ELEVARE devem compartilhar uma arquitetura comum para experiencias digitais instalaveis, mobile-first e preparadas para notificacoes futuras.

A direcao estrategica e criar uma base reutilizavel para:

- aplicativo instalavel via PWA;
- notificacoes push;
- experiencia mobile consistente;
- menor dependencia de lojas de aplicativos;
- evolucao futura para automacoes e lembretes contextuais.

Nesta sprint, nada disso sera implementado. Este documento apenas registra a direcao arquitetural.

## 2. O Que E PWA

PWA significa Progressive Web App.

Na pratica, permite que uma aplicacao web se comporte de forma semelhante a um aplicativo instalado:

- instalacao via navegador;
- icone na tela inicial do celular ou desktop;
- abertura em janela propria;
- possibilidade de tela cheia;
- experiencia mais proxima de aplicativo nativo;
- atualizacao centralizada pelo proprio deploy web.

O PWA nao substitui todos os recursos de um app nativo, mas e suficiente para muitos fluxos operacionais, consultivos e de acompanhamento.

## 3. Beneficios

Principais beneficios esperados:

- sem necessidade inicial de App Store;
- sem necessidade inicial de Play Store;
- atualizacao centralizada no deploy web;
- menor custo de desenvolvimento e manutencao;
- implantacao rapida;
- menor friccao para testes internos;
- base unica para desktop, tablet e celular;
- boa aderencia a produtos consultivos e operacionais.

## 4. Arquitetura Futura

Fluxo conceitual:

```text
Frontend
↓
Service Worker
↓
Push Service
↓
Notification Engine
```

Responsabilidades futuras:

- `Frontend`: interface do usuario, consentimento e exibicao de preferencias;
- `Service Worker`: recebimento de eventos de push e comportamento offline basico;
- `Push Service`: infraestrutura de entrega das notificacoes;
- `Notification Engine`: geracao dos payloads e mensagens de notificacao.

O modulo `modules/notifications` ja prepara a camada de payloads e templates, mas nao realiza nenhum envio.

## 5. Fluxo de Permissao

Fluxo esperado:

```text
Primeiro acesso
↓
Solicitar permissao
↓
Permitido ou Negado
↓
Salvar preferencia
```

Campos previstos:

- `pushEnabled`;
- `pushPermission`;
- `pushToken`.

Esses campos devem futuramente ser persistidos por usuario, cliente ou organizacao, conforme o desenho final de permissoes e multiempresa.

## 6. Casos de Uso EVOLV

Possiveis notificacoes futuras:

- boleto vence amanha;
- prazo de lance encerra em 3 dias;
- assembleia amanha;
- carta contemplada;
- retorno comercial pendente;
- atualizacao de evento de acompanhamento.

## 7. Casos de Uso LUMINA

Possiveis notificacoes futuras:

- consulta amanha;
- retorno pos-procedimento;
- rotina de skincare;
- medicacao;
- confirmacao de horario;
- acompanhamento de tratamento.

## 8. Casos de Uso ARUZZ

Possiveis notificacoes futuras:

- evento proximo;
- convite recebido;
- confirmacao pendente;
- atualizacao curatorial;
- lembrete de participacao;
- mudanca de status de candidatura.

## 9. Casos de Uso ELEVARE

Possiveis notificacoes futuras:

- tarefas;
- projetos;
- aprovacoes;
- prazos internos;
- checkpoints de execucao;
- atualizacoes de status.

## 10. Roadmap Tecnico

### Fase 1: Arquitetura pronta

Manter tipos, templates e motores puros preparados para notificacoes, sem envio real.

### Fase 2: Supabase

Criar schema, usuarios, preferencias, eventos, historico de notificacoes e regras de permissao.

### Fase 3: PWA

Adicionar manifest, icones, configuracoes de instalacao e experiencia mobile instalada.

### Fase 4: Push

Adicionar service worker, solicitacao de permissao, registro de token e recebimento de notificacoes.

### Fase 5: Automacoes

Criar agendamentos, disparos condicionais, historico de entrega, retentativas e regras por produto.

## 11. Riscos

Riscos e cuidados:

- usuarios podem negar permissao de notificacao;
- Android e iOS possuem comportamentos diferentes para PWA e push;
- iOS pode impor limitacoes de instalacao e permissao;
- service workers exigem HTTPS e configuracao cuidadosa;
- notificacoes em excesso podem reduzir confianca do usuario;
- tokens podem expirar ou precisar de renovacao;
- preferencias devem respeitar consentimento e privacidade;
- automacoes exigem auditoria para evitar disparos indevidos.

## 12. Nao Fazer Agora

Nesta sprint, nao fazer:

- sem implementacao PWA;
- sem push;
- sem automacoes;
- sem service worker;
- sem dependencias;
- sem WhatsApp;
- sem e-mail;
- sem alteracao de UI;
- sem alteracao de Dashboard;
- sem alteracao de Apresentacao;
- sem alteracao de Simulacoes;
- sem alteracao de `localStorage`;
- sem alteracao de Supabase.

Este documento e apenas um plano de readiness arquitetural para uma fase futura.
