# Sprint 103A.59 - Reunioes

## Domain Definition

Status: Arquitetura  
Tipo: Documental  
Workspace: `C:\Projetos\Evolv-Auth`  
Branch: `main`

## Objetivo

Definir oficialmente o dominio de `Reunioes` dentro do Dossie Multicanal do EVOLV.

Esta sprint nao implementa integracoes, nao altera codigo, nao altera banco, nao cria frontend, nao cria backend, nao cria APIs e nao aprova backlog executavel.

O objetivo exclusivo e estabelecer:

- o que e uma reuniao no EVOLV;
- quais atributos pertencem ao dominio Reunioes;
- o papel de resumo, transcricao, decisoes e proximos passos;
- o limite entre Reunioes, Timeline e Resumo Executivo;
- a direcao conceitual para camada analitica futura;
- a estrategia conceitual de escalabilidade;
- a evolucao futura em fases, sem autorizacao executavel.

## Referencias Obrigatorias Inspecionadas

Esta definicao parte explicitamente de tres documentos ja consolidados:

- `docs/116-sprint-103a54-timeline-unificada-domain-audit.md`
- `docs/117-sprint-103a55-dossie-multicanal-domain-definition.md`
- `docs/119-sprint-103a58-comunicacoes-domain-definition.md`

Premissas oficiais preservadas:

```text
Reunioes e dominio proprio.
Timeline permanece visao resumida.
Resumo Executivo permanece visao sintetica.
Historicos completos permanecem dentro do dominio Reunioes.
```

## Contexto Arquitetural

O Dossie Multicanal ja reconhece `Reunioes` como uma area de canal e profundidade.

Essa area nao deve ser confundida com:

- agenda paralela do produto;
- Timeline expandida;
- repositorio de transcricoes;
- repositorio de gravacoes;
- lista dispersa de compromissos sem contexto de relacionamento.

O dominio `Reunioes` existe para responder:

```text
Quais encontros aconteceram ou estao planejados com este lead?
```

E tambem:

```text
O que emergiu dessas reunioes?
```

Sem transformar a Timeline em historico completo de encontros e sem transformar o Resumo Executivo em lista de reunioes.

## Definicao Oficial do Dominio

`Reunioes` e o modulo do Dossie Multicanal responsavel por organizar a memoria dos encontros sincronicos relacionados a um lead.

Esse dominio cobre conceitualmente:

- reunioes agendadas;
- reunioes realizadas;
- reunioes canceladas;
- reunioes sem comparecimento;
- resumos;
- participantes;
- duracao;
- decisoes relevantes;
- proximos passos derivados;
- historico completo sob demanda.

Sua funcao e separar quatro camadas:

```text
Reuniao
  fato completo do encontro

Reunioes
  profundidade organizada do dominio

Timeline
  leitura resumida do que aconteceu recentemente

Resumo Executivo
  sintese do estado atual do relacionamento
```

## O Que E Uma Reuniao no EVOLV

No EVOLV, uma reuniao e um encontro sincronico associado ao relacionamento comercial com um lead.

Ela nao e apenas um evento de calendario.

Ela e um objeto de relacionamento que pode carregar:

- contexto comercial;
- participantes;
- estado do encontro;
- memoria sintetica;
- consequencias operacionais.

Uma reuniao deve responder:

```text
Quando aconteceu?
Quem participou?
Qual foi o status?
Qual foi a duracao?
O que ficou decidido?
O que precisa acontecer depois?
```

## Atributos que Pertencem a Reuniao

Pertencem conceitualmente ao dominio da reuniao:

- data;
- hora;
- inicio previsto;
- inicio real, quando existir;
- fim real, quando existir;
- duracao;
- participantes;
- canal do encontro;
- titulo ou identificacao do encontro;
- status;
- resumo, quando existir;
- transcricao, quando existir;
- contexto ou objetivo do encontro;
- decisoes registradas;
- proximos passos derivados;
- referencia ao historico completo do encontro.

Esses atributos ajudam a descrever o encontro como unidade de relacionamento.

## Atributos que Nao Pertencem a Reuniao

