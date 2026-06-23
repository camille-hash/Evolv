# UX-AUDIT-01 - Executive Information Density

## Status

Arquitetura / UX Audit

## Tipo

Auditoria

## Workspace

`C:\Projetos\Evolv-Auth`

## Branch

`main`

## Objetivo

Auditar a densidade executiva de informacao do EVOLV e identificar onde a leitura principal perde eficiencia conforme crescem:

- a base de leads;
- o historico operacional;
- o volume de artefatos;
- a necessidade de leitura executiva rapida.

Esta auditoria e exclusivamente analitica. Nao implementa funcionalidades, nao altera codigo, nao discute banco, APIs, Auth, RLS ou integracoes.

## Escopo Auditado

- Meu Dia
- Check Points
- Dashboard Executivo
- Pipeline Segregado
- Dossie Multicanal

## Referenciais Consolidados

Esta auditoria foi realizada em coerencia com os seguintes principios ja formalizados:

- Memoria de Relacionamento por camadas
- Timeline como visao resumida
- Resumo Executivo como sintese
- Regra oficial de escalabilidade:

```text
Ultimo Artefato
+
Historico Recolhivel
+
Visao Executiva
```

## Resumo Executivo

O EVOLV ja possui uma base arquitetural correta para leitura executiva, especialmente no Dossie Multicanal, onde `Notas`, `Simulacoes` e `Multi-Cotas` ja aplicam bem a logica de destaque do presente com historico recolhivel.

Os maiores riscos atuais nao estao no dominio ou na modelagem. Estao na superficie de leitura quando o volume cresce.

Os principais pontos de tensao observados foram:

- `Meu Dia` tende a escalar como lista expandida por bloco, com perda rapida de priorizacao quando o volume sobe;
- `Check Points` escalam mal em altura, tanto no `Meu Dia` quanto no `Dossie`, por repeticao de chips e pouco agrupamento executivo;
- `Dashboard Executivo` perde densidade quando a distribuicao por etapas cresce, porque a leitura continua linear e detalhista;
- `Pipeline Segregado` esta arquiteturalmente correto, mas ainda exige leitura horizontal ampla e repetitiva em cenarios com muitas oportunidades;
- `Dossie Multicanal` esta majoritariamente consistente com a regra de escalabilidade, mas `Timeline` e `Check Points` ainda sao os pontos mais sujeitos a crescer sem a mesma disciplina visual aplicada a `Notas`, `Simulacoes` e `Multi-Cotas`.

## Leitura por Dominio

### Meu Dia

#### Comportamento com 10 registros

A experiencia e legivel. Os quatro blocos principais ainda cabem em uma leitura operacional razoavel:

- tarefas vencidas;
- tarefas do dia;
- Check Points;
- proximas acoes.

#### Comportamento com 100 registros

A superficie deixa de ser executiva e passa a ser predominantemente listativa:

- cada bloco cresce verticalmente;
- o usuario precisa rolar longas listas para comparar urgencias;
- itens do topo passam a dominar a atencao, mesmo quando nao sao os mais decisivos.

#### Comportamento com 1.000 registros

A estrutura atual colapsa como ferramenta de leitura executiva:

- listas extensas competem entre si;
- a separacao por categoria continua existindo, mas deixa de ser suficiente para priorizacao;
- o custo de encontrar o que realmente importa sobe demais.

### Check Points

#### Comportamento com dezenas de leads

Ainda permanece compreensivel, especialmente quando ha poucos sinais por lead.

#### Comportamento com centenas de leads

Os `Check Points` passam a consumir altura demais:

- cada lead pode carregar varios chips;
- a repeticao visual e alta;
- a leitura vira inventario de badges, e nao sintese de decisao.

#### Comportamento com milhares de leads

O problema deixa de ser apenas visual. Passa a ser cognitivo:

- o usuario recebe excesso de micro-sinais;
- o volume nao comunica rapidamente relevancia relativa;
- a memoria visual da tela se perde em repeticao.

### Dashboard Executivo

#### Temperaturas

A distribuicao e clara com poucos grupos, porque o dominio possui apenas tres categorias.

Risco residual:

- os numeros principais continuam utilitarios;
- a parte mais fraca esta menos em `Temperaturas` e mais no equilibrio entre indicadores e demais distribuicoes.

#### Distribuicao por Etapas

E o ponto de pior escalabilidade do dashboard:

- cada etapa vira uma linha;
- o crescimento de etapas ou fragmentacao da base alonga demais a leitura;
- a visao deixa de ser executiva e se aproxima de uma listagem analitica.

#### Indicadores

Os indicadores principais sao legiveis, mas tendem a competir em horizontalidade e hierarquia:

- metricas diferentes recebem peso visual parecido;
- faltam camadas mais nitidas entre indicador critico, indicador contextual e indicador de apoio;
- com crescimento da base, numeros agregados ficam menos autoexplicativos.

### Pipeline Segregado

#### Leitura atual

A segregacao esta correta e inteligivel:

- `Prospeccao` fica visivel sem misturar etapas exclusivas de `Vendas`;
- a `Zona Compartilhada` esta marcada;
- `Vendas` preserva sua leitura propria.

#### Risco de escala

O problema nao e a arquitetura. E a largura de leitura:

- o kanban continua dependente de scroll horizontal;
- cada coluna mantem largura fixa;
- o aumento do numero de leads por etapa multiplica o custo de leitura por comparacao lateral.

#### Zona Compartilhada

O conceito esta visualmente bem definido, mas introduz repeticao de contexto:

- aparece como faixa propria;
- obriga leitura adicional entre fronteira e colunas;
- em uso intensivo, continua exigindo muita varredura horizontal.

### Dossie Multicanal

#### Consistencia com a regra oficial

O Dossie esta, em geral, consistente com a regra:

```text
Ultimo Artefato
+
Historico Recolhivel
+
Visao Executiva
```

Consistencias observadas:

- `Proxima acao` recebe destaque;
- `Notas` exibem a ultima nota e recolhem historico;
- `Simulacoes` destacam a ultima simulacao e recolhem historico;
- `Multi-Cotas` destacam o ultimo estudo e recolhem historico;
- placeholders de `Comunicacoes`, `Reunioes` e `Ligacoes` permanecem compactos.

#### Pontos de tensao

Os riscos de densidade estao concentrados em:

- `Check Points`, que seguem todos expandidos quando existem varios sinais;
- `Timeline`, que ainda depende de expansao total do bloco para aprofundamento;
- combinacao entre varias secoes bem-intencionadas, mas empilhadas ao longo de uma mesma pagina extensa.

## Top 10 Problemas Encontrados

### 1. Meu Dia escala como quatro listas expandidas paralelas

- Problema: a separacao em blocos melhora a organizacao inicial, mas cada bloco continua crescendo como lista aberta.
- Impacto: com 100 ou 1.000 registros, a leitura deixa de ser executiva e vira navegacao por volume.
- Complexidade: Media
- Prioridade: Critico

### 2. Tarefas vencidas e tarefas do dia perdem priorizacao interna quando o volume sobe

- Problema: dentro do mesmo bloco, a superficie cresce linearmente e exige leitura item a item.
- Impacto: o usuario ve a categoria correta, mas nao necessariamente o item mais decisivo primeiro.
- Complexidade: Media
- Prioridade: Alto

### 3. Check Points no Meu Dia explodem verticalmente por lead

- Problema: cada lead pode exibir varios chips simultaneamente.
- Impacto: a area de `Check Points` consome altura desproporcional e reduz a densidade util da tela.
- Complexidade: Baixa
- Prioridade: Alto

### 4. Check Points no Dossie ainda operam como lista expandida de sinais

- Problema: o bloco comunica bem poucos sinais, mas escala mal quando o lead acumula muitos `Check Points`.
- Impacto: historico de sinais e estado atual podem competir visualmente no mesmo nivel.
- Complexidade: Media
- Prioridade: Alto

### 5. Distribuicao por Etapa no Dashboard Executivo cresce como lista analitica

- Problema: cada etapa vira uma linha com barra.
- Impacto: conforme a base se fragmenta, o painel perde sintese e aumenta o tempo de leitura.
- Complexidade: Media
- Prioridade: Alto

