# Sprint 103A.58 - Comunicacoes

## Domain Definition

Status: Arquitetura  
Tipo: Documental  
Workspace: `C:\Projetos\Evolv-Auth`  
Branch: `main`

## Objetivo

Definir oficialmente o dominio de `Comunicacoes` dentro do Dossie Multicanal do EVOLV.

Esta sprint nao implementa integracoes, nao altera codigo, nao altera banco, nao cria frontend, nao cria backend, nao cria APIs e nao aprova backlog executavel.

O objetivo exclusivo e estabelecer:

- escopo do modulo Comunicacoes;
- limites entre canal, Timeline e Resumo Executivo;
- criterio de profundidade por canal;
- regra para historico completo;
- criterio de escalabilidade;
- direcao conceitual de evolucao futura em fases.

## Referencias Obrigatorias Inspecionadas

Esta definicao parte explicitamente de dois documentos ja consolidados:

- `docs/116-sprint-103a54-timeline-unificada-domain-audit.md`
- `docs/117-sprint-103a55-dossie-multicanal-domain-definition.md`

Premissas oficiais preservadas:

```text
Timeline e visao resumida.
Comunicacao e dominio proprio.
Historico completo permanece no canal apropriado.
O Dossie nao replica conversas completas.
```

## Contexto Arquitetural

O Dossie Multicanal ja possui placeholder visual para `Comunicacoes`, posicionado como area de aprofundamento por canal.

Essa area nao deve ser confundida com:

- inbox;
- chat;
- central de envio;
- timeline expandida;
- arquivo bruto de tudo que foi trocado com o lead.

O dominio `Comunicacoes` existe para responder:

```text
O que aconteceu na comunicacao com este lead?
```

Sem exigir que o usuario percorra a Timeline inteira e sem transformar a Timeline em historico de mensagens.

## Definicao Oficial do Dominio

`Comunicacoes` e o modulo do Dossie Multicanal responsavel por organizar a memoria dos canais assincronos de contato com o lead.

Nesta definicao V1, o modulo cobre conceitualmente:

- WhatsApp;
- E-mail.

O modulo centraliza contexto de relacionamento, mas nao duplica indiscriminadamente o conteudo de cada canal.

Sua funcao e separar tres camadas:

```text
Canal
  historico proprio e evidencia

Comunicacoes
  contexto organizado por conversa, thread ou interacao relevante

Timeline / Resumo Executivo
  leitura transversal e sintetica
```

## Responsabilidade do Modulo Comunicacoes

O modulo deve ser a area oficial para leitura por canal de:

- conversas;
- threads;
- mensagens;
- anexos associados;
- metadados relevantes;
- historico completo sob demanda;
- estado recente da interacao.

O modulo deve responder:

```text
Quando foi a ultima troca?
Qual canal foi usado?
Existe resposta pendente?
Qual conversa ou thread importa agora?
Onde esta o historico completo deste canal?
```

O modulo nao deve responder sozinho:

```text
Qual e o estado geral do relacionamento agora?
```

Essa pergunta pertence ao Resumo Executivo.

Tambem nao deve responder:

```text
Mostre tudo o que aconteceu recentemente em todos os dominios.
```

Essa pergunta pertence a Timeline.

## WhatsApp

### Papel no Dominio

WhatsApp e um canal conversacional, rapido e volumoso, orientado a trocas sequenciais e potencialmente fragmentadas ao longo do tempo.

O objetivo da area WhatsApp no dominio nao e mostrar apenas a ultima mensagem.

Ela deve responder:

```text
O que aconteceu no WhatsApp com este lead?
```

### O que pertence ao canal WhatsApp

Pertencem ao dominio proprio de WhatsApp:

- mensagens enviadas;
- mensagens recebidas;
- autores ou direcao da mensagem;
- data e hora;
- conteudo da mensagem;
- anexos vinculados a mensagem;
- agrupamento por conversa ou sequencia relacional;
- identificacao da ultima interacao;
- contadores e estados de leitura operacional;
- historico completo sob demanda.

