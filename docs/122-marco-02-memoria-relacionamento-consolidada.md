# MARCO-02 - Memoria de Relacionamento Consolidada

## Arquitetura Oficial Consolidada

Status: Arquitetura  
Tipo: Consolidacao  
Workspace: `C:\Projetos\Evolv-Auth`  
Branch: `main`

## Objetivo

Consolidar oficialmente a arquitetura da Memoria de Relacionamento do EVOLV em um unico documento de referencia.

Este marco nao implementa funcionalidades, nao altera codigo, nao altera banco, nao cria frontend, nao cria backend, nao cria APIs, nao cria integracoes e nao aprova backlog executavel.

O objetivo exclusivo e formalizar:

- o que e a Memoria de Relacionamento do EVOLV;
- suas camadas oficiais;
- as responsabilidades de cada dominio;
- as fronteiras obrigatorias entre sintese, visao transversal e profundidade;
- os principios arquiteturais oficiais;
- a regra oficial de escalabilidade;
- a arquitetura consolidada final aprovada.

## Documentos Consolidados

Este marco consolida explicitamente os seguintes documentos:

- `docs/116-sprint-103a54-timeline-unificada-domain-audit.md`
- `docs/117-sprint-103a55-dossie-multicanal-domain-definition.md`
- `docs/119-sprint-103a58-comunicacoes-domain-definition.md`
- `docs/120-sprint-103a59-reunioes-domain-definition.md`
- `docs/121-sprint-103a60-ligacoes-domain-definition.md`

## 1. Visao Geral

A Memoria de Relacionamento do EVOLV e a arquitetura oficial que organiza, sintetiza e aprofunda o historico relevante do relacionamento comercial de um lead.

Ela nao e:

- inbox;
- chat;
- dashboard;
- log tecnico;
- historico bruto indiscriminado;
- repositorio unico de todos os artefatos expandidos.

Ela e:

```text
Memoria consolidada do relacionamento por lead
```

Sua funcao e permitir que o consultor compreenda:

- o estado atual do relacionamento;
- o que aconteceu recentemente;
- o que aconteceu em cada dominio;
- o que precisa acontecer depois.

## 2. Camadas Oficiais

A arquitetura consolidada da Memoria de Relacionamento e composta pelas seguintes camadas oficiais:

- Resumo Executivo
- Timeline
- Comunicacoes
- Reunioes
- Ligacoes
- Notas
- Tarefas

Essas camadas nao competem entre si. Cada uma responde a um tipo de pergunta especifico.

## 3. Camadas e Responsabilidades

### Resumo Executivo

Responsabilidade oficial:

- sintetizar o estado atual do relacionamento;
- destacar sinais executivos;
- expor o que importa agora;
- reduzir a necessidade de abrir todos os dominios para entender o momento atual.

O Resumo Executivo responde:

```text
Qual e o estado deste relacionamento agora?
```

O que pertence:

- ultimos sinais relevantes;
- proxima acao relevante;
- ausencia de proximo passo;
- ultimo contato relevante;
- sinais sinteticos derivados de canais;
- sinais sinteticos derivados de reunioes e ligacoes.

O que nao pertence:

- historico completo;
- conteudo bruto;
- conversas completas;
- threads completas;
- transcricoes;
- listas extensas de eventos.

### Timeline

Responsabilidade oficial:

- exibir visao transversal e cronologica resumida;
- ordenar acontecimentos relevantes;
- revelar o que aconteceu recentemente;
- apontar para aprofundamento quando necessario.

A Timeline responde:

```text
O que aconteceu recentemente no relacionamento?
```

O que pertence:

- eventos resumidos;
- fatos relevantes de relacionamento;
- navegacao para profundidade;
- leitura cronologica condensada.

O que nao pertence:

- historico completo de qualquer dominio;
- dump de mensagens;
- dump de chamadas;
- dump de reunioes;
- transcricoes;
- artefatos extensos expandidos por padrao.

### Comunicacoes

Responsabilidade oficial:

- aprofundar canais assincronos;
- organizar contexto por conversa, thread e interacao relevante;
- preservar historico completo sob demanda;
- separar profundidade do canal da visao transversal da Timeline.

Comunicacoes responde:

```text
O que aconteceu na comunicacao com este lead?
```

O que pertence:

- WhatsApp;
- E-mail;
- mensagens;
- threads;
- anexos associados;
- historico completo por canal;
- estado recente da interacao.

O que nao pertence:

- sintese executiva global do relacionamento;
- historico expandido na Timeline;
- mistura com Reunioes ou Ligacoes.

### Reunioes

Responsabilidade oficial:

- aprofundar encontros sincronicos estruturados;
- organizar resumo, participantes, duracao, status, decisoes e proximos passos derivados;
- preservar profundidade do encontro.

Reunioes responde:

```text
Quais encontros aconteceram ou estao planejados com este lead?
```

O que pertence:

- reunioes agendadas;
- reunioes realizadas;
- resumos;
- transcricoes, quando existirem futuramente;
- participantes;
- duracao;
- decisoes do encontro;
- proximos passos derivados.

O que nao pertence:

- execucao operacional de tarefas;
- historico cronologico global;
- Resumo Executivo expandido;
- Timeline detalhada.

### Ligacoes

Responsabilidade oficial:

- aprofundar contatos de voz;
- organizar tentativas, contatos efetivos, resultados, resumos e observacoes;
- preservar a memoria operacional do canal de voz.

Ligacoes responde:

```text
Quais contatos por voz ocorreram com este lead?
```

O que pertence:

- chamadas realizadas;
- chamadas recebidas;
- chamadas perdidas;
- resultados;
- necessidade de retorno;
- resumos de ligacao;
- observacoes localizadas;
- historico completo do canal.

O que nao pertence:

- memoria ampla do relacionamento;
- sintese executiva global;
- Timeline detalhada de tentativas;
- mistura com reunioes ou comunicacoes assincronas.

### Notas

Responsabilidade oficial:

- preservar memoria operacional ampla;
- registrar contexto manual do consultor;
- reter informacoes que nao pertencem necessariamente a um canal especifico.

Notas respondem:

```text
O que precisamos lembrar sobre este relacionamento?
```

O que pertence:

- memoria operacional;
- contexto interno;
- observacoes amplas;
- registro manual relevante.

O que nao pertence:

- execucao;
- agenda;
- historico completo de canais;
- Timeline expandida.

### Tarefas

Responsabilidade oficial:

- sustentar a execucao operacional;
- registrar proxima acao;
- acompanhar pendencias e desdobramentos.

Tarefas respondem:

```text
O que precisa acontecer depois?
```

O que pertence:

- proxima acao;
- tarefas pendentes;
- tarefas concluidas;
- tarefas canceladas;
- execucao posterior derivada de reunioes, ligacoes ou outros contextos.

O que nao pertence:

- memoria ampla;
- historico completo de canais;
- sintese executiva;
- explicacao completa do relacionamento.

## 4. Fronteiras Oficiais

As seguintes fronteiras passam a ser formais e obrigatorias na arquitetura da Memoria de Relacionamento:

### Resumo Executivo != Timeline

Resumo Executivo:

- sintetiza o estado atual;
- condensa sinais.

Timeline:

- organiza acontecimentos recentes;
- mostra ordem cronologica resumida.

### Timeline != Historico Completo

Timeline:

- resume;
- aponta;
- orienta.

Historico Completo:

- aprofunda;
- detalha;
- preserva evidencia.

### Canal != Resumo

Canal:

- contem profundidade propria;
- organiza artefatos, sequencias e memoria especializada.

Resumo:

- condensa sinais;
- nao replica conteudo bruto.

### Profundidade != Sintese

Profundidade:

- pertence aos dominios de canal e memoria especializada.

Sintese:

- pertence ao Resumo Executivo.

### Dossie != Timeline

O Dossie Multicanal e a arquitetura consolidada da memoria.

A Timeline e apenas uma das visoes dentro dessa arquitetura.

## 5. Principios Arquiteturais Oficiais

Os principios abaixo passam a ser oficiais:

### Principio 1 - O Dossie e a memoria consolidada do relacionamento

O Dossie Multicanal e o produto principal da Memoria de Relacionamento por lead.

### Principio 2 - A Timeline nunca replica historico completo

A Timeline deve permanecer resumida, cronologica e orientada a leitura operacional.

### Principio 3 - O Resumo Executivo nunca replica conteudo bruto

O Resumo Executivo deve expor apenas sinais sinteticos, nunca conversas, transcricoes, threads ou logs completos.

### Principio 4 - Cada dominio e responsavel por sua profundidade

Comunicacoes, Reunioes, Ligacoes, Notas, Tarefas e outros dominios preservam sua propria natureza e sua propria profundidade.

### Principio 5 - Profundidade e acessada sob demanda

Historicos completos, artefatos extensos e detalhes operacionais devem permanecer nos dominios apropriados.

