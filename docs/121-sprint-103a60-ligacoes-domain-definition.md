# Sprint 103A.60 - Ligacoes

## Domain Definition

Status: Arquitetura  
Tipo: Documental  
Workspace: `C:\Projetos\Evolv-Auth`  
Branch: `main`

## Objetivo

Definir oficialmente o dominio de `Ligacoes` dentro da arquitetura do Dossie Multicanal do EVOLV.

Esta sprint e exclusivamente documental. Nao altera codigo, nao altera banco, nao cria frontend, nao cria backend, nao cria APIs, nao cria integracoes e nao aprova backlog executavel.

O objetivo exclusivo e estabelecer:

- o papel do dominio `Ligacoes`;
- os eventos conceituais do dominio;
- a estrutura conceitual da ligacao;
- os limites entre Ligacoes, Timeline e Resumo Executivo;
- a estrategia de escalabilidade;
- a evolucao futura apenas em nivel conceitual.

## Referencias Obrigatorias Inspecionadas

Esta definicao parte explicitamente de quatro documentos ja consolidados:

- `docs/116-sprint-103a54-timeline-unificada-domain-audit.md`
- `docs/117-sprint-103a55-dossie-multicanal-domain-definition.md`
- `docs/119-sprint-103a58-comunicacoes-domain-definition.md`
- `docs/120-sprint-103a59-reunioes-domain-definition.md`

Premissas oficiais preservadas:

```text
Ligacoes e dominio proprio.
Timeline continua resumida.
Resumo Executivo continua sintetico.
Historicos completos permanecem dentro do dominio Ligacoes.
```

## Contexto Arquitetural

O Dossie Multicanal ja reconhece `Ligacoes` como uma area de canal e profundidade.

Essa area nao deve ser confundida com:

- historico geral do relacionamento;
- Timeline expandida;
- central tecnica de telefonia;
- log bruto infinito de chamadas;
- substituto de notas, tarefas ou reunioes.

O dominio `Ligacoes` existe para responder:

```text
Quais contatos por voz ocorreram com este lead?
```

E tambem:

```text
Qual foi o resultado desses contatos?
```

Sem transformar a Timeline em historico de chamadas e sem transformar o Resumo Executivo em relatorio detalhado de tentativas.

## Definicao Oficial do Dominio

`Ligacoes` e o modulo do Dossie Multicanal responsavel por organizar a memoria dos contatos de voz relacionados ao lead.

Esse dominio cobre conceitualmente:

- chamadas realizadas;
- chamadas recebidas;
- chamadas perdidas;
- retornos;
- tentativas sem contato;
- resultados operacionais;
- resumos;
- observacoes;
- historico completo sob demanda.

Sua funcao e separar quatro camadas:

```text
Ligacao
  fato completo do contato de voz

Ligacoes
  profundidade organizada do dominio

Timeline
  leitura resumida do que aconteceu recentemente

Resumo Executivo
  sintese do estado atual do relacionamento
```

## Papel do Dominio

No EVOLV, uma ligacao e um contato de voz associado ao relacionamento comercial com um lead.

Ela nao e apenas uma tentativa tecnica de chamada.

Ela e um evento de relacionamento que pode carregar:

- intencao de contato;
- resultado operacional;
- memoria sintetica;
- necessidade de retorno;
- consequencia para o proximo passo comercial.

Uma ligacao deve responder:

```text
Quando aconteceu?
Quem ligou ou recebeu?
Houve contato real?
Qual foi o resultado?
O que ficou registrado?
Existe necessidade de retorno?
```

## Eventos do Dominio

O dominio `Ligacoes` deve reconhecer conceitualmente eventos como:

- ligacao iniciada;
- ligacao realizada;
- ligacao recebida;
- ligacao perdida;
- ligacao retornada;
- ligacao agendada;
- ligacao cancelada.

Esses eventos nao sao backlog tecnico. Eles sao apenas classes conceituais de acontecimentos que podem compor a memoria do canal.

## O Que E Uma Ligacao no EVOLV

Uma ligacao no EVOLV e a unidade de memoria de um contato de voz relacionado a um lead.

Ela deve capturar o encontro telefonico ou a tentativa de encontro telefonico como fato de relacionamento.