### O que deve ser exibido na area de WhatsApp

A area deve priorizar:

- conversa ou contexto principal;
- ultima interacao relevante;
- direcao da ultima mensagem;
- resumo do estado atual da conversa;
- acesso ao historico completo;
- indicacao de anexos quando existirem;
- marcadores temporais suficientes para leitura operacional.

Nao deve priorizar:

- despejo bruto de todas as mensagens sem organizacao;
- repeticao de trechos longos fora de contexto;
- duplicacao da Timeline;
- espelhamento completo do provedor no primeiro nivel do Dossie.

### O que pertence ao historico

Pertence ao historico completo de WhatsApp:

- sequencia integral das mensagens;
- anexos associados;
- datas e horarios detalhados;
- autoria/direcao de cada mensagem;
- continuidade completa da conversa;
- evidencias necessarias para auditoria e investigacao.

O historico e a profundidade do canal. Ele nao deve ser replicado na Timeline nem no Resumo Executivo.

### O que pertence a Timeline

A Timeline deve receber apenas eventos resumidos de WhatsApp, por exemplo:

- ultima interacao relevante;
- inicio de conversa relevante;
- retomada apos periodo de silencio;
- recebimento de resposta operacionalmente importante;
- envio relevante para o andamento comercial.

Nao devem entrar na Timeline:

- todas as mensagens individualmente;
- cada anexo como evento autonomo;
- respostas triviais sem impacto operacional;
- fragmentos sequenciais que so fazem sentido dentro da conversa completa.

### O que pertence ao Resumo Executivo

No Resumo Executivo, WhatsApp deve aparecer apenas como sinal sintetico, por exemplo:

- ultimo contato via WhatsApp;
- tempo desde a ultima troca;
- existencia de resposta recente;
- canal mais recente de interacao, quando relevante.

O Resumo nao deve exibir:

- conversa expandida;
- lista de mensagens;
- anexos;
- texto completo do historico.

## E-mail

### Papel no Dominio

E-mail e um canal assincrono estruturado por thread, assunto, participantes e anexos, com corpos potencialmente longos e historicos extensos.

O objetivo da area E-mail no dominio e responder:

```text
O que aconteceu por email com este lead?
```

### O que pertence ao canal E-mail

Pertencem ao dominio proprio de E-mail:

- mensagens enviadas;
- mensagens recebidas;
- threads;
- assunto;
- remetente;
- destinatarios;
- copiados, quando relevantes ao contexto;
- corpo das mensagens;
- anexos;
- data e hora;
- metadados necessarios para rastrear a conversa;
- historico completo por thread.

### O que deve ser exibido na area de E-mail

A area deve priorizar:

- threads relevantes;
- ultimo email enviado ou recebido;
- participantes principais;
- assunto;
- indicacao de anexos;
- status relacional da thread;
- acesso ao historico completo da conversa.

A area nao deve priorizar:

- todos os corpos completos abertos ao mesmo tempo;
- anexos replicados fora de contexto;
- listagem desordenada de mensagens sem agrupamento por thread;
- tentativa de substituir a Timeline.

### O que pertence ao historico

Pertence ao historico completo de E-mail:

- cadeia completa da thread;
- todos os corpos das mensagens;
- anexos;
- participantes;
- ordem cronologica interna da troca;
- contexto integral da conversa.

Esse historico deve permanecer no canal apropriado.

### O que pertence a Timeline

A Timeline deve receber apenas eventos resumidos de E-mail, por exemplo:

- email recebido relevante;
- email enviado relevante;
- thread retomada;
- chegada de resposta esperada;
- recebimento de documentacao por email;
- envio de material comercialmente relevante.

Nao devem entrar na Timeline:

- todos os emails da thread como eventos individuais por padrao;
- corpo completo de email;
- anexos como dump documental;
- metadados tecnicos sem leitura operacional.

### O que pertence ao Resumo Executivo

No Resumo Executivo, E-mail deve aparecer apenas como sintese de estado, por exemplo:

- ultimo contato por email;
- ultima resposta recebida;
- tempo sem resposta;
- thread ativa mais recente, quando relevante.

O Resumo nao deve conter:

- thread expandida;
- corpo completo;
- anexos;
- historico detalhado.

## Timeline

### Regra Oficial

A Timeline permanece resumida.

Ela nao e historico de mensagens.

Ela nao e lista completa de emails.

Ela nao e espelho dos canais.

Sua funcao continua sendo:

```text
O que aconteceu recentemente no relacionamento?
```

### Eventos de comunicacao que entram

Devem entrar somente eventos resumidos e operacionalmente relevantes, como:

- ultima interacao relevante por WhatsApp;
- recebimento de resposta esperada;
- retomada de conversa apos silencio relevante;
- email enviado com impacto comercial claro;
- email recebido com impacto operacional claro;
- chegada de documentacao por email;
- mudanca perceptivel no estado de comunicacao do lead.

### Eventos de comunicacao que nao entram

Nao devem entrar:

- todas as mensagens individualmente;
- todos os emails individualmente por padrao;
- anexos completos;
- corpos integrais;
- historicos completos;
- logs tecnicos;
- metadados sem valor operacional imediato;
- eventos redundantes em excesso.

### Comportamento esperado

A Timeline deve apontar para `Comunicacoes` quando o usuario precisar aprofundar.

Exemplo conceitual:

```text
Timeline:
WhatsApp - ultima resposta recebida ha 2 horas
[Abrir em Comunicacoes]
```

## Resumo Executivo

### Papel do Resumo frente a Comunicacoes

O Resumo Executivo nao substitui o modulo `Comunicacoes`.

Ele apenas captura sinais de comunicacao que ajudam a decidir o proximo passo agora.

### Indicadores conceituais autorizados

Podem compor futuramente o Resumo Executivo, sem implementacao nesta sprint:

- ultima interacao;
- canal da ultima interacao;
- tempo sem resposta;
- ultima resposta recebida;
- ultimo envio relevante;
- ausencia prolongada de retorno;
- canal dominante recente, quando isso ajudar a leitura executiva.

### O que nao deve entrar no Resumo

Nao devem entrar:

- conversas completas;
- corpos completos de email;
- sequencias completas de mensagens;
- anexos;
- threads inteiras;
- leitura detalhada por canal.

O Resumo Executivo deve sinalizar contexto, nao aprofundar canal.

## Relacao Oficial Entre Comunicacoes, Timeline e Resumo

Separacao conceitual oficial:

```text
Comunicacoes
  profundidade por canal

Timeline
  leitura resumida e transversal

Resumo Executivo
  leitura sintetica do estado atual
```

Perguntas que cada camada responde:

```text
Comunicacoes:
O que aconteceu neste canal?

Timeline:
O que aconteceu recentemente no relacionamento?

Resumo Executivo:
Qual e o estado da comunicacao agora?
```

## Escalabilidade

### Milhares de mensagens

Mensagens de WhatsApp podem crescer rapidamente e nao devem ser tratadas como itens equivalentes na Timeline principal.

A estrategia conceitual correta e:

- agrupar por conversa;
- resumir ultima interacao;
- destacar pontos relevantes;
- manter historico completo apenas no canal.

### Milhares de emails

Emails crescem em volume, comprimento de corpo, numero de participantes e quantidade de anexos.

A estrategia conceitual correta e:

- agrupar por thread;
- evitar duplicacao de corpos completos fora do canal;
- destacar apenas interacoes relevantes na Timeline;
- tratar historico completo como profundidade do dominio E-mail.

### Anexos

Anexos fazem parte do contexto de comunicacao, mas nao devem dominar a leitura resumida.

Eles pertencem prioritariamente ao canal que os originou.

Timeline e Resumo podem apenas sinalizar existencia de anexo quando isso for relevante para o entendimento do relacionamento.

### Retencao historica

A retencao historica exige politica propria futura.

Esta sprint nao define:

- prazo de retencao;
- estrategia de arquivamento;
- compactacao;
- exclusao automatica;
- politica de armazenamento.

Ela define apenas o principio:

```text
Historico completo pertence ao canal.
Leitura resumida pertence a Timeline e ao Resumo.
```

## Riscos Arquiteturais

### Risco 1 - Comunicacoes virar Timeline duplicada

Se Comunicacoes apenas repetir os mesmos resumos da Timeline, o dominio perde valor.

Mitigacao conceitual: Comunicacoes precisa entregar profundidade por canal.

### Risco 2 - Timeline virar historico de mensagens

Se cada mensagem ou email entrar como evento principal, a Timeline perde leitura executiva.

Mitigacao conceitual: Timeline resume; canal aprofunda.

### Risco 3 - Resumo Executivo virar inbox

Se o Resumo tentar mostrar conversa, thread ou anexos completos, ele perde funcao de sintese.

Mitigacao conceitual: Resumo apenas sinaliza indicadores de estado.

### Risco 4 - Duplicidade de conteudo

Copiar indiscriminadamente mensagens, emails e anexos para varias camadas pode gerar divergencia e excesso cognitivo.

Mitigacao conceitual: cada camada mostra apenas o nivel de profundidade que lhe pertence.

### Risco 5 - Escalar sem fronteira de dominio

Milhares de mensagens e emails inviabilizam leitura operacional quando nao existe separacao clara entre historico, resumo e indicador.

Mitigacao conceitual: manter a divisao oficial entre canal, Timeline e Resumo Executivo.

## Roadmap Futuro Nao Executavel

As fases abaixo sao apenas temas conceituais de evolucao futura. Nao constituem backlog aprovado, nao constituem sprint aprovada e nao autorizam implementacao.

### Fase Conceitual 1 - Consolidacao do dominio Comunicacoes

Tema arquitetural para consolidar criterios de profundidade, agrupamento e leitura por canal dentro do Dossie Multicanal.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 2 - WhatsApp

Tema arquitetural para conversas, mensagens, anexos, historico sob demanda e leitura resumida do canal.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 3 - E-mail

Tema arquitetural para threads, mensagens, anexos, participantes, historico sob demanda e leitura resumida do canal.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 4 - Indicadores Executivos de Comunicacao

Tema arquitetural para definir quais sinais de comunicacao merecem entrar no Resumo Executivo, sem transformar o Resumo em historico.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 5 - Politica de Escalabilidade e Retencao

Tema arquitetural para lidar com crescimento volumetrico, anexos e retencao historica dos canais.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

## Nao Objetivos

Esta sprint nao autoriza:

- codigo;
- frontend;
- backend;
- componente;
- tela;
- modal;
- API;
- endpoint;
- modelo de banco;
- tabela;
- migration;
- SQL;
- OAuth;
- webhook;
- integracao WhatsApp;
- integracao Gmail;
- integracao Google;
- conectores especificos;
- backlog executavel;
- commit;
- push.

## Conclusao Arquitetural

O dominio `Comunicacoes` passa a ser oficialmente a area do Dossie Multicanal responsavel por profundidade de relacionamento nos canais assincronos.

Sua decisao central e preservar a separacao entre:

```text
Canal
  historico completo

Comunicacoes
  contexto organizado por canal

Timeline
  visao resumida do que aconteceu recentemente

Resumo Executivo
  sintese do estado atual da comunicacao
```

Com isso, o EVOLV protege a leitura executiva, evita transformar a Timeline em historico de mensagens e mantem Comunicacoes como dominio proprio dentro do Dossie.

## Confirmacoes da Sprint

- Documento arquitetural criado.
- Apenas um arquivo novo criado.
- Nenhum arquivo de codigo alterado.
- Nenhum frontend alterado.
- Nenhum backend alterado.
- Nenhuma API criada.
- Nenhum endpoint criado.
- Nenhum modelo de banco proposto.
- Nenhuma integracao especifica proposta.
- Nenhum commit executado.
- Nenhum push executado.
