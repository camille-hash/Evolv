# Sprint 103A.28 - Lead-Centric Simulation Schema Design

## Objetivo

Desenhar o schema lead-centric de simulacoes do EVOLV, seguindo a decisao oficial:

```text
Lead -> Simulacao -> Proposta/PDF -> Timeline -> Metricas
```

Esta sprint e exclusivamente de design de schema. Nenhum SQL, migration, tabela, policy, endpoint, repository, service, componente ou alteracao funcional foi criado.

## Contexto

A Sprint 103A.27 definiu que toda simulacao futura deve pertencer obrigatoriamente a um lead.

O modelo atual ainda possui camadas parcialmente isoladas:

- Simulacao Comercial com integracao parcial ao lead;
- Multi-Cotas como ferramenta operacional separada;
- PDFs e propostas gerados como artefatos ainda nao plenamente auditaveis;
- historico dependente de snapshots locais em alguns fluxos.

## Estrategia de tabelas avaliada

### Opcao A - Tabela unica `crm_lead_simulations`

Uma tabela unica armazena simulacoes comerciais e Multi-Cotas, diferenciadas por `simulation_type`, com snapshots JSONB para payloads especificos.

Vantagens:

- implementacao V1 mais simples;
- uma lista unica de simulacoes por lead;
- timeline e metricas mais simples;
- evita duplicidade de RLS e grants;
- permite evoluir sem criar tabelas prematuras;
- acomoda payloads diferentes de Simulacao Comercial e Multi-Cotas.

Riscos:

- JSONB pode virar deposito amorfo se nao houver contrato de payload;
- consultas profundas em payload ficam menos eficientes;
- exige summary fields bem escolhidos para filtros e metricas.

### Opcao B - Tabelas separadas por tipo

Exemplo:

- `crm_commercial_simulations`;
- `crm_multi_cotas_simulations`.

Vantagens:

- schemas especificos e mais rigidos;
- consultas tecnicas por tipo podem ficar mais claras.

Riscos:

- duplica RLS, validation e rollback;
- dificulta timeline unificada;
- dificulta listagem geral de simulacoes por lead;
- aumenta custo de implementacao antes do dominio estabilizar.

### Opcao C - Tabela base + tabelas filhas

Exemplo:

- `crm_lead_simulations`;
- `crm_commercial_simulation_details`;
- `crm_multi_cotas_simulation_details`.

Vantagens:

- base auditavel comum;
- detalhes relacionais por tipo.

Riscos:

- complexidade prematura para V1;
- mais joins;
- mais rollback;
- maior risco operacional durante aplicacao.

### Opcao D - JSONB snapshot sem summary fields

Tudo fica em um JSONB unico.

Vantagens:

- criacao rapida;
- extrema flexibilidade.

Riscos:

- ruim para metricas;
- ruim para filtros;
- risco alto de payload inconsistente;
- timeline e dashboards dependem de parsing pesado.

## Recomendacao oficial para V1

Recomenda-se a tabela unica:

```text
public.crm_lead_simulations
```

com:

- `simulation_type` controlado por check constraint;
- snapshots JSONB obrigatorios;
- summary fields relacionais para consulta rapida;
- RLS organization-scoped;
- autoria resolvida server-side;
- sem acesso anon.

Essa opcao equilibra simplicidade operacional, rastreabilidade e flexibilidade para Simulacao Comercial e Multi-Cotas.

## Tabela recomendada: `crm_lead_simulations`

### Campos minimos recomendados

