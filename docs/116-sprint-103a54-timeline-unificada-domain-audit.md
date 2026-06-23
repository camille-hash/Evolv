# Sprint 103A.54 - Timeline Unificada de Relacionamento

## Domain Audit

Status: Arquitetura  
Tipo: Documental  
Workspace: `C:\Projetos\Evolv-Auth`  
Branch: `main`

## Objetivo

Definir o dominio arquitetural da futura Timeline Unificada de Relacionamento do EVOLV.

Esta sprint nao implementa integracoes, nao cria infraestrutura, nao cria backlog executavel e nao altera produto. O unico resultado autorizado e este documento arquitetural.

A direcao analisada e transformar a Timeline atual, hoje focada em eventos internos do CRM, em uma memoria operacional resumida do relacionamento entre consultor, organizacao e lead.

## Contexto Inspecionado

Foram inspecionados os documentos locais disponiveis no workspace:

- `docs/MARCO-01-encerramento-crm-operacional.md`
- `docs/AUD-MC-01-verificacao-premissas-matematicas.md`

Os documentos `EVOLV_STATE_OF_THE_PROJECT_v1` e `Backlog Oficial Consolidado` nao foram localizados por nome no workspace durante a busca local. Nenhum arquivo fora do workspace foi consultado.

## Diagnostico Atual

O EVOLV ja possui uma base operacional consolidada:

- CRM autenticado e isolado por organizacao.
- Leads como entidade central da operacao comercial.
- Dossie Executivo Vivo por lead.
- Notas persistidas.
- Tasks comerciais com criacao, conclusao, cancelamento e proxima acao.
- Timeline Operacional derivada server-side.
- Simulacoes Comerciais vinculadas ao lead.
- Estudos Multi-Cotas vinculados ao lead.
- PDFs derivados de snapshots.
- Check Points derivados e explicaveis.
- Meu Dia como view operacional derivada.
- Dashboard Executivo Comercial somente leitura.

A Timeline atual ja segue uma regra saudavel:

```text
Notas lembram.
Tarefas executam.
Timeline audita.
```

Ela e um read model derivado de fontes persistidas, nao um event store autonomo. Essa decisao deve ser preservada.

## Fontes Atuais

As fontes atuais da Timeline e do Dossie pertencem ao dominio interno EVOLV:

- `crm_leads`
- `crm_lead_notes`
- `crm_tasks`
- `crm_lead_simulations`
- snapshots de simulacoes
- eventos derivados de criacao/conclusao/cancelamento ja persistidos

Essas fontes respondem bem ao historico interno, mas ainda nao cobrem canais externos de relacionamento, como WhatsApp, email, reunioes e ligacoes.

## Limitacoes Atuais

A principal limitacao atual nao e falta de registros internos. E falta de memoria integrada dos canais de relacionamento.

Hoje o EVOLV consegue responder:

```text
O que foi registrado dentro do CRM?
```

A futura Timeline Unificada devera ajudar a responder:

```text
O que aconteceu no relacionamento com este lead?
```

Limites atuais:

- Mensagens de WhatsApp nao aparecem como contexto consolidado.
- Emails enviados e recebidos nao compoem a memoria do lead.
- Reunioes e chamadas nao possuem modelo conceitual integrado.
- Historicos externos nao possuem visualizacao sob demanda.
- A Timeline nao deve virar uma caixa de entrada, um chat ou um espelho completo de mensagens.

## Visao Estrategica

A Timeline Unificada de Relacionamento nao e uma ferramenta de comunicacao.

Ela nao deve substituir WhatsApp, Gmail, Calendar, Meet ou telefonia.

O objetivo e:

```text
Memoria de Relacionamento
```

A Timeline deve permitir que o consultor entenda rapidamente a sequencia relevante de acontecimentos, sem precisar ler todo o historico bruto de cada canal.

## Modelo Conceitual Futuro

### Timeline

A Timeline e a visao cronologica resumida dos acontecimentos relevantes de um lead.