Nao pertencem diretamente ao objeto `Reuniao`:

- tarefas ja formalizadas como execucao operacional;
- notas internas que existam fora do contexto do encontro;
- historico geral do canal de comunicacao;
- indicadores executivos agregados do lead;
- lista cronologica global de tudo o que aconteceu no relacionamento;
- historico completo de outros dominios, como Comunicacoes ou Ligacoes.

Tambem nao pertence a reuniao transformar qualquer artefato associado em elemento principal do Resumo Executivo ou da Timeline.

## Papel do Canal

O canal da reuniao ajuda a explicar a natureza do encontro.

Exemplos conceituais possiveis:

- encontro virtual;
- encontro presencial;
- sessao de apresentacao;
- conversa de alinhamento;
- reuniao de fechamento;
- reuniao de follow-up.

O canal e atributo da reuniao, mas nao redefine o dominio.

O dominio continua sendo `Reunioes`, nao o provedor tecnico do encontro.

## Status da Reuniao

O status e parte essencial da leitura operacional da reuniao.

Exemplos conceituais de estado:

- agendada;
- realizada;
- cancelada;
- nao realizada;
- sem comparecimento;
- reagendada.

O status pertence a reuniao porque altera o valor relacional e operacional do encontro.

## Resumo da Reuniao

### O que e resumo

Resumo e a leitura condensada do encontro, em linguagem operacional, suficiente para permitir entendimento rapido do que foi discutido e do que importa agora.

Resumo nao e transcricao.

Resumo nao e ata completa.

Resumo nao e historico integral.

### Papel do resumo

O resumo existe para:

- preservar a memoria util do encontro;
- reduzir necessidade de reler material extenso;
- evidenciar o que foi relevante no relacionamento;
- apoiar a navegacao entre reuniao, Timeline e proxima execucao.

### Onde o resumo aparece

O resumo pertence prioritariamente ao dominio `Reunioes`.

Ele pode alimentar:

- a propria leitura do encontro no modulo Reunioes;
- a Timeline, em forma ainda mais resumida;
- o Resumo Executivo, apenas como sinal sintetico, quando relevante.

O resumo completo do encontro nao deve ser despejado no Resumo Executivo.

## Transcricao

### Papel da transcricao

Transcricao e o registro textual detalhado do que foi falado durante um encontro, quando esse artefato existir futuramente.

Ela e evidencia detalhada.

Ela nao e leitura principal.

### Relacao com a reuniao

A transcricao pertence a reuniao como artefato associado de profundidade.

Ela pode enriquecer investigacao, auditoria ou revisita detalhada do encontro.

Mas a transcricao nao define sozinha o valor operacional da reuniao.

### Relacao com o resumo

Resumo e sintese.

Transcricao e detalhe.

O resumo pode ser produzido a partir da experiencia do encontro ou de uma leitura detalhada posterior, mas conceitualmente ocupa camada diferente da transcricao.

Separacao oficial:

```text
Transcricao
  detalhe bruto do encontro

Resumo
  leitura operacional condensada
```

A Timeline nao deve virar repositorio de transcricoes.

## Decisoes e Proximos Passos

### O que pertence a reuniao

Pertencem ao dominio da reuniao:

- decisoes tomadas durante o encontro;
- encaminhamentos acordados;
- entendimento consolidado do que ficou combinado;
- compromissos que emergiram diretamente da conversa.

Esses elementos fazem parte da memoria do encontro.

### O que deve alimentar tarefas

Quando uma decisao do encontro exige execucao posterior, ela deve alimentar o dominio de tarefas.

Em termos conceituais:

```text
Reuniao registra o que foi decidido.
Tarefa executa o que precisa acontecer depois.
```

Assim, o modulo Reunioes nao substitui tarefas.

Ele registra origem e contexto; a tarefa registra a execucao operacional.

### O que deve alimentar a Timeline

A Timeline deve receber apenas o evento resumido da reuniao e, quando relevante, seu principal desdobramento relacional.

Exemplos conceituais:

- reuniao realizada;
- reuniao reagendada;
- reuniao cancelada;
- reuniao gerou proximo passo relevante;
- reuniao consolidou decisao importante no relacionamento.

Nao devem entrar na Timeline:

- cada detalhe da conversa;
- lista completa de participantes com profundidade excessiva;
- transcricao;
- resumo integral;
- todos os microencaminhamentos internos.

## Timeline

### Regra Oficial

A Timeline permanece resumida.

Ela nao e historico de reunioes.

Ela nao e ata expandida.

Ela nao e repositorio de transcricoes.

Sua funcao continua sendo:

```text
O que aconteceu recentemente no relacionamento?
```

### Eventos de reuniao que entram

Devem entrar somente eventos resumidos e operacionalmente relevantes, como:

- reuniao agendada, quando isso tiver valor relacional visivel;
- reuniao realizada;
- reuniao cancelada;
- reuniao reagendada;
- reuniao sem comparecimento;
- reuniao que gerou decisao comercial relevante;
- reuniao que alterou o estado do relacionamento.

### Eventos de reuniao que nao entram

Nao devem entrar:

- transcricao completa;
- resumo completo da reuniao;
- blocos longos de fala;
- todo o historico detalhado do encontro;
- anexos ou artefatos extensos associados;
- listas excessivamente detalhadas de participantes;
- cada microdecisao como evento autonomo.

### Comportamento esperado

A Timeline deve apontar para `Reunioes` quando o usuario precisar aprofundar.

Exemplo conceitual:

```text
Timeline:
Reuniao realizada ontem - 42 minutos - proximo passo comercial definido
[Abrir em Reunioes]
```

## Resumo Executivo

### Papel do Resumo frente a Reunioes

O Resumo Executivo nao substitui o dominio `Reunioes`.

Ele apenas captura sinais de reunioes que ajudem o consultor a entender o estado atual do relacionamento.

### Indicadores conceituais autorizados

Podem compor futuramente o Resumo Executivo, sem implementacao nesta sprint:

- ultima reuniao;
- tempo desde a ultima reuniao;
- proxima reuniao prevista;
- duracao da ultima reuniao, quando isso for relevante;
- existencia de compromisso futuro;
- ausencia prolongada de reunioes;
- indicacao sintetica de que a ultima reuniao gerou proximo passo importante.

### O que nao deve entrar no Resumo

Nao devem entrar:

- lista completa de reunioes;
- resumo integral do encontro;
- transcricao;
- historico detalhado;
- lista completa de participantes;
- memoria expandida do canal.

O Resumo Executivo deve sinalizar estado, nao aprofundar encontro.

## Relacao Oficial Entre Reunioes, Timeline e Resumo

Separacao conceitual oficial:

```text
Reunioes
  profundidade do encontro e seus artefatos

Timeline
  leitura resumida do que aconteceu recentemente

Resumo Executivo
  sintese do estado atual do relacionamento
```

Perguntas que cada camada responde:

```text
Reunioes:
Quais encontros aconteceram ou estao planejados com este lead?

Timeline:
O que aconteceu recentemente no relacionamento?

Resumo Executivo:
Qual e o sinal atual mais importante sobre reunioes neste relacionamento?
```

## Camada Analitica Futura

Sem qualquer implementacao nesta sprint, o dominio admite evolucao conceitual para leitura analitica futura, por exemplo:

- tempo medio de reuniao;
- frequencia de reunioes;
- relacao entre reunioes e avancos comerciais;
- correlacao entre reunioes e fechamento;
- comparacoes futuras por closer ou contexto de operacao.

Esses sinais nao pertencem ao encontro individual como historico bruto.

Eles pertencem a uma camada analitica derivada futura, que exigiria definicao propria e autorizacao propria.

## Escalabilidade

### Milhares de reunioes

O volume de encontros pode crescer ao ponto de inviabilizar leitura linear simples.

A estrategia conceitual correta e:

- manter o encontro como unidade de dominio;
- destacar os encontros mais relevantes;
- preservar profundidade sob demanda;
- evitar despejar historico completo na Timeline ou no Resumo.