| Campo | Tipo conceitual | Obrigatorio | Finalidade |
| --- | --- | --- | --- |
| `id` | uuid | Sim | Identificador da simulacao. |
| `organization_id` | uuid | Sim | Escopo organizacional. |
| `lead_id` | uuid | Sim | Lead dono da simulacao. |
| `created_by` | uuid | Sim | Profile que criou a simulacao, resolvido server-side. |
| `created_at` | timestamptz | Sim | Criacao auditavel. |
| `updated_at` | timestamptz | Sim | Ultima alteracao do registro. |
| `simulation_type` | text | Sim | Tipo da simulacao. |
| `title` | text | Sim | Nome operacional exibido no historico do lead. |
| `status` | text | Sim | Estado operacional atual. |
| `source` | text | Sim | Origem do fluxo que criou a simulacao. |
| `technical_input` | jsonb | Sim | Parametros usados na engine. |
| `calculation_snapshot` | jsonb | Sim | Resultado tecnico calculado. |
| `presentation_snapshot` | jsonb | Sim | Resultado comercial apresentado. |
| `summary` | jsonb | Opcional V1 | Resumo flexivel adicional para UI/debug. |
| `presented_at` | timestamptz | Opcional | Quando foi apresentada ao lead. |
| `presented_by` | uuid | Opcional | Quem apresentou. |
| `proposal_generated_at` | timestamptz | Opcional | Ultima proposta gerada a partir da simulacao. |
| `proposal_generated_by` | uuid | Opcional | Quem gerou a proposta. |
| `pdf_generated_at` | timestamptz | Opcional | Ultimo PDF gerado. |
| `pdf_generated_by` | uuid | Opcional | Quem gerou o PDF. |
| `pdf_sent_at` | timestamptz | Opcional | Quando PDF foi enviado. |
| `pdf_sent_by` | uuid | Opcional | Quem enviou o PDF. |
| `archived_at` | timestamptz | Opcional | Arquivamento sem hard delete. |
| `archived_by` | uuid | Opcional | Quem arquivou. |

## Tipos de simulacao

Usar `text + check constraint` em V1.

Valores recomendados:

```text
commercial
multi_cotas
```

Motivo:

- simples de migrar;
- nao exige criar enum PostgreSQL inicialmente;
- rollback mais seguro;
- facilita adicionar novos tipos em sprint futura.

Evitar nomes ambiguos como:

- `simulator`;
- `proposal`;
- `strategy`;
- `multi`.

## Snapshot obrigatorio

Snapshots sao obrigatorios porque a engine do simulador muda ao longo do tempo.

Se o EVOLV salvar apenas parametros soltos, uma simulacao antiga pode ser reinterpretada com regra nova e perder validade comercial/auditavel.

### `technical_input`

Congela os parametros usados.

Para `commercial`:

- credito base;
- taxa administrativa;
- fundo de reserva;
- prazo;
- seguro;
- INCC;
- tipo de lance;
- percentual de lance embutido;
- percentual de lance em dinheiro;
- mes de contemplacao;
- cenario;
- administradora;
- taxa de venda da carta;
- dados comerciais usados na apresentacao.

Para `multi_cotas`:

- quantidade de cartas;
- valor base;
- prazo total;
- INCC anual;
- valorizacao mensal parada;
- mes comum de contemplacao, se usado;
- mes de saque/consolidacao;
- lista de cartas;
- valor individual por carta;
- mes de contemplacao por carta;
- mes de saque por carta.

### `calculation_snapshot`

Congela o resultado tecnico da engine.

Para `commercial`:

- cenarios calculados;
- parcelas antes e depois;
- credito atualizado;
- credito comercial;
- credito liquido;
- lance;
- investimento real;
- venda estimada;
- lucro estimado;
- ROI;
- multiplicador de alavancagem.

Para `multi_cotas`:

- cards calculados;
- reajustes INCC por carta;
- credito atualizado por carta;
- credito comercial por carta;
- valor futuro por carta;
- ganho estimado por carta;
- ROI estimado por carta;
- resumo total.

### `presentation_snapshot`

Congela a versao exibida/comercializada.

Deve incluir:

- labels principais;
- valores arredondados;
- cenario selecionado;
- narrativa comercial relevante;
- premissas visiveis;
- campos usados no PDF.

## Summary fields recomendados

Summary fields ficam fora do JSONB para permitir filtros, dashboard e metricas sem parsing pesado.

Campos recomendados:

| Campo | Tipo conceitual | Aplicacao |
| --- | --- | --- |
| `total_credit` | numeric | Credito bruto/base total. |
| `updated_credit` | numeric | Credito atualizado pelo INCC. |
| `commercial_credit` | numeric | Credito comercial disponivel ao cliente. |
| `monthly_payment` | numeric | Parcela principal antes da contemplacao, quando aplicavel. |
| `post_contemplation_payment` | numeric | Parcela pos-contemplacao, quando aplicavel. |
| `contemplation_month` | integer | Mes principal de contemplacao para simulacao comercial. |
| `quota_count` | integer | Numero de cartas/cotas, especialmente Multi-Cotas. |
| `incc_rate` | numeric | INCC usado na simulacao. |
| `estimated_roi` | numeric | ROI estimado. |
| `estimated_gain` | numeric | Ganho estimado. |
| `estimated_sale_value` | numeric | Valor estimado de venda, se aplicavel. |

### Decisao sobre duplicidade

A duplicidade entre JSONB e summary fields e intencional.

O JSONB preserva auditabilidade completa.

Os summary fields sustentam:

- listagem rapida;
- filtros;
- timeline;
- dashboards;
- metricas futuras.

## Status e timestamps

### Status recomendados

Usar `text + check constraint`.

Valores V1:

```text
draft
presented
proposal_generated
pdf_generated
pdf_sent
archived
```

### Decisao: status unico + timestamps independentes

Recomendacao:

- manter `status` como estado operacional atual;
- manter timestamps independentes para eventos importantes.

Motivo:

Uma simulacao pode estar em `pdf_sent`, mas ainda e importante saber:

- quando foi apresentada;
- quando a proposta foi gerada;
- quando o PDF foi gerado;
- quando foi enviado;
- quem executou cada etapa.

Assim, `status` responde "onde esta agora" e timestamps respondem "o que aconteceu".

## Relação com PDFs e propostas

### Recomendacao V1

Na V1, registrar timestamps de PDF/proposta diretamente em `crm_lead_simulations`:

- `proposal_generated_at`;
- `proposal_generated_by`;
- `pdf_generated_at`;
- `pdf_generated_by`;
- `pdf_sent_at`;
- `pdf_sent_by`.

Motivo:

- entrega rastreabilidade minima;
- reduz numero de tabelas iniciais;
- facilita timeline derivada;
- evita desenhar armazenamento de documentos antes da hora.

### Evolucao recomendada

Em sprint posterior, criar tabelas derivadas:

- `crm_simulation_proposals`;
- `crm_simulation_documents`.

Quando houver:

- multiplos PDFs por simulacao;
- versionamento de proposta;
- envio para diferentes canais;
- armazenamento real de arquivo;
- status de entrega;
- auditoria de abertura/visualizacao.

### Regra definitiva

Mesmo em V1, nenhum PDF ou proposta deve existir sem:

- `lead_id`;
- `simulation_id`;
- `organization_id`;
- autoria;
- timestamp.

## Timeline futura

Eventos derivados recomendados:

| Evento | Fonte futura |
| --- | --- |
| `simulation_created` | insert em `crm_lead_simulations` |
| `simulation_presented` | `presented_at` preenchido |
| `proposal_generated` | `proposal_generated_at` preenchido |
| `pdf_generated` | `pdf_generated_at` preenchido |
| `pdf_sent` | `pdf_sent_at` preenchido |

A timeline deve continuar sendo read model derivado server-side.

Nao implementar event store em V1.

## RLS e seguranca futura

Diretrizes:

- RLS habilitado desde a criacao da tabela;
- acesso apenas para `authenticated`;
- sem policy para `anon`;
- leitura restrita a `organization_id = public.evolv_current_organization_id()`;
- insert restrito a mesma organizacao;
- update restrito a mesma organizacao;
- sem hard delete em V1;
- arquivamento via `status = archived`, `archived_at`, `archived_by`.

### Autoria

O client nao deve enviar campos confiaveis como:

- `organization_id`;
- `created_by`;
- `presented_by`;
- `proposal_generated_by`;
- `pdf_generated_by`;
- `pdf_sent_by`;
- `archived_by`.

Esses campos devem ser resolvidos server-side usando:

- sessao autenticada;
- `profiles`;
- `public.evolv_current_organization_id()`;
- `public.evolv_current_role()`, se necessario.

### Validacao organizacional

Antes de criar simulacao:

1. validar sessao;
2. resolver profile;
3. resolver organization_id;
4. validar que o lead pertence a mesma organizacao;
5. preencher `organization_id` server-side;
6. preencher autoria server-side;
7. persistir snapshot.