### Principio 6 - Sintese e profundidade nao se confundem

O que sintetiza nao aprofunda. O que aprofunda nao deve dominar a leitura sintetica.

### Principio 7 - O relacionamento e lido por camadas

A leitura oficial do EVOLV ocorre em camadas:

```text
Sintese
  estado atual

Visao transversal
  acontecimentos recentes

Profundidade
  memoria especializada por dominio

Execucao
  proximos passos
```

### Principio 8 - O sistema deve favorecer leitura executiva

A arquitetura deve evitar listas infinitas, despejo de historico bruto e excesso de detalhe como primeira experiencia.

## 6. Regra Oficial de Escalabilidade

A regra oficial de escalabilidade da Memoria de Relacionamento passa a ser:

```text
Ultimo Artefato
+ 
Historico Recolhivel
+
Visao Executiva
```

Interpretacao oficial:

- `Ultimo Artefato`: mostrar primeiro o item mais relevante ou mais recente;
- `Historico Recolhivel`: preservar profundidade sob demanda, sem expandir tudo por padrao;
- `Visao Executiva`: manter leitura sintetica e orientada a decisao.

Essa regra deve ser aplicada coerentemente a:

- Notas
- Tarefas
- Simulacoes
- Multi-Cotas
- Comunicacoes
- Reunioes
- Ligacoes

### Aplicacao conceitual da regra

#### Notas

- ultima nota em destaque;
- historico recolhivel;
- leitura executiva do contexto recente.

#### Tarefas

- proxima acao em destaque;
- historico de execucao sob demanda;
- leitura objetiva do que precisa acontecer agora.

#### Simulacoes

- ultimo artefato ou ultimo estudo em destaque;
- historico acessivel;
- leitura comercial sintetica.

#### Multi-Cotas

- ultimo estudo ou ultimo snapshot em destaque;
- historico sob demanda;
- leitura condensada do artefato.

#### Comunicacoes

- ultima interacao relevante em destaque;
- historico completo por canal sob demanda;
- leitura executiva do estado da comunicacao.

#### Reunioes

- ultimo encontro ou proximo encontro relevante em destaque;
- historico do dominio sob demanda;
- leitura sintetica do que ficou do encontro.

#### Ligacoes

- ultimo contato relevante ou necessidade de retorno em destaque;
- historico do canal sob demanda;
- leitura sintetica do estado do contato por voz.

## 7. Arquitetura Oficial Consolidada

A arquitetura final consolidada da Memoria de Relacionamento do EVOLV fica formalizada assim:

```text
Lead
  Dossie Multicanal
    Resumo Executivo
      sintese do estado atual

    Timeline
      visao transversal resumida

    Comunicacoes
      profundidade dos canais assincronos

    Reunioes
      profundidade dos encontros sincronicos

    Ligacoes
      profundidade dos contatos de voz

    Notas
      memoria operacional ampla

    Tarefas
      execucao e proximo passo
```

E, em termos de camadas:

```text
Resumo Executivo
  sintetiza

Timeline
  resume transversalmente

Dominios
  aprofundam

Tarefas
  executam
```

## 8. Nao Objetivos Deste Marco

Este marco nao autoriza:

- codigo;
- frontend;
- backend;
- banco;
- SQL;
- APIs;
- endpoints;
- integracoes;
- Auth;
- RLS;
- Dashboard;
- CRM operacional;
- Pipeline;
- backlog executavel;
- commit;
- push.

## 9. Conclusao Arquitetural

A Memoria de Relacionamento do EVOLV passa a ter uma arquitetura oficial consolidada baseada em separacao de camadas, responsabilidades claras e escalabilidade por sintese mais profundidade sob demanda.

A decisao central deste marco e:

```text
O EVOLV nao deve competir com o historico bruto.
Deve organizar a memoria do relacionamento em camadas legiveis, executivas e aprofundaveis.
```

Com isso, a arquitetura oficial aprovada fica protegida por quatro eixos:

- sintese sem duplicacao de bruto;
- Timeline sem historico completo;
- profundidade por dominio;
- escalabilidade por ultimo artefato, historico recolhivel e visao executiva.

## Confirmacoes do Marco

- Documento arquitetural consolidado criado.
- Apenas um arquivo novo criado.
- Nenhum arquivo de codigo alterado.
- Nenhum frontend alterado.
- Nenhum backend alterado.
- Nenhuma API criada.
- Nenhuma integracao criada.
- Nenhum commit executado.
- Nenhum push executado.
