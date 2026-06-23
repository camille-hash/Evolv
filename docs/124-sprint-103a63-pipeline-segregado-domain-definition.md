# Sprint 103A.63 - Pipeline Segregado

## Domain Definition

Status: Arquitetura  
Tipo: Domain Definition  
Workspace: `C:\Projetos\Evolv-Auth`  
Branch: `main`

## Objetivo

Definir oficialmente a arquitetura do `Pipeline Segregado` entre `SDR` e `Closer` no EVOLV.

Esta sprint e estritamente documental. Nao implementa filtros, nao altera codigo, nao altera banco, nao cria frontend, nao cria backend, nao cria APIs, nao altera Auth, nao altera RLS e nao aprova backlog executavel.

O objetivo exclusivo e formalizar:

- o pipeline de Prospeccao;
- o pipeline de Vendas;
- a zona de sobreposicao entre SDR e Closer;
- a transferencia de responsabilidade;
- a visibilidade conceitual;
- os impactos futuros da segregacao;
- a arquitetura oficial consolidada do modelo.

## Documentos Obrigatorios Consolidados

Esta definicao parte explicitamente de:

- `docs/122-marco-02-memoria-relacionamento-consolidada.md`
- `docs/123-sprint-103a61-dossie-scalability-principles.md`

## Contexto de Negocio Oficial

A regra operacional consolidada para este documento e:

```text
Ate a primeira reuniao:
  o lead pertence simultaneamente a Prospeccao e Vendas

Apos a primeira reuniao realizada:
  o lead continua visivel para ambos

Apos avancar para qualquer etapa posterior:
  o lead passa a pertencer exclusivamente ao funil de Vendas
```

Essa regra nao define implementacao tecnica. Ela define a arquitetura de responsabilidade e leitura do pipeline.

## 1. Pipeline de Prospeccao

### Objetivo

O pipeline de Prospeccao existe para conduzir o lead desde a entrada inicial ate a validacao comercial suficiente para preparar o encontro inicial.

Sua funcao principal e:

- gerar contato;
- qualificar contexto inicial;
- confirmar aderencia minima;
- conduzir o lead ate a primeira reuniao.

### Responsabilidade

Prospeccao e o dominio operacional do SDR.

O SDR e responsavel por:

- abertura do relacionamento comercial;
- tentativa de contato inicial;
- qualificacao primaria;
- conducao ate agendamento da primeira reuniao;
- sustentacao do lead dentro da zona de sobreposicao, enquanto a transferencia exclusiva ainda nao ocorreu.

### Inicio

Prospeccao comeca quando o lead entra no fluxo comercial e ainda depende de qualificacao inicial ou preparacao para o primeiro encontro.

### Termino

Prospeccao termina conceitualmente quando o lead sai da zona compartilhada e passa a avancar em etapa posterior a `Primeira Reuniao Realizada`.

Ou seja:

```text
Prospeccao nao termina no agendamento.
Prospeccao nao termina automaticamente na reuniao realizada.
Prospeccao termina quando a responsabilidade exclusiva deixa de ser compartilhada.
```

## 2. Pipeline de Vendas

### Objetivo

O pipeline de Vendas existe para conduzir o lead da fase de encontro comercial inicial ate a progressao comercial propriamente dita.

Sua funcao principal e:

- receber o lead na fase de encontro;
- sustentar a leitura comercial do caso;
- conduzir o avancar posterior ao primeiro encontro;
- assumir responsabilidade exclusiva apos a saida da zona compartilhada.

### Responsabilidade

Vendas e o dominio operacional do Closer.

O Closer e responsavel por:

- preparar e conduzir a primeira reuniao no contexto comercial;
- sustentar leitura comercial simultanea durante a sobreposicao;
- assumir a progressao posterior;
- tornar-se responsavel exclusivo apos o primeiro avancar real de vendas.

### Inicio

Vendas comeca antes da exclusividade.

Ela comeca conceitualmente quando o lead entra no ciclo da `Primeira Reuniao Agendada`, porque a etapa de encontro ja pertence ao dominio comercial do Closer.