### Gravacoes, transcricoes e resumos

Gravacoes, transcricoes e resumos sao artefatos potencialmente extensos.

Eles nao devem dominar a leitura principal do Dossie.

Devem permanecer vinculados ao dominio Reunioes como profundidade, evidencia ou apoio de leitura.

### Retencao historica

Retencao, arquivamento e compactacao exigem politica propria futura.

Esta sprint nao define:

- prazo de retencao;
- politica de armazenamento;
- compactacao;
- exclusao automatica;
- tratamento tecnico de arquivos.

Ela define apenas o principio:

```text
Historico completo do encontro pertence ao dominio Reunioes.
Timeline e Resumo Executivo recebem apenas leitura condensada.
```

## Riscos Arquiteturais

### Risco 1 - Reunioes virar Timeline duplicada

Se o dominio Reunioes apenas repetir os mesmos resumos da Timeline, ele perde profundidade e utilidade.

Mitigacao conceitual: Reunioes precisa concentrar o encontro como unidade de memoria propria.

### Risco 2 - Timeline virar historico de reunioes

Se cada detalhe do encontro entrar como evento autonomo, a Timeline perde leitura executiva.

Mitigacao conceitual: Timeline resume; Reunioes aprofunda.

### Risco 3 - Resumo Executivo virar historico de encontros

Se o Resumo tentar replicar os encontros, ele deixa de ser sintese.

Mitigacao conceitual: Resumo Executivo deve expor apenas sinais de estado.

### Risco 4 - Transcricao dominar o dominio

Se a transcricao virar a forma principal de leitura, o dominio perde clareza operacional.

Mitigacao conceitual: transcricao e detalhe; resumo e a leitura condensada; Timeline recebe apenas o essencial.

### Risco 5 - Mistura entre memoria e execucao

Se decisoes e proximos passos nao forem separados de tarefas, a rastreabilidade operacional se perde.

Mitigacao conceitual: reuniao registra contexto; tarefa executa o desdobramento.

## Roadmap Futuro Nao Executavel

As fases abaixo sao apenas temas conceituais de evolucao futura. Nao constituem backlog aprovado, nao constituem sprint aprovada e nao autorizam implementacao.

### Fase Conceitual 1 - Consolidacao do dominio Reunioes

Tema arquitetural para consolidar a estrutura do encontro, seus estados, seus artefatos e sua leitura operacional dentro do Dossie Multicanal.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 2 - Resumos de Reuniao

Tema arquitetural para aprofundar o papel do resumo como memoria operacional condensada do encontro.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 3 - Artefatos de Profundidade

Tema arquitetural para transcricoes, registros extensos e outros artefatos associados ao encontro, sem transformar a Timeline em repositorio.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 4 - Indicadores Executivos de Reuniao

Tema arquitetural para definir quais sinais de encontro merecem entrar no Resumo Executivo sem transformar o Resumo em historico.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 5 - Camada Analitica de Encontros

Tema arquitetural para frequencia, duracao, relacao com fechamento e outros indicadores derivados de reunioes.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

## Nao Objetivos

Esta sprint nao autoriza:

- codigo;
- frontend;
- backend;
- componente;
- tela;
- API;
- endpoint;
- modelo de banco;
- tabela;
- migration;
- SQL;
- OAuth;
- webhook;
- integracao Google Meet;
- integracao Google Calendar;
- gravacoes como implementacao;
- backlog executavel;
- commit;
- push.

## Conclusao Arquitetural

O dominio `Reunioes` passa a ser oficialmente a area do Dossie Multicanal responsavel por profundidade dos encontros sincronicos relacionados ao lead.

Sua decisao central e preservar a separacao entre:

```text
Reuniao
  fato completo do encontro

Reunioes
  profundidade organizada do dominio

Timeline
  visao resumida do que aconteceu recentemente

Resumo Executivo
  sintese do estado atual sobre encontros
```

Com isso, o EVOLV protege a leitura executiva, evita transformar a Timeline em repositorio de reunioes e evita transformar o Resumo Executivo em historico de encontros.

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