Ela deve apresentar eventos internos e externos com contexto suficiente para leitura operacional rapida, preservando as fontes originais como fonte de verdade.

A Timeline deve conter resumos, nao historicos completos.

Exemplo conceitual:

```text
WhatsApp
42 mensagens
Ultima interacao: 22/06/2026
Ultima mensagem: "Perfeito Bruno, vou analisar."
[Abrir historico]
```

### Evento

Um evento e um fato ocorrido em um ponto do tempo, associado a um lead e, quando possivel, a uma fonte persistida.

Exemplos conceituais:

- WhatsApp enviado.
- WhatsApp recebido.
- Email enviado.
- Email recebido.
- Reuniao criada.
- Reuniao realizada.
- Ligacao realizada.
- Ligacao recebida.
- Nota criada.
- Task criada.
- Task concluida.
- Simulacao criada.
- Estudo Multi-Cotas criado.
- PDF gerado.
- Mudanca de etapa.
- Mudanca de temperatura.

Um evento deve possuir pelo menos:

- identidade da fonte;
- tipo;
- data/hora de ocorrencia;
- lead associado;
- resumo legivel;
- referencia para abrir detalhe ou historico quando aplicavel.

### Canal

Canal e o meio pelo qual a interacao ocorreu.

Canais futuros possiveis:

- WhatsApp.
- Email.
- Google Meet.
- Google Calendar.
- Telefonia.
- Interno EVOLV.

O canal ajuda a explicar a origem do evento, mas nao deve transformar a Timeline em uma interface de operacao daquele canal.

### Conversa

Conversa e a continuidade relacional entre o EVOLV e um lead dentro de um contexto de comunicacao.

Uma conversa pode conter varias mensagens, respostas, anexos, mudancas de assunto e intervalos de tempo.

A conversa e maior que um evento individual e menor que todo o relacionamento historico do lead.

Exemplo:

```text
Conversa WhatsApp sobre documentacao de consorcio
```

### Thread

Thread e o agrupamento tecnico ou semantico de mensagens dentro de um canal especifico.

Exemplos:

- thread de email pelo mesmo assunto;
- sequencia de mensagens em um contato de WhatsApp;
- cadeia de respostas associada a uma reuniao;
- registro de chamada e retorno associados ao mesmo atendimento.

A thread e uma unidade util para abrir historico sob demanda, mas a Timeline deve exibir apenas um resumo dela.

### Email

Email e um canal assincrono com remetente, destinatarios, assunto, corpo, anexos e possivel thread.

Na Timeline, emails nao devem aparecer como todos os corpos completos. Devem aparecer como eventos resumidos ou agregados:

```text
Email recebido
Assunto: Documentos para analise
Ultima resposta ha 2 dias
[Abrir historico]
```

### Meeting

Meeting e uma interacao sincrona agendada ou realizada.

Modelo conceitual minimo:

- titulo;
- canal ou provedor;
- participantes;
- inicio;
- fim;
- duracao;
- status;
- resumo, se existir;
- transcricao, se existir;
- referencia ao calendario ou sala, se existir.

### Call

Call e uma interacao de voz, realizada ou recebida, com duracao e resultado operacional.

Modelo conceitual minimo:

- direcao: realizada ou recebida;
- data/hora;
- duracao;
- participante principal;
- resultado;
- observacao ou resumo, se existir;
- referencia para audio/transcricao, se existir futuramente.

### Transcricao

Transcricao e o registro textual bruto de uma conversa falada ou reuniao.

Ela pode existir para Meet, ligacao ou outra fonte de audio. A transcricao nao deve ser exibida inteira dentro da Timeline. Deve ficar em visualizacao sob demanda.

A transcricao e evidencia detalhada, nao resumo operacional.

### Resumo

Resumo e uma leitura condensada de uma conversa, reuniao, chamada ou thread.

Ele serve para leitura rapida. Nao substitui a fonte original.

Se, no futuro, resumos forem gerados automaticamente, isso exigira documento proprio, governanca propria e autorizacao especifica. Esta sprint nao autoriza IA, LLM ou resumo automatico.

