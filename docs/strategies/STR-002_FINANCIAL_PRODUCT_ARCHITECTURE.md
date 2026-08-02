# STR-002 - Financial Product Architecture

## Status

Draft v1.0

## Objetivo

Fundar o dominio Patrimonial Strategy como camada arquitetural para estrategias
patrimoniais compostas por produtos financeiros, engines independentes,
artefatos comerciais e publicacoes.

Esta sprint nao implementa um novo simulador, um novo PDF ou um produto
financeiro especifico.

## Diagnostico Arquitetural

### Simulator

O Simulador Comercial concentra calculo, apresentacao comercial, PDF,
personalizacao de proposta e persistencia de simulacoes/propostas. A engine
principal esta em `modules/simulator/engine.ts`; a apresentacao comercial esta em
`modules/simulator/presentation.ts`; a experiencia visual esta em
`components/simulator/simulator-panel.tsx`.

### Multi-Cotas

Multi-Cotas possui engine propria em `modules/multi-cotas/multi-cotas-engine.ts`
e tipos em `modules/multi-cotas/multi-cotas-types.ts`. A experiencia esta em
`components/multi-cotas/multi-cotas-page.tsx`. O resultado pode ser persistido
como `crm_lead_simulations` com `simulationType = "multi_cotas"`.

### Commercial Proposal

Commercial Proposal ja existe como aggregate formal em
`modules/commercial-proposals`. Ele preserva snapshots, versionamento, status,
auditoria e vinculo com simulacao quando aplicavel.

### PDFs e Publicacao

PDFs ainda sao funcoes especificas:

- `modules/reports/commercial-pdf.ts`
- `modules/reports/multi-cotas-pdf.ts`

Eles geram representacoes comerciais a partir de snapshots/dados recebidos. A
partir da STR-002, PDF passa a ser tratado como um formato de publicacao, nao
como parte da engine financeira.

### Persistencia e Dossie

As simulacoes vinculadas ao Lead usam `crm_lead_simulations`. O Dossie consome
essas simulacoes e propostas por endpoints existentes do CRM. Essa infraestrutura
deve ser reaproveitada.

### Timeline e Delivery

Timeline operacional existe como read model e nao deve ser substituida por esta
sprint. Canais assistidos como WhatsApp e Email aparecem como superficies de
entrega/publicacao, mas nao como engines financeiras.

## Problemas Encontrados

1. Simulacao concentra responsabilidades demais.
2. Produtos financeiros ainda nao possuem contrato arquitetural proprio.
3. Engines financeiras nao possuem uma interface comum para registro.
4. Publicacoes ainda aparecem como funcoes de PDF especificas.
5. Estrategias antigas em `modules/strategies` sao templates locais simples, nao
   um dominio operacional extensivel.

## Arquitetura Proposta

Fluxo conceitual:

```text
Lead
-> Patrimonial Strategy
-> Financial Product
-> Calculation Engine
-> Commercial Proposal
-> Executive Material
-> Publication
-> Delivery
```

## Responsabilidades

### Patrimonial Strategy

Agrega produtos, artefatos, versao, objetivo e vinculo com Lead. A Estrategia
Patrimonial e protagonista do dominio.

### Financial Product

Define familia, nome, descricao e engines suportadas. Produto financeiro nao
controla UI nem publicacao.

### Calculation Engine

Executa calculo para familias de produtos suportadas. Engine nao conhece PDF,
WhatsApp, Email ou Dossie.

### Commercial Proposal

Permanece aggregate comercial versionado e auditavel. Passa a ser artefato da
Estrategia Patrimonial.

### Publication

Representa formatos como PDF, WhatsApp, Email e visualizacao interna. Publicacao
consome artefatos/snapshots e nao recalcula.

## Compatibilidade

### Commercial Proposal

Preservado como artefato `commercial_proposal`, referenciado por ID e versao.

### Multi-Cotas

Preservado como produto financeiro da familia `multi_quota`, sem alterar engine,
UI, persistencia ou PDF.

### Simulacoes Existentes

Preservadas como artefatos `simulation`, referenciando `crm_lead_simulations`.

### Dossie

Nao alterado. A estrategia futura podera organizar evidencias ja exibidas no
Dossie sem substituir o Dossie.

### Timeline

Nao alterada. Eventos futuros devem usar a timeline existente ou read models
derivados, sem criar timeline paralela nesta sprint.

## Fora do Escopo

- Grupo Exclusivo Referencia Capital.
- Publication Builder.
- Novo PDF.
- Tela final.
- Nova persistencia.
- Novo simulador.
- Condicionais especificas de produto espalhadas pela UI.