### Termino

Vendas termina apenas quando o lead deixa o funil de vendas por desfecho comercial, perda ou outro encerramento futuro definido em documento proprio.

Esta sprint nao define fim operacional detalhado do pipeline comercial completo. Define apenas onde ele comeca no modelo segregado.

## 3. Zona de Sobreposicao

### Definicao Oficial

A zona de sobreposicao entre SDR e Closer passa a ser composta oficialmente por duas etapas compartilhadas:

- `Primeira Reuniao Agendada`
- `Primeira Reuniao Realizada`

### Papel da Sobreposicao

Essa sobreposicao existe para impedir ruptura artificial entre qualificacao e conducao comercial.

Ela formaliza que:

- o SDR ainda nao desaparece quando a reuniao e agendada;
- o Closer ja precisa atuar antes da exclusividade;
- o primeiro encontro pertence a uma fase de transicao e nao a uma troca abrupta de ownership.

### Significado Arquitetural

A zona compartilhada responde ao seguinte principio:

```text
O agendamento e a realizacao da primeira reuniao pertencem simultaneamente a Prospeccao e Vendas.
```

Isso cria um corredor de handoff acompanhado, em vez de uma transferencia instantanea.

## 4. Transferencia de Responsabilidade

### Quando o SDR deixa de ser responsavel

O SDR deixa de ser responsavel quando o lead avanca para qualquer etapa posterior a `Primeira Reuniao Realizada`.

Enquanto o lead estiver em:

- `Primeira Reuniao Agendada`
- `Primeira Reuniao Realizada`

o SDR continua participante legitimo da responsabilidade compartilhada.

### Quando o Closer assume responsabilidade exclusiva

O Closer assume responsabilidade exclusiva quando o lead entra em qualquer etapa posterior a `Primeira Reuniao Realizada`.

Arquiteturalmente:

```text
Primeiro encontro nao encerra automaticamente a sobreposicao.
O avancar posterior encerra.
```

### Regra Oficial

A transferencia oficial nao e disparada por:

- mera entrada em Vendas;
- mero agendamento;
- mera realizacao da reuniao.

Ela e disparada por:

```text
Avanco posterior ao marco da primeira reuniao realizada.
```

## 5. Visibilidade

### Regra Conceitual

A visibilidade deve seguir a responsabilidade arquitetural, sem que este documento implemente permissao, Auth ou RLS.

### Quem ve o que

#### Antes da primeira reuniao

- SDR ve o lead no contexto de Prospeccao
- Closer ve o lead no contexto de Vendas

Porque o lead pertence simultaneamente aos dois dominios.

#### Durante a zona de sobreposicao

- SDR continua vendo
- Closer continua vendo

Porque a etapa e oficialmente compartilhada.

#### Apos o avancar posterior

- o lead permanece visivel para Vendas como ownership exclusivo
- Prospeccao deixa de ser o dominio principal de pertencimento

Este documento nao define se o SDR continua tendo leitura residual, analitica ou historica. Define apenas a arquitetura oficial do pertencimento operacional.

### O que este documento nao faz

Este documento nao implementa:

- permissao;
- filtro;
- regra tecnica de acesso;
- visibilidade por perfil;
- RLS;
- segregacao tecnica de consultas.

## 6. Impactos Futuros

A segregacao arquitetural afeta conceitualmente varios temas futuros:

### Dashboard

O dashboard futuro precisara distinguir:

- visoes de Prospeccao;
- visoes de Vendas;
- visoes compartilhadas;
- ownership exclusivo versus ownership sobreposto.

### Meu Dia

Meu Dia futuro podera precisar separar:

- acoes do SDR;
- acoes do Closer;
- acoes em zona compartilhada.

### Check Points

Check Points futuros poderao precisar considerar:

- sinais especificos de Prospeccao;
- sinais especificos de Vendas;
- sinais de transicao entre dominios.

### Permissoes

