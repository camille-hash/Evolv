# Sprint 103A.55 - Dossie Multicanal

## Domain Definition

Status: Arquitetura  
Tipo: Documental  
Workspace: `C:\Projetos\Evolv-Auth`  
Branch: `main`

## Objetivo

Definir oficialmente o dominio do Dossie Multicanal do EVOLV.

Esta sprint nao implementa produto, nao altera codigo, nao altera banco, nao cria frontend, nao cria backend, nao cria integracoes e nao aprova backlog executavel.

O objetivo exclusivo e definir:

- abas;
- navegacao;
- hierarquia;
- responsabilidades;
- limites entre modulos;
- criterios arquiteturais para crescimento futuro.

## Contexto Arquitetural

A Sprint 103A.54 definiu a Timeline Unificada de Relacionamento como memoria operacional resumida do relacionamento.

Durante a revisao arquitetural, a decisao de dominio evoluiu:

```text
A Timeline nao e o produto principal.
```

O produto principal passa a ser:

```text
Dossie Multicanal
```

A Timeline permanece importante, mas passa a ser uma das visoes do Dossie. Ela responde ao recorte transversal e recente:

```text
O que aconteceu recentemente?
```

Os demais modulos do Dossie respondem por canal ou area:

```text
O que aconteceu neste canal?
```

## Diagnostico Atual

O EVOLV ja possui uma base operacional consolidada:

- CRM;
- Leads;
- Dossie Executivo Vivo;
- Notas;
- Tasks;
- Timeline Operacional;
- Simulacoes Comerciais;
- Multi-Cotas;
- PDFs derivados;
- Check Points;
- Meu Dia;
- Dashboard Executivo.

Esses recursos organizam a operacao interna do lead. Porem, a memoria do relacionamento ainda nao esta organizada por canais.

Hoje o usuario pode encontrar eventos internos na Timeline, mas a Timeline nao deve ser obrigada a carregar todo o peso de investigacao, busca, anexos, transcricoes, threads e historicos completos.

O Dossie Multicanal resolve essa separacao: a Timeline mostra a leitura transversal; os canais mostram profundidade.

## Definicao de Dominio

O Dossie Multicanal e a area oficial de leitura, contexto e investigacao do relacionamento de um lead.

Ele nao e uma caixa de entrada.

Ele nao e um chat.

Ele nao e uma agenda paralela.

Ele nao e um dashboard.

Ele e a memoria organizada do relacionamento comercial por lead.

## Hierarquia Oficial

A hierarquia oficial recomendada para o dominio e:

```text
Lead
 └ Dossie Multicanal
      ├ Resumo Executivo
      ├ Timeline
      ├ WhatsApp
      ├ E-mail
      ├ Reunioes
      ├ Ligacoes
      ├ Simulacoes
      └ Tarefas e Notas
```

Esta hierarquia e validada como modelo conceitual V1.

Evolucao possivel: no futuro, `Tarefas` e `Notas` podem se tornar areas separadas se o volume operacional justificar. Para V1 conceitual, mante-las juntas preserva clareza: uma registra memoria operacional; a outra conduz execucao.

## Responsabilidades por Area

### Resumo Executivo

Responsabilidade:

- consolidar a situacao atual do relacionamento;
- destacar proximos passos;
- apresentar estado comercial do lead;
- sintetizar riscos, pendencias e oportunidades;
- evitar que o usuario precise abrir todos os canais para entender o momento atual.

O Resumo Executivo deve responder:

```text
Qual e o estado deste relacionamento agora?
```

Conteudos conceituais possiveis:

- proxima acao pendente;
- tarefa vencida ou de hoje;
- temperatura manual;
- etapa atual;
- ultimo contato relevante;
- ultimo evento de simulacao;
- ultimos sinais relevantes do relacionamento;
- alerta de ausencia de proximo passo.

Nao deve conter historico completo de mensagens, emails, ligacoes ou transcricoes.

### Timeline

Responsabilidade:

- exibir eventos resumidos;
- oferecer visao transversal;
- ordenar acontecimentos relevantes por tempo;
- navegar para canais ou detalhes quando necessario;
- preservar a leitura rapida do relacionamento.

A Timeline deve responder:

```text
O que aconteceu recentemente?
```

Ela nao deve responder:

```text
Mostre todo o historico deste canal.
```

Esse segundo tipo de pergunta pertence as abas especificas.

### WhatsApp

Responsabilidade:

- historico completo de conversas WhatsApp, quando futuramente integrado;
- mensagens enviadas e recebidas;
- anexos;
- busca;
- agrupamento por conversa ou contato;
- leitura sob demanda do historico completo.

O WhatsApp deve responder:

```text
O que aconteceu no WhatsApp com este lead?
```

A Timeline pode mostrar o resumo:

```text
WhatsApp - 42 mensagens - ultima ha 3 horas
```

A aba WhatsApp deve conter a profundidade.

### E-mail

Responsabilidade:

- threads;
- mensagens enviadas e recebidas;
- anexos;
- busca;
- assuntos;
- participantes;
- leitura sob demanda de conversas completas.

O E-mail deve responder:

```text
O que aconteceu por email com este lead?
```

A Timeline pode mostrar apenas evento ou resumo relevante. A aba E-mail deve permitir leitura da thread completa.

### Reunioes

Responsabilidade:

- agenda de reunioes relacionadas ao lead;
- reunioes realizadas;
- duracao;
- participantes;
- resumo;
- transcricao, quando existir e estiver autorizada;
- status da reuniao.

Reunioes devem responder:

```text
Quais encontros aconteceram ou estao planejados com este lead?
```

O detalhe completo de uma reuniao nao deve ser despejado na Timeline. A Timeline aponta; a aba Reunioes aprofunda.

### Ligacoes

Responsabilidade:

- chamadas realizadas;
- chamadas recebidas;
- duracao;
- resultado;
- observacoes;
- historico sob demanda.

Ligacoes devem responder:

```text
Quais contatos por voz ocorreram com este lead?
```

Nao devem ser confundidas com notas manuais. Uma nota pode registrar contexto; uma ligacao e um evento de canal.

### Simulacoes

Responsabilidade:

- Simulacao Comercial;
- estudos Multi-Cotas;
- PDFs;
- historico;
- leitura de snapshots;
- artefatos derivados.

Simulacoes devem responder:

```text
Quais estudos e propostas foram apresentados ou preparados para este lead?
```

Este modulo continua usando a arquitetura ja consolidada de simulacoes vinculadas ao lead e snapshots historicos.

### Tarefas e Notas

Responsabilidade:

- execucao;
- acompanhamento;
- registro operacional;
- proxima acao;
- tarefas pendentes, concluidas e canceladas;
- notas internas do relacionamento;
- memoria manual do consultor.

Tarefas e Notas devem responder:

```text
O que precisamos fazer e o que registramos internamente?
```

Regra de dominio preservada:

```text
Notas lembram.
Tarefas executam.
Timeline audita.
Dossie organiza.
```

## Navegacao Conceitual

Sem desenhar UI, a navegacao deve obedecer uma ordem de intencao:

1. Entender o estado atual.
2. Ver o que aconteceu recentemente.
3. Aprofundar por canal.
4. Executar ou registrar proximos passos.

### Areas Principais

As areas principais sao:

- Resumo Executivo;
- Timeline;
- Tarefas e Notas;
- Simulacoes.

Motivo: elas sustentam a operacao atual ja consolidada do EVOLV e respondem diretamente a gestao do lead.

### Areas de Canal

As areas de canal sao:

- WhatsApp;
- E-mail;
- Reunioes;
- Ligacoes.

Motivo: elas exigem integracoes futuras e historicos potencialmente volumosos. Devem ser acessadas quando o usuario precisa investigar um canal especifico.

### Informacoes que aparecem primeiro

O primeiro nivel do Dossie deve priorizar:

- situacao atual;
- proxima acao;
- alertas operacionais;
- ultima interacao relevante;
- ultimos eventos transversais;
- atalhos para canais com atividade recente.

Nao deve priorizar:

- listas completas de mensagens;
- corpos completos de email;
- anexos;
- transcricoes integrais;
- logs tecnicos;
- historicos expandidos por padrao.

## Relacao Entre Dossie e Timeline

A Timeline e uma visao dentro do Dossie Multicanal.

Ela nao e o indice completo do relacionamento.

Ela deve funcionar como mapa cronologico resumido, apontando para aprofundamento quando necessario.

Exemplo:

```text
Timeline:
Email recebido - Assunto: Documentacao - ha 2 dias
[Abrir no E-mail]

Aba E-mail:
Thread completa, participantes, anexos e mensagens.
```

```text
Timeline:
WhatsApp - ultima mensagem ha 3 horas
[Abrir no WhatsApp]

Aba WhatsApp:
Historico completo da conversa.
```

## Estrategia de Armazenamento Conceitual

O Dossie Multicanal nao deve criar uma unica fonte gigante para todos os dados.

Cada canal deve preservar sua propria natureza:

- mensagens pertencem ao historico de mensagens;
- emails pertencem a threads de email;
- reunioes pertencem a agenda/reunioes;
- ligacoes pertencem a historico de chamadas;
- tarefas pertencem a `crm_tasks`;
- notas pertencem a notas;
- simulacoes pertencem a simulacoes e snapshots;
- Timeline deriva resumos e eventos relevantes.

A arquitetura recomendada e:

```text
Fontes por dominio/canal
        ↓
Resumo e indices operacionais
        ↓
Dossie Multicanal
        ↓
Timeline como visao transversal
```

## Escalabilidade

### Crescimento de mensagens

Mensagens podem crescer rapidamente. A aba WhatsApp deve ser responsavel por historico, busca e paginacao futura.

A Timeline deve receber apenas resumos ou eventos relevantes, nunca cada mensagem como item principal.

### Crescimento de emails

Emails possuem threads, anexos e corpos longos. A aba E-mail deve ser responsavel por busca, agrupamento e leitura completa.

A Timeline deve indicar eventos importantes e ultimas interacoes.

### Crescimento de reunioes

Reunioes podem gerar transcricoes extensas. A aba Reunioes deve ser responsavel por detalhe, resumo e transcricao sob demanda.

A Timeline deve indicar reuniao criada, realizada ou relevante.

### Crescimento de anexos

Anexos nao devem ser duplicados como conteudo de Timeline.

O Dossie deve apontar para anexos por canal ou fonte, com controle futuro de permissao, armazenamento e retencao.

### Retencao e performance

Retencao, arquivamento e compactacao exigem politica propria futura.

Este documento nao aprova armazenamento, infraestrutura ou politica de retencao. Apenas define que historicos completos pertencem aos modulos de canal, nao a Timeline principal.

## Roadmap Futuro Nao Executavel

As fases abaixo sao temas arquiteturais possiveis. Nao sao backlog aprovado, nao sao sprints aprovadas e nao autorizam implementacao.

### Fase Conceitual 1 - Estrutura do Dossie Multicanal

Tema arquitetural para organizar responsabilidades internas entre Resumo Executivo, Timeline, canais e modulos operacionais.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 2 - Canais Externos

Tema arquitetural para WhatsApp, E-mail, Reunioes e Ligacoes como areas de profundidade.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 3 - Busca Multicanal

Tema arquitetural para busca por canal, nao para busca global indiscriminada.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 4 - Anexos e Transcricoes

Tema arquitetural para arquivos, audios, transcricoes e historicos extensos.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

### Fase Conceitual 5 - Sintese Executiva

Tema arquitetural para melhorar o Resumo Executivo com dados ja disponiveis.

Status: nao aprovado, nao priorizado, nao autorizado para implementacao.

## Riscos Arquiteturais

### Risco 1 - Timeline virar produto principal

Se a Timeline tentar responder todas as perguntas, ela ficara pesada, confusa e pouco operacional.

Mitigacao conceitual: Timeline resume; abas aprofundam.

### Risco 2 - Dossie virar dashboard

O Dossie Multicanal nao deve competir com o Dashboard Executivo. O Dossie e por lead; o dashboard e gerencial.

### Risco 3 - Canais sem fronteira

Misturar mensagens, emails, notas e tarefas em uma unica lista reduz rastreabilidade.

Mitigacao conceitual: cada canal responde pelo seu historico completo.

### Risco 4 - Implementar integracoes antes do dominio

Integracoes antes da definicao de responsabilidades podem gerar acoplamento e retrabalho.

### Risco 5 - Historico completo expandido por padrao

Historicos longos prejudicam leitura. Devem ser sob demanda.

## Nao Objetivos

Esta sprint nao autoriza:

- alteracao de codigo;
- alteracao de banco;
- SQL;
- migrations;
- APIs;
- endpoints;
- integracoes;
- componentes;
- telas;
- wireframes;
- commits;
- push;
- IA;
- score;
- automacoes;
- inbox;
- chat;
- envio de mensagem;
- OAuth;
- webhooks;
- backlog executavel.

## Conclusao Arquitetural

O Dossie Multicanal passa a ser o dominio principal de memoria do relacionamento no EVOLV.

A Timeline continua relevante, mas muda de posicao conceitual:

```text
Antes:
Timeline como centro da memoria futura.

Depois:
Dossie Multicanal como produto principal.
Timeline como visao transversal e resumida dentro do Dossie.
```

Essa separacao protege a clareza operacional:

- Resumo Executivo mostra o estado atual.
- Timeline mostra o que aconteceu recentemente.
- Canais mostram o que aconteceu naquele meio.
- Simulacoes preservam estudos e artefatos.
- Tarefas e Notas sustentam execucao e memoria interna.

## Confirmacoes da Sprint

- Documento arquitetural criado.
- Nenhum codigo implementado.
- Nenhum arquivo existente alterado.
- Nenhuma tela criada.
- Nenhum frontend alterado.
- Nenhum backend alterado.
- Nenhuma API criada.
- Nenhum endpoint criado.
- Nenhuma integracao criada.
- Nenhum SQL criado.
- Nenhuma migration criada.
- Nenhuma tabela criada.
- Nenhum commit executado.
- Nenhum push executado.