### 6. Dashboard Executivo nao distingue com nitidez suficiente metricas criticas de metricas contextuais

- Problema: indicadores principais e secundarios recebem pesos proximos.
- Impacto: a leitura inicial pode ficar eficiente para consulta, mas nao para decisao imediata.
- Complexidade: Media
- Prioridade: Medio

### 7. Pipeline Segregado continua caro em largura horizontal

- Problema: a segregacao esta correta, mas a navegacao permanece dependente de muitas colunas lado a lado.
- Impacto: comparar estagios, volumes e urgencias exige varredura lateral prolongada.
- Complexidade: Media
- Prioridade: Alto

### 8. Zona Compartilhada adiciona contexto correto, mas aumenta a carga de leitura no Kanban

- Problema: a fronteira e necessaria, porem adiciona mais um agrupamento que o usuario precisa interpretar continuamente.
- Impacto: o modelo continua correto, mas o custo cognitivo cresce em cenarios de alta ocupacao.
- Complexidade: Baixa
- Prioridade: Medio

### 9. CompactLeadCard concentra pouco contexto para cenarios de alta densidade

- Problema: cada card resume nome, temperatura, valor e proxima acao, mas com alta ocupacao isso ainda exige abrir ou comparar demais.
- Impacto: a coluna fica densa em quantidade, mas nao necessariamente em capacidade de decisao.
- Complexidade: Media
- Prioridade: Medio

### 10. Timeline do Dossie ainda depende de expansao ampla do bloco

- Problema: a `Timeline` permanece resumida em conceito, mas a experiencia de leitura ainda e binaria entre fechado e aberto.
- Impacto: com crescimento historico, o aprofundamento pode voltar a competir com a leitura principal da pagina.
- Complexidade: Media
- Prioridade: Medio

## Priorizacao Recomendada

### Prioridade Critica

- repensar a escalabilidade visual do `Meu Dia` como superficie executiva;
- proteger a leitura contra crescimento linear de listas por categoria.

### Prioridade Alta

- reduzir o custo vertical de `Check Points`;
- proteger o `Dashboard Executivo` contra excesso de linhas na distribuicao por etapa;
- reduzir o custo horizontal do `Pipeline Segregado`.

### Prioridade Media

- refinar hierarquia entre indicadores principais e secundarios do dashboard;
- elevar a densidade decisoria dos cards do pipeline;
- manter a `Timeline` do Dossie coerente com a mesma disciplina de escalabilidade aplicada a `Notas`, `Simulacoes` e `Multi-Cotas`.

### Prioridade Baixa

- nao foram encontrados, nesta auditoria, problemas de prioridade baixa com relevancia suficiente para entrar no top 10.

## Validacao do Dossie Multicanal

### Consistente

- `Notas`
- `Simulacoes`
- `Multi-Cotas`
- `Proxima acao`
- placeholders dos modulos futuros

### Parcialmente consistente sob crescimento

- `Check Points`
- `Timeline`

### Conclusao

O Dossie Multicanal esta mais proximo do padrao executivo desejado do que os demais dominios auditados. O principal risco atual nao e estrutural. E a permanencia de alguns blocos ainda expandidos demais quando o volume cresce.

## Conclusao Geral

O EVOLV ja possui uma direcao arquitetural correta para leitura executiva. O risco principal agora e permitir que superficies operacionais importantes escalem por acumulacao visual em vez de escalar por hierarquia.

Em termos consolidados:

- `Meu Dia` e o ponto mais fragil da experiencia atual sob crescimento;
- `Check Points` sao o elemento com pior relacao entre valor de sinal e consumo de espaco;
- `Dashboard Executivo` precisa proteger sintese contra fragmentacao;
- `Pipeline Segregado` esta conceitualmente correto, mas ainda exige leitura longa em largura;
- `Dossie Multicanal` e o dominio mais aderente ao principio oficial, embora ainda tenha pontos de tensao em `Timeline` e `Check Points`.

O diagnostico central desta auditoria e:

```text
O problema principal do EVOLV nao e falta de organizacao.
E o risco de superfícies corretas crescerem como inventario visual, em vez de crescerem como leitura executiva.
```