Permissoes futuras precisarao refletir a diferenca entre:

- visibilidade compartilhada;
- responsabilidade compartilhada;
- ownership exclusivo.

### Metricas SDR

Metricas SDR futuras poderao ser ancoradas em:

- abertura e qualificacao;
- conversao ate primeira reuniao;
- permanencia do lead na zona compartilhada;
- handoff bem-sucedido para Vendas.

### Metricas Closer

Metricas Closer futuras poderao ser ancoradas em:

- atuacao a partir da primeira reuniao agendada;
- conversao apos primeira reuniao realizada;
- progressao posterior na fase comercial exclusiva.

Esses impactos sao apenas mapeamento conceitual. Nao constituem implementacao.

## 7. Arquitetura Oficial

### Onde termina Prospeccao

Prospeccao termina oficialmente quando o lead sai da etapa `Primeira Reuniao Realizada` para qualquer etapa posterior de vendas.

### Onde comeca Vendas

Vendas comeca oficialmente no ponto em que o lead entra na etapa `Primeira Reuniao Agendada`.

### Regra Consolidada

Arquitetura oficial:

```text
Prospeccao exclusiva
  ate antes da primeira reuniao agendada

Zona compartilhada SDR + Closer
  primeira reuniao agendada
  primeira reuniao realizada

Vendas exclusiva
  qualquer etapa posterior a primeira reuniao realizada
```

### Leitura de Ownership

O ownership oficial passa a ter tres estados conceituais:

- ownership de Prospeccao;
- ownership compartilhado;
- ownership exclusivo de Vendas.

Isso protege a operacao contra duas distorcoes:

- transferir cedo demais;
- manter indefinidamente a ambiguidade de ownership.

## 8. Principios Arquiteturais Oficiais

Os principios abaixo passam a ser oficiais para o Pipeline Segregado:

### Principio 1 - Prospeccao e Vendas nao sao o mesmo dominio

Os dois pipeline respondem a objetivos diferentes e devem ser modelados como dominios operacionais distintos.

### Principio 2 - A primeira reuniao e zona de transicao, nao ruptura

O primeiro encontro cria sobreposicao controlada, e nao handoff binario imediato.

### Principio 3 - Visibilidade compartilhada nao significa ownership exclusivo

Durante a sobreposicao, ambos veem o lead, mas a exclusividade ainda nao foi estabelecida.

### Principio 4 - A exclusividade comercial nasce no avancar posterior

O que encerra a sobreposicao nao e o encontro em si, mas o avancar real apos ele.

### Principio 5 - Ownership deve seguir a etapa, nao interpretacao subjetiva

A transferencia precisa ser ancorada em marco arquitetural claro.

## 9. Nao Objetivos

Esta sprint nao autoriza:

- codigo;
- frontend;
- backend;
- banco;
- SQL;
- APIs;
- endpoints;
- Auth;
- RLS;
- Dashboard;
- Meu Dia;
- CRM;
- implementacao real de pipeline;
- filtros tecnicos;
- backlog executavel;
- commit;
- push.

## 10. Conclusao Arquitetural

O `Pipeline Segregado` passa a ser oficialmente definido como uma arquitetura de dois dominios operacionais com uma zona intermediaria de sobreposicao controlada.

A decisao central desta sprint e:

```text
O SDR nao entrega o lead no agendamento.
O Closer nao assume exclusividade na primeira reuniao.
A exclusividade nasce no avancar posterior.
```

Com isso, o EVOLV formaliza:

- onde comeca Prospeccao;
- onde comeca Vendas;
- onde os dois coexistem;
- quando a responsabilidade exclusiva muda de lado.

## Confirmacoes da Sprint

- Documento arquitetural criado.
- Apenas um arquivo novo criado.
- Nenhum arquivo de codigo alterado.
- Nenhum frontend alterado.
- Nenhum backend alterado.
- Nenhum banco alterado.
- Nenhuma API criada.
- Nenhuma implementacao de permissao criada.
- Nenhum commit executado.
- Nenhum push executado.