Isso inclui tanto chamadas com contato efetivo quanto tentativas frustradas, desde que tenham relevancia operacional.

## Estrutura Conceitual

### Atributos que pertencem a ligacao

Pertencem conceitualmente ao dominio da ligacao:

- data;
- hora;
- duracao;
- responsavel;
- participantes;
- origem;
- destino;
- direcao da chamada;
- status;
- resultado;
- resumo;
- observacoes;
- necessidade de retorno;
- referencia ao historico completo da chamada.

Esses atributos ajudam a descrever a chamada como unidade de relacionamento.

### Atributos que nao pertencem a ligacao

Nao pertencem diretamente ao objeto `Ligacao`:

- historico geral do relacionamento;
- lista cronologica completa de todos os canais;
- indicadores executivos agregados do lead;
- tarefas ja formalizadas como execucao;
- notas internas desconectadas da chamada;
- memoria completa de outros dominios, como Comunicacoes ou Reunioes.

Tambem nao pertence a uma ligacao transformar qualquer detalhe associado em elemento principal da Timeline ou do Resumo Executivo.

## Origem, Destino e Direcao

Origem e destino ajudam a explicar a configuracao relacional da chamada.

Exemplos conceituais:

- chamada originada pelo consultor;
- chamada recebida do lead;
- retorno a chamada anterior;
- chamada prevista para horario combinado.

Direcao, origem e destino pertencem a ligacao porque alteram a leitura operacional do contato.

## Status da Ligacao

O status descreve a situacao do evento de voz.

Exemplos conceituais:

- iniciada;
- concluida;
- perdida;
- cancelada;
- nao completada;
- agendada;
- retornada.

O status pertence a ligacao porque ajuda a diferenciar tentativa, contato efetivo e desdobramento pendente.

## Resultado da Ligacao

### Papel do resultado

Resultado e a leitura operacional do que efetivamente aconteceu a partir da chamada.

Ele responde:

```text
Houve contato?
Foi necessario retornar?
O lead atendeu?
A conversa produziu proximo passo?
```

### Exemplos conceituais de resultado

Resultados possiveis dentro do dominio:

- contato realizado;
- nao atendeu;
- retorno solicitado;
- caixa postal;
- ligacao encerrada;
- contato sem avancos;
- contato com desdobramento comercial.

Esses resultados nao sao implementacao. Sao categorias conceituais de interpretacao operacional.

### Relacao entre status e resultado

Status e resultado nao sao a mesma coisa.

Separacao conceitual:

```text
Status
  descreve o estado da chamada

Resultado
  descreve o efeito operacional da chamada
```

Exemplo conceitual:

- uma ligacao pode estar `concluida` no status e ter `nao atendeu` como resultado;
- uma ligacao pode estar `concluida` no status e ter `contato realizado` como resultado;
- uma ligacao pode estar `agendada` no status e ainda nao ter resultado.

## Resumo da Ligacao

### Papel do resumo

Resumo e a leitura condensada da chamada, suficiente para preservar a memoria util do contato sem exigir releitura detalhada do historico.

Resumo nao e transcricao.

Resumo nao e log tecnico.

Resumo nao e historico completo.

### Relacao com a memoria do relacionamento

O resumo da ligacao ajuda a preservar:

- contexto do contato;
- percepcao do andamento;
- resposta do lead;
- impacto no proximo passo comercial.

Ele pertence prioritariamente ao dominio `Ligacoes`, podendo alimentar a Timeline e o Resumo Executivo apenas em forma mais curta e mais sintetica.

## Observacoes

Observacoes pertencem a ligacao quando registram contexto especifico do contato de voz.

Elas nao devem substituir notas gerais do relacionamento.

Separacao conceitual:

```text
Observacao da ligacao
  contexto localizado daquela chamada

Nota
  memoria operacional mais ampla do relacionamento
```

## Timeline

### Regra Oficial

A Timeline continua resumida.

Ela nao e historico de chamadas.

Ela nao e lista completa de tentativas.

Ela nao e dump de resumos telefonicos.

Sua funcao continua sendo:

```text
O que aconteceu recentemente no relacionamento?
```

### O que deve aparecer na Timeline

