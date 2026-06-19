# Sprint 103A.27 - Lead-Centric Simulation Architecture

## Objetivo

Definir a arquitetura oficial de simulacoes do EVOLV a partir da decisao estrategica de Camille e Bruno:

```text
Toda simulacao deve obrigatoriamente pertencer a um lead.
```

Esta sprint e exclusivamente arquitetural. Nenhum codigo, SQL, schema, UI, endpoint, service ou repository foi implementado.

## Decisao oficial

O EVOLV passa a adotar o lead como entidade central de toda producao comercial.

Nao devem existir:

- simulacoes orfas;
- simulacoes Multi-Cotas orfas;
- propostas orfas;
- PDFs orfaos;
- artefatos comerciais sem rastreabilidade para um lead.

## Arquitetura proposta

```text
Lead
|- Simulacoes Comerciais
|- Simulacoes Multi-Cotas
|- Propostas derivadas
|- PDFs gerados
|- Timeline Operacional
`- Historico Comercial
```

O lead deve ser o ponto de entrada operacional, historico e analitico.

## Entidades identificadas

### Lead

Entidade central.

Responsabilidades:

- concentrar relacionamento comercial;
- possuir simulacoes;
- possuir propostas;
- possuir PDFs derivados;
- alimentar timeline operacional;
- permitir metricas futuras por cliente, closer, estrategia e credito.

### Simulacao

Entidade auditavel.

Representa uma fotografia tecnica e comercial gerada para um lead.

Campos conceituais futuros:

- `id`;
- `lead_id`;
- `organization_id`;
- `simulation_type`;
- `created_by`;
- `created_at`;
- `technical_input`;
- `calculation_snapshot`;
- `presentation_snapshot`;
- `status`;
- `presented_at`;
- `presented_by`;
- `source`;
- `version`.

Tipos iniciais recomendados:

- `commercial`;
- `multi_cotas`.

### Simulacao Comercial

Tipo de simulacao focado em uma estrutura de carta/proposta individual.

Deve preservar:

- credito base;
- credito atualizado;
- credito comercial;
- lance;
- seguro;
- INCC;
- mes de contemplacao;
- parcelas;
- investimento;
- lucro estimado;
- ROI;
- cenario usado;
- administradora, quando aplicavel.

### Simulacao Multi-Cotas

Tipo especial de simulacao.

Deve ser armazenada como simulacao propria, nao como modulo solto.

Motivos:

- possui parametros tecnicos diferentes;
- possui varias cartas;
- possui timeline e estrategia propria;
- pode gerar PDF proprio;
- pode originar propostas especificas;
- precisa ser auditavel no historico do lead.

Estrutura conceitual:

```text
simulation_type = multi_cotas
technical_input.cards[]
calculation_snapshot.cards[]
presentation_snapshot.summary
```

Cada carta pode conter:

- posicao;
- valor original;
- mes de contemplacao;
- mes de saque;
- credito atualizado;
- credito comercial;
- valor futuro;
- ganho estimado;
- ROI estimado;
- premissas INCC e valorizacao aplicadas.

### Proposta

Artefato derivado de uma simulacao.

Nao deve existir proposta sem:

- lead;
- simulacao de origem;
- usuario gerador;
- timestamp.

Campos conceituais futuros:

- `id`;
- `lead_id`;
- `simulation_id`;
- `organization_id`;
- `proposal_type`;
- `created_by`;
- `created_at`;
- `commercial_snapshot`;
- `status`.

### PDF

Artefato derivado de simulacao ou proposta.

Nao deve existir PDF sem:

- lead;
- simulacao de origem ou proposta de origem;
- usuario gerador;
- timestamp.

Campos conceituais futuros:

- `id`;
- `lead_id`;
- `simulation_id`;
- `proposal_id`;
- `organization_id`;
- `file_name`;
- `file_kind`;
- `generated_by`;
- `generated_at`;
- `sent_at`;
- `sent_by`;
- `storage_path`, se futuramente houver armazenamento;
- `metadata_snapshot`.

### Timeline Operacional

A timeline deve passar a considerar eventos derivados do ciclo de simulacao.

Eventos futuros recomendados:

- `simulation_created`;
- `simulation_presented`;
- `proposal_generated`;
- `pdf_generated`;
- `pdf_sent`.

Esses eventos nao devem ser implementados nesta sprint.

## Decisoes tomadas

### 1. Simulacao sempre pertence a lead

Toda simulacao futura deve exigir `lead_id`.

Ferramentas soltas podem continuar existindo apenas como etapa transitoria, mas a arquitetura-alvo nao permite artefatos finais orfaos.

### 2. Multi-Cotas deve ser tipo de simulacao

Multi-Cotas nao deve virar entidade paralela desconectada do CRM.

Recomendacao:

```text
crm_simulations.simulation_type = 'multi_cotas'
```

com payloads estruturados para inputs e snapshots.

### 3. PDF e proposta sao derivados

PDF e proposta nao sao fonte primaria da verdade.

A fonte primaria deve ser:

```text
lead + simulation + snapshot
```

PDF e proposta apenas materializam uma versao comercial daquele estado.

### 4. Snapshots sao obrigatorios

Simulacoes precisam preservar os parametros usados no momento da criacao.

Isso evita que mudancas futuras na engine alterem a leitura historica de uma simulacao antiga.

### 5. Auditoria deve ser automatica

Criacao, apresentacao, geracao de PDF e envio devem registrar:

- quem fez;
- quando fez;
- qual lead;
- qual simulacao;
- qual proposta/PDF, se houver.

### 6. Eventos de timeline devem ser derivados server-side

A timeline ja caminha para um read model derivado. Simulacoes e artefatos devem entrar nesse modelo sem exigir event store no v1.

## Estrutura conceitual de dados futura

### Tabela conceitual: `crm_simulations`

Objetivo:

Armazenar simulacoes comerciais e Multi-Cotas vinculadas ao lead.

Campos conceituais:

- `id`;
- `organization_id`;
- `lead_id`;
- `simulation_type`;
- `title`;
- `technical_input`;
- `calculation_snapshot`;
- `presentation_snapshot`;
- `status`;
- `created_by`;
- `created_at`;
- `updated_at`;
- `presented_at`;
- `presented_by`;

### Tabela conceitual: `crm_proposals`

Objetivo:

Armazenar propostas derivadas de simulacoes.

Campos conceituais:

- `id`;
- `organization_id`;
- `lead_id`;
- `simulation_id`;
- `proposal_type`;
- `title`;
- `commercial_snapshot`;
- `status`;
- `created_by`;
- `created_at`;

### Tabela conceitual: `crm_generated_documents`

Objetivo:

Registrar PDFs e documentos comerciais gerados.

Campos conceituais:

- `id`;
- `organization_id`;
- `lead_id`;
- `simulation_id`;
- `proposal_id`;
- `document_type`;
- `file_name`;
- `storage_path`;
- `generated_by`;
- `generated_at`;
- `sent_by`;
- `sent_at`;
- `metadata_snapshot`.

## Impacto por modulo

### Simulacao Comercial

Estado atual:

- possui integracao parcial com lead;
- ainda pode operar como ferramenta de simulacao.

Arquitetura-alvo:

- toda simulacao salva ou proposta gerada deve exigir lead;
- snapshots devem substituir dependencia exclusiva de localStorage.

### Multi-Cotas

Estado atual:

- ferramenta operacional separada;
- usa localStorage;
- nao possui vinculo obrigatorio com lead.

Arquitetura-alvo:

- Multi-Cotas vira `simulation_type = multi_cotas`;
- cada estrategia Multi-Cotas pertence a um lead;
- PDFs e propostas Multi-Cotas derivam dessa simulacao.

### PDFs

Estado atual:

- PDFs podem ser gerados como artefato operacional da tela.

Arquitetura-alvo:

- PDF deve registrar origem;
- PDF deve apontar para lead e simulacao;
- envio futuro deve gerar evento de timeline.

### Propostas

Estado atual:

- propostas derivadas existem em fluxo parcial.

Arquitetura-alvo:

- proposta sempre aponta para lead e simulacao;
- proposta deve preservar snapshot comercial;
- proposta deve alimentar timeline e metricas de conversao.

## Conversion analytics futura

A arquitetura deve permitir analises por:

- closer;
- lead;
- organizacao;
- credito comercial;
- tipo de simulacao;
- tipo de estrategia;
- proposta gerada;
- PDF gerado;
- PDF enviado;
- simulacao apresentada;
- conversao para venda.

Metricas futuras possiveis:

- simulacoes por closer;
- propostas por lead;
- taxa de proposta gerada apos simulacao;
- taxa de PDF enviado;
- tempo entre simulacao criada e proposta enviada;
- credito medio por tipo de estrategia;
- conversao por tipo de simulacao.

## Riscos identificados

### Risco 1 — LocalStorage como fonte historica

LocalStorage e util para prototipo, mas nao e fonte auditavel.

Mitigacao:

Migrar gradualmente simulacoes relevantes para camada server-side vinculada ao lead.

### Risco 2 — Multi-Cotas como ilha

Se Multi-Cotas permanecer isolado, perde rastreabilidade comercial.

Mitigacao:

Implementar vinculo obrigatorio com lead antes de PDF/proposta Multi-Cotas definitiva.

### Risco 3 — Mudanca de engine quebrar historico

Se apenas parametros forem salvos, simulacoes antigas podem mudar de leitura apos alteracoes de regra.

Mitigacao:

Salvar snapshots de calculo e apresentacao.

### Risco 4 — Artefatos duplicados sem origem

PDFs e propostas sem origem clara criam ruido na timeline.

Mitigacao:

Exigir `simulation_id` para propostas e documentos derivados.

### Risco 5 — Escopo grande demais

Lead-centric simulation impacta banco, APIs, UI, timeline e PDF.

Mitigacao:

Dividir implementacao em sprints pequenas e reversiveis.

## Roadmap sugerido

### Sprint 103A.28 — Lead-Centric Simulation Schema Design

Desenhar schema futuro para:

- `crm_simulations`;
- `crm_proposals`;
- `crm_generated_documents`;
- RLS organization-scoped;
- validacao;
- rollback.

Sem executar SQL.

### Sprint 103A.29 — Lead-Centric Simulation SQL Package Design

Desenhar pacote SQL futuro, ainda sem criar apply real.

### Sprint 103A.30 — Lead-Centric Simulation SQL Package Creation

Criar apply, validation e rollback.

Sem executar SQL.

### Sprint 103A.31 — Controlled Apply

Execucao manual controlada, se aprovada.

### Sprint 103A.32 — Server-Side Simulation Repository

Criar service/API server-side para salvar e listar simulacoes por lead.

### Sprint 103A.33 — Commercial Simulation Lead Binding

Remover fluxo de simulacao salva orfa na Simulacao Comercial.

### Sprint 103A.34 — Multi-Cotas Lead Binding

Vincular Multi-Cotas ao lead como simulacao propria.

### Sprint 103A.35 — Timeline Events for Simulations

Adicionar ao read model da timeline:

- `simulation_created`;
- `proposal_generated`;
- `pdf_generated`;
- `pdf_sent`.

## Fora do escopo desta sprint

- codigo;
- SQL;
- migrations;
- tabelas;
- endpoints;
- repositories;
- services;
- UI;
- banco;
- Auth;
- RLS;
- policies;
- CRM;
- Timeline;
- Simulador;
- Multi-Cotas;
- PDF.

## Conclusao

A arquitetura oficial recomendada para o EVOLV e lead-centric:

```text
Lead -> Simulacao -> Proposta/PDF -> Timeline -> Metricas
```

Simulacao Comercial e Multi-Cotas devem ser tratadas como tipos de simulacao vinculados ao lead, com snapshots auditaveis. PDF e proposta devem ser artefatos derivados, nunca fontes primarias nem registros orfaos.

## Recomendacao para Sprint 103A.28

Avancar para `Lead-Centric Simulation Schema Design`, ainda sem implementacao, para transformar esta arquitetura em desenho formal de schema, RLS, validacao e rollback.