## Estrategia de Armazenamento

### O que entra na Timeline

Devem entrar apenas eventos resumidos e operacionalmente relevantes:

- criacao de nota;
- criacao, conclusao e cancelamento de task;
- criacao de simulacao;
- criacao de estudo Multi-Cotas;
- geracao de PDF, quando houver fonte persistida confiavel;
- resumo de conversa WhatsApp;
- resumo de thread de email;
- resumo de reuniao;
- resumo de ligacao;
- mudancas comerciais relevantes do lead.

### O que nao entra na Timeline

Nao devem entrar como registros individuais dentro da Timeline:

- todas as mensagens de WhatsApp;
- todos os emails completos;
- todos os anexos;
- transcricoes completas;
- audios completos;
- logs tecnicos de provedor;
- eventos duplicados sem relevancia operacional;
- dados sem associacao confiavel com lead.

### Historico completo sob demanda

Historicos completos devem existir fora da Timeline e ser acessados sob demanda.

Exemplos:

```text
Timeline:
WhatsApp - 42 mensagens - ultima ha 3 horas - [Abrir historico]

Historico sob demanda:
Lista completa de mensagens, com datas, autores e conteudo.
```

```text
Timeline:
Google Meet - Reuniao realizada - 38 minutos - [Ver resumo]

Historico sob demanda:
Participantes, transcricao, resumo e metadados da reuniao.
```

## Comportamento Oficial da Timeline

A Timeline deve ser resumida, cronologica e orientada a relacionamento.

Principios:

- Eventos internos continuam sendo primeira classe.
- Canais externos entram como resumos de relacionamento.
- Historico completo nao aparece expandido por padrao.
- Detalhes extensos ficam em visualizacao sob demanda.
- A fonte original continua sendo a fonte de verdade.
- A Timeline nao cria fato artificial sem fonte persistida confiavel.
- A ordenacao principal deve respeitar `occurredAt DESC` quando houver implementacao futura.

## Historico Expansivel por Canal

### WhatsApp

A Timeline deve exibir resumo de conversa ou ultima interacao.

Historico completo, quando existir, deve abrir sob demanda com mensagens, direcao, horario, autor e conteudo.

### Email

A Timeline deve exibir resumo de envio/recebimento ou thread relevante.

Historico completo deve abrir sob demanda com assunto, participantes, corpos e anexos, respeitando seguranca e privacidade.

### Google Meet

A Timeline deve exibir reuniao criada, realizada ou resumida.

Detalhe sob demanda pode conter participantes, duracao, resumo e transcricao.

### Telefonia

A Timeline deve exibir chamada realizada ou recebida com duracao e resultado.

Historico sob demanda pode conter logs, observacoes, gravacao ou transcricao se futuramente aprovado.

## Google Meet - Modelo Conceitual

Uma reuniao deve ser tratada como um objeto de relacionamento, nao apenas como evento de calendario.

Modelo conceitual:

- `meetingId`: identificador da reuniao na fonte.
- `leadId`: lead relacionado.
- `channel`: Google Meet ou outro provedor.
- `title`: titulo da reuniao.
- `participants`: participantes internos e externos.
- `scheduledStartAt`: inicio previsto.
- `startedAt`: inicio real, quando disponivel.
- `endedAt`: fim real, quando disponivel.
- `durationMinutes`: duracao.
- `status`: criada, realizada, cancelada ou nao compareceu.
- `summary`: resumo, se existir.
- `transcriptionRef`: referencia para transcricao, se existir.
- `sourceRef`: referencia ao provedor externo.

A Timeline deve exibir apenas o resumo operacional da reuniao. Transcricao e detalhes devem ser sob demanda.

## Escalabilidade

### Crescimento de mensagens

Mensagens podem crescer rapidamente e nao devem ser armazenadas ou exibidas como eventos individuais na Timeline principal.

A arquitetura futura deve favorecer:

- agregacao por conversa ou thread;
- resumo da ultima interacao;
- contadores;
- paginacao no historico completo;
- busca sob demanda fora da Timeline principal.

### Crescimento de emails

Emails possuem corpos longos, anexos e threads extensas. A Timeline deve registrar apenas o resumo relevante.

A estrategia deve evitar duplicar corpos completos dentro de eventos de Timeline.

### Crescimento de reunioes

Reunioes podem gerar metadados, transcricoes e resumos. Esses artefatos devem ser referencias ou historicos sob demanda, nao blocos expandidos na Timeline principal.

### Retencao historica

Retencao deve ser tratada por politica futura especifica.

Este documento nao define prazo de retencao, exclusao automatica, arquivamento ou compactacao. Apenas estabelece que historicos completos possuem natureza diferente dos eventos resumidos da Timeline.

## Roadmap Futuro Nao Executavel

As fases abaixo sao temas arquiteturais possiveis, nao backlog aprovado, nao sprint aprovada e nao autorizacao de implementacao.

### Fase Conceitual 1 - Modelo de eventos externos

Tema arquitetural para definir como eventos externos seriam representados sem duplicar fontes e sem tornar a Timeline um event store indiscriminado.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 2 - WhatsApp

Tema arquitetural para conversas, mensagens, resumo e historico sob demanda.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 3 - Email

Tema arquitetural para envios, respostas, threads, anexos e historico sob demanda.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 4 - Google Calendar e Google Meet

Tema arquitetural para reunioes, participantes, duracao, resumo e transcricao.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 5 - Telefonia

Tema arquitetural para chamadas, duracao, resultado, gravacao e transcricao sob demanda.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

## Riscos Arquiteturais

### Risco 1 - Timeline virar espelho de mensagens

Se cada mensagem virar item de Timeline, a leitura operacional sera perdida. A Timeline precisa resumir, nao despejar historico bruto.

### Risco 2 - Duplicidade de fonte de verdade

Copiar conteudos completos de canais externos para eventos internos pode gerar divergencia entre provedor e EVOLV.

### Risco 3 - Integracao antes do dominio

Implementar OAuth, webhooks ou APIs antes de definir evento, canal, conversa e historico pode criar acoplamento prematuro.

### Risco 4 - Resumo sem evidencia

Resumos devem apontar para fonte ou historico. Um resumo sem evidencia reduz confianca operacional.

### Risco 5 - Escopo de comunicacao

A Timeline Unificada nao deve virar produto de envio de mensagens. O foco e memoria de relacionamento.

## Nao Objetivos

Esta sprint nao autoriza:

- codigo;
- componente;
- tela;
- modal;
- drawer;
- endpoint;
- API;
- OAuth;
- integracao WhatsApp;
- integracao Gmail;
- integracao Google Calendar;
- integracao Google Meet;
- integracao Telefonia;
- tabela;
- migration;
- SQL;
- RLS;
- policy;
- webhook;
- IA;
- resumo automatico;
- score;
- backlog executavel.

## Conclusao Arquitetural

A Timeline Unificada de Relacionamento deve evoluir a Timeline atual de uma auditoria interna do CRM para uma memoria operacional resumida do relacionamento.

A decisao central e separar tres camadas:

```text
Fonte original
  historico completo e evidencia

Resumo de relacionamento
  leitura operacional por canal ou evento relevante

Timeline
  ordem cronologica resumida para decisao do consultor
```

O EVOLV nao deve armazenar tudo na Timeline. Deve usar a Timeline para revelar o que importa, com acesso sob demanda ao historico completo quando necessario.

## Confirmacoes da Sprint

- Documento arquitetural criado.
- Nenhum codigo implementado.
- Nenhuma tela alterada.
- Nenhum frontend alterado.
- Nenhum backend alterado.
- Nenhuma API criada.
- Nenhum endpoint criado.
- Nenhuma integracao criada.
- Nenhum SQL criado.
- Nenhuma migration criada.
- Nenhuma tabela criada.
- Nenhuma RLS ou policy criada.
- Nenhum backlog executavel criado.