Devem entrar somente eventos resumidos e operacionalmente relevantes, como:

- ligacao realizada com contato relevante;
- ligacao recebida relevante;
- ligacao perdida quando isso alterar o contexto operacional;
- retorno realizado;
- chamada que gerou proximo passo comercial;
- chamada que evidenciou necessidade de retomada.

### O que nao deve aparecer na Timeline

Nao devem entrar:

- todas as tentativas individualmente;
- cada microtentativa sem impacto;
- historico completo de chamadas;
- resumos extensos;
- observacoes integrais;
- listas detalhadas de participantes;
- qualquer leitura que transforme a Timeline em log telefonico.

### Comportamento esperado

A Timeline deve apontar para `Ligacoes` quando o usuario precisar aprofundar.

Exemplo conceitual:

```text
Timeline:
Ligacao realizada hoje - contato efetuado - retorno comercial necessario
[Abrir em Ligacoes]
```

## Resumo Executivo

### Papel do Resumo frente a Ligacoes

O Resumo Executivo nao substitui o dominio `Ligacoes`.

Ele apenas captura sinais sinteticos que ajudem o consultor a entender o estado atual do relacionamento.

### Indicadores conceituais possiveis

Podem compor futuramente o Resumo Executivo, sem implementacao nesta sprint:

- ultima ligacao;
- tempo desde a ultima ligacao;
- frequencia recente de contato;
- sucesso de contato recente;
- necessidade de retorno;
- ausencia prolongada de contato por voz;
- sinal de tentativa recorrente sem resposta.

### O que nao deve entrar no Resumo

Nao devem entrar:

- historico completo de chamadas;
- sequencia completa de tentativas;
- resumos integrais;
- observacoes extensas;
- detalhamento de cada contato.

O Resumo Executivo deve sinalizar estado, nao aprofundar o canal.

## Relacao Oficial Entre Ligacoes, Timeline e Resumo

Separacao conceitual oficial:

```text
Ligacoes
  profundidade do contato por voz

Timeline
  leitura resumida do que aconteceu recentemente

Resumo Executivo
  sintese do estado atual do relacionamento
```

Perguntas que cada camada responde:

```text
Ligacoes:
Quais contatos por voz ocorreram com este lead?

Timeline:
O que aconteceu recentemente no relacionamento?

Resumo Executivo:
Qual e o sinal atual mais importante sobre contato por voz neste relacionamento?
```

## Coerencia com Comunicacoes, Reunioes e Notas

Para manter coerencia com os demais dominios:

- `Comunicacoes` aprofunda canais assincronos;
- `Reunioes` aprofunda encontros sincronicos estruturados;
- `Ligacoes` aprofunda contatos de voz;
- `Notas` preservam memoria operacional ampla;
- `Timeline` resume atraves dos dominios;
- `Resumo Executivo` sintetiza sinais de estado.

Assim, `Ligacoes` nao deve absorver funcoes de:

- WhatsApp;
- E-mail;
- Reunioes;
- Notas;
- Timeline.

## Escalabilidade

### Milhares de ligacoes

O volume de chamadas futuras pode crescer rapidamente e nao deve transformar o Dossie em historico infinito.

A estrategia conceitual correta e:

- manter a chamada como unidade de dominio;
- priorizar leitura por relevancia e contexto;
- preservar profundidade sob demanda;
- evitar despejar todo o historico na Timeline ou no Resumo.

### Resumos e registros historicos

Resumos e observacoes podem se acumular ao longo do tempo.

Eles devem permanecer vinculados ao dominio `Ligacoes`, sem dominar a leitura principal do Dossie.

### Coexistencia com outros dominios

`Ligacoes` deve coexistir com:

- `Notas`, sem virar substituto de memoria operacional geral;
- `Comunicacoes`, sem se misturar com canais assincronos;
- `Reunioes`, sem transformar chamadas em encontros estruturados;
- `Timeline`, sem exigir leitura linear de historico completo.

## Evolucao Futura Apenas Conceitual

Temas futuros possiveis, sem qualquer especificacao tecnica nesta sprint:

- telefonia como fonte futura de eventos;
- gravacoes como artefatos de profundidade;
- transcricoes como detalhe associado;
- resumos automaticos, se um dia houver governanca propria;
- IA como camada futura de apoio, nunca autorizada por este documento.