## Relacionamentos recomendados

Relacionamentos conceituais:

- `crm_lead_simulations.organization_id -> organizations.id`;
- `crm_lead_simulations.lead_id -> crm_leads.id`;
- `crm_lead_simulations.created_by -> profiles.id`;
- `crm_lead_simulations.presented_by -> profiles.id`;
- `crm_lead_simulations.proposal_generated_by -> profiles.id`;
- `crm_lead_simulations.pdf_generated_by -> profiles.id`;
- `crm_lead_simulations.pdf_sent_by -> profiles.id`;
- `crm_lead_simulations.archived_by -> profiles.id`.

Recomendacao de delete behavior:

- `organization_id`: restrict/no cascade;
- `lead_id`: restrict/no cascade;
- profile references: `on delete set null`.

Motivo:

Simulacoes sao historico comercial e nao devem desaparecer em cascata por acidente.

## Indices futuros recomendados

Indices V1:

- `crm_lead_simulations_organization_id_idx`;
- `crm_lead_simulations_lead_id_idx`;
- `crm_lead_simulations_created_by_idx`;
- `crm_lead_simulations_created_at_idx`;
- `crm_lead_simulations_simulation_type_idx`;
- `crm_lead_simulations_status_idx`;
- `crm_lead_simulations_org_lead_created_at_idx`;
- `crm_lead_simulations_org_type_created_at_idx`;
- `crm_lead_simulations_org_status_created_at_idx`;

Indices opcionais futuros:

- `crm_lead_simulations_commercial_credit_idx`;
- `crm_lead_simulations_estimated_roi_idx`;
- `crm_lead_simulations_pdf_sent_at_idx`;
- `crm_lead_simulations_proposal_generated_at_idx`.

## Validacoes futuras esperadas

Para um pacote SQL futuro, validar:

- tabela existe;
- colunas existem;
- constraints de `simulation_type` existem;
- constraints de `status` existem;
- RLS habilitado;
- sem grants para anon;
- grants corretos para authenticated;
- policies organization-scoped existem;
- indexes existem;
- FKs existem;
- nenhuma tabela existente foi alterada indevidamente;
- row count inicial esperado;
- insert server-side resolve organization/autoria corretamente.

## Riscos identificados

### JSONB sem contrato

Risco:

Payloads divergentes entre simulacoes.

Mitigacao:

Definir contratos TypeScript por `simulation_type` antes da implementacao.

### Summary fields divergirem do snapshot

Risco:

Campo duplicado pode ficar incoerente.

Mitigacao:

Server-side deve derivar summary fields do mesmo objeto usado para snapshot.

### V1 simples demais para PDFs/propostas

Risco:

Timestamps na simulacao podem ser insuficientes para multiplos PDFs.

Mitigacao:

Aceitar timestamps na V1 e planejar tabelas derivadas quando houver versionamento real.

### RLS mal configurado

Risco:

Simulacoes de outra organizacao ficarem visiveis ou gravaveis.

Mitigacao:

Usar helper organizacional, sem anon, e validar lead ownership server-side antes de insert/update.

### Hard delete acidental

Risco:

Perda de historico comercial.

Mitigacao:

Nao criar delete policy em V1. Usar arquivamento.

## Fora do escopo desta sprint

- SQL;
- migration;
- tabela;
- policy;
- endpoint;
- service;
- repository;
- componente;
- alteracao visual;
- Auth;
- RLS real;
- banco;
- CRM;
- Simulador;
- Multi-Cotas;
- Timeline;
- PDF;
- propostas.

## Conclusao

A recomendacao oficial para V1 e criar futuramente uma tabela unica:

```text
public.crm_lead_simulations
```

com `simulation_type`, snapshots JSONB obrigatorios e summary fields relacionais para consultas e metricas.

Essa abordagem permite registrar Simulacao Comercial e Multi-Cotas em um modelo unico, auditavel, lead-centric e preparado para timeline e metricas futuras.

## Recomendacao para Sprint 103A.29

Criar o `Lead-Centric Simulation SQL Package Design`, ainda sem arquivos SQL executaveis, definindo o pacote futuro de apply, validation e rollback para `crm_lead_simulations`.