Esses temas nao autorizam implementacao, integracao ou detalhamento tecnico agora.

## Camada Analitica Futura

Sem implementacao nesta sprint, o dominio admite evolucao conceitual para leitura analitica futura, por exemplo:

- tempo medio de ligacao;
- tentativas ate contato;
- taxa de sucesso;
- taxa de retorno;
- correlacao entre chamadas e fechamento.

Esses sinais nao pertencem ao historico bruto de uma ligacao individual.

Eles pertencem a uma camada analitica derivada futura, com definicao e autorizacao proprias.

## Riscos Arquiteturais

### Risco 1 - Ligacoes virar log tecnico

Se o dominio for tratado como despejo de chamadas, ele perde valor relacional.

Mitigacao conceitual: focar em memoria operacional do contato, nao em log bruto.

### Risco 2 - Timeline virar historico de chamadas

Se cada tentativa virar evento principal, a Timeline perde leitura executiva.

Mitigacao conceitual: Timeline resume; Ligacoes aprofunda.

### Risco 3 - Resumo Executivo virar relatorio de tentativas

Se o Resumo replicar o canal, ele deixa de ser sintese.

Mitigacao conceitual: Resumo Executivo expoe apenas sinais de estado.

### Risco 4 - Mistura entre ligacao, nota e tarefa

Se chamada, memoria ampla e execucao nao forem separados, a rastreabilidade operacional se perde.

Mitigacao conceitual: ligacao registra o contato; nota amplia memoria; tarefa executa desdobramento.

### Risco 5 - Escalar sem fronteira de dominio

Milhares de chamadas inviabilizam leitura quando nao existe separacao clara entre historico, resumo e sinal executivo.

Mitigacao conceitual: manter a divisao oficial entre Ligacoes, Timeline e Resumo Executivo.

## Roadmap Futuro Nao Executavel

As fases abaixo sao apenas temas conceituais de evolucao futura. Nao constituem backlog aprovado, nao constituem sprint aprovada e nao autorizam implementacao.

### Fase Conceitual 1 - Consolidacao do dominio Ligacoes

Tema arquitetural para consolidar a estrutura da chamada, seus estados, seus resultados e sua leitura operacional.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 2 - Resultados de Contato

Tema arquitetural para aprofundar a leitura operacional de contato realizado, ausencia de resposta, retorno e necessidade de retomada.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 3 - Artefatos de Profundidade

Tema arquitetural para gravacoes, transcricoes e outros registros extensos associados ao contato por voz.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 4 - Indicadores Executivos de Voz

Tema arquitetural para definir quais sinais de chamadas merecem entrar no Resumo Executivo.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 5 - Camada Analitica de Chamadas

Tema arquitetural para frequencia, sucesso de contato, tentativas e relacao com fechamento.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

## Nao Objetivos

Esta sprint nao autoriza:

- codigo;
- frontend;
- backend;
- componente;
- tela;
- banco;
- SQL;
- migration;
- API;
- endpoint;
- OAuth;
- webhook;
- telefonia;
- VoIP;
- Twilio;
- backlog executavel;
- commit;
- push.

## Conclusao Arquitetural

O dominio `Ligacoes` passa a ser oficialmente a area do Dossie Multicanal responsavel por profundidade dos contatos de voz relacionados ao lead.

Sua decisao central e preservar a separacao entre:

```text
Ligacao
  fato completo do contato de voz

Ligacoes
  profundidade organizada do dominio

Timeline
  visao resumida do que aconteceu recentemente

Resumo Executivo
  sintese do estado atual do relacionamento
```

Com isso, o EVOLV protege a leitura executiva, evita transformar a Timeline em historico de chamadas e evita transformar o Resumo Executivo em historico detalhado de tentativas.

## Confirmacoes da Sprint

- Documento arquitetural criado.
- Apenas um arquivo novo criado.
- Nenhum arquivo de codigo alterado.
- Nenhum frontend alterado.
- Nenhum backend alterado.
- Nenhuma API criada.
- Nenhum endpoint criado.
- Nenhuma integracao criada.
- Nenhum commit executado.
- Nenhum push executado.
