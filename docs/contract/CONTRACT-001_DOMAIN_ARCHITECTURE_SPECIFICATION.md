# EVOLV — CONTRACT-001

## Domain Architecture Specification

## 1. Objetivo

Criar a arquitetura definitiva do domínio **Contract Operations**, substituindo o fluxo provisório Lead -> Cliente baseado em `localStorage`.

O novo domínio estabelece o contrato como entidade operacional central entre CRM, Cliente, Receita e Carteira.

```txt
Lead
↓
Contract
↓
Administrator
↓
Commission Plan
↓
Client
↓
Revenue Intelligence
↓
Portfolio
```

---

## 2. Decisão Arquitetural

O EVOLV não deve converter Lead diretamente em Cliente.

A conversão correta passa a ser:

```txt
Lead -> Contract -> Client
```

Ou seja:

- Lead representa oportunidade comercial.
- Contract representa formalização operacional.
- Client representa entidade patrimonial persistida.
- Revenue nasce das regras financeiras do contrato.
- Portfolio nasce da consolidação dos contratos por cliente.

---

## 3. Entidade Central: Contract

O contrato é a primeira entidade pós-venda persistida.

Ele representa uma contratação real ou em formalização, vinculada a:

- lead original;
- cliente;
- administradora;
- plano contratado;
- regras comerciais;
- plano de comissão;
- status operacional;
- projeção de receita.

---

## 4. Lifecycle do Contrato

```txt
draft
↓
pending_documentation
↓
submitted
↓
approved
↓
active
↓
completed / cancelled
```

### Status oficiais

| Status | Significado |
| --- | --- |
| `draft` | contrato iniciado, ainda incompleto |
| `pending_documentation` | aguardando documentos ou dados obrigatórios |
| `submitted` | enviado para administradora |
| `approved` | aprovado, aguardando ativação |
| `active` | contrato ativo |
| `completed` | contrato encerrado naturalmente |
| `cancelled` | contrato cancelado |
| `rejected` | recusado pela administradora |

---

## 5. Modelo Conceitual

### Lead

Continua pertencendo ao domínio comercial.

Responsabilidades:

- captar intenção;
- registrar perfil e histórico;
- gerar simulações;
- apoiar decisão comercial;
- originar contrato.

Não deve conter lógica de cliente, receita ou carteira.

### Contract

Responsabilidades:

- registrar contratação;
- armazenar condições contratadas;
- vincular administradora;
- vincular cliente;
- gerar base para comissão;
- alimentar carteira.

### Administrator

Responsabilidades:

- representar administradoras como Canopus, Âncora, Rodobens;
- armazenar regras institucionais;
- permitir expansão futura.

### Commission Plan

Responsabilidades:

- definir regras de comissão;
- calcular receita prevista;
- registrar gatilhos de pagamento;
- permitir Revenue Intelligence.

### Client

Responsabilidades:

- representar pessoa ou empresa com vínculo patrimonial;
- consolidar contratos;
- alimentar carteira;
- não depender de `localStorage`.

### Revenue

Responsabilidades:

- calcular comissão prevista;
- registrar comissão realizada;
- acompanhar pendências;
- projetar receita futura.

### Portfolio

Responsabilidades:

- consolidar contratos por cliente;
- exibir patrimônio contratado;
- exibir exposição por administradora;
- apoiar visão patrimonial de longo prazo.

---

## 6. Relacionamentos

```txt
crm_leads
  └── contracts.lead_id

clients
  └── contracts.client_id

administrators
  └── contracts.administrator_id

commission_plans
  └── contracts.commission_plan_id

contracts
  └── revenue_entries.contract_id
```

Relação principal:

```txt
Lead 1 -> N Contracts
Client 1 -> N Contracts
Administrator 1 -> N Contracts
Commission Plan 1 -> N Contracts
Contract 1 -> N Revenue Entries
```

---

## 7. Tabelas Necessárias

### `public.contracts`

Tabela principal do domínio.

Campos recomendados:

```txt
id
organization_id
lead_id
client_id
administrator_id
commission_plan_id

contract_number
status

product_type
credit_amount
installment_amount
term_months
contemplation_model

signed_at
submitted_at
approved_at
activated_at
cancelled_at

metadata
created_at
updated_at
created_by
updated_by
```

### `public.administrators`

```txt
id
organization_id
name
slug
status
metadata
created_at
updated_at
```

### `public.commission_plans`

```txt
id
organization_id
administrator_id
name
status

commission_type
commission_percentage
commission_fixed_amount
payment_trigger
payment_installments

metadata
created_at
updated_at
```

### `public.revenue_entries`

```txt
id
organization_id
contract_id
client_id
administrator_id

type
status
expected_amount
actual_amount
due_date
paid_at

metadata
created_at
updated_at
```

---

## 8. APIs Necessárias

### Contracts

```txt
GET    /api/contracts
GET    /api/contracts/:id
POST   /api/contracts
PATCH  /api/contracts/:id
POST   /api/contracts/:id/status
```

### Lead -> Contract

```txt
POST /api/crm/leads/:leadId/create-contract
```

Essa API substitui a lógica atual de conversão local.

### Clients

```txt
GET    /api/clients
GET    /api/clients/:id
POST   /api/clients
PATCH  /api/clients/:id
```

### Administrators

```txt
GET    /api/administrators
POST   /api/administrators
PATCH  /api/administrators/:id
```

### Commission Plans

```txt
GET    /api/commission-plans
POST   /api/commission-plans
PATCH  /api/commission-plans/:id
```

---

## 9. Regra Lead -> Contract

Um lead pode originar um ou mais contratos.

A criação de contrato deve:

1. validar lead existente;
2. validar organização;
3. criar ou vincular cliente;
4. criar contrato em status `draft`;
5. copiar apenas dados necessários do lead;
6. preservar o lead como origem comercial;
7. registrar evento na timeline.

Não deve:

- apagar lead;
- depender de `localStorage`;
- criar cliente sem contrato;
- misturar lógica de receita no CRM.

---

## 10. Regra Contract -> Client

Cliente deve ser persistido em `public.clients`.

A criação de cliente pode ocorrer de duas formas:

```txt
1. Novo cliente criado a partir do contrato
2. Contrato vinculado a cliente existente
```

Regra principal:

```txt
Sem contrato, não há conversão operacional.
```

---

## 11. Revenue Intelligence

A primeira versão de receita deve ser derivada de:

```txt
contract.credit_amount
commission_plan.commission_percentage
commission_plan.payment_trigger
commission_plan.payment_installments
```

Exemplo:

```txt
expected_commission = credit_amount * commission_percentage
```

A receita não deve ser armazenada dentro de `contracts`.

Deve existir como domínio próprio em `revenue_entries`.

---

## 12. Portfolio Intelligence

A carteira deve ser calculada a partir dos contratos ativos.

Indicadores iniciais:

```txt
total_active_contracts
total_credit_amount
total_expected_revenue
contracts_by_administrator
contracts_by_status
client_total_portfolio_value
```

Portfolio não deve ser uma tabela obrigatória no início.

Pode nascer como leitura derivada de:

```txt
clients + contracts + revenue_entries
```

---

## 13. Substituição do Fluxo Atual

O fluxo atual:

```txt
Lead -> localStorage clientContext
```

deve ser considerado legado.

Novo fluxo:

```txt
Lead -> Contract API -> public.contracts -> public.clients -> Revenue -> Portfolio
```

O `localStorage` pode permanecer temporariamente apenas para compatibilidade visual, mas não deve ser a fonte oficial.

---

## 14. Entregas Futuras

### CONTRACT-002 — Database Model

Criar tabelas, constraints, índices e RLS.

### CONTRACT-003 — Contract API

Criar endpoints server-side.

### CONTRACT-004 — Lead -> Contract Operation

Substituir conversão local por criação persistida.

### CONTRACT-005 — Client Persistence Replacement

Substituir leitura local da tela Cliente.

### CONTRACT-006 — Administrator Registry

Criar cadastro operacional de administradoras.

### CONTRACT-007 — Commission Plan Model

Criar regras de comissão.

### CONTRACT-008 — Revenue Projection Engine

Criar projeção de receita.

### CONTRACT-009 — Portfolio Surface

Criar leitura consolidada de carteira.

### CONTRACT-010 — Client Page Replacement

Substituir tela Cliente atual por domínio persistido.

---

## 15. Critério de Sucesso

O EPIC-002 será considerado arquiteturalmente correto quando:

```txt
Lead não criar mais Cliente diretamente.
Cliente existir no banco.
Contrato existir no banco.
Receita for derivada do contrato.
Carteira for derivada dos contratos.
localStorage deixar de ser fonte oficial.
```

---

## 16. Decisão Final

O domínio **Contract Operations** passa a ser o eixo operacional pós-venda do EVOLV.

A partir deste ponto, qualquer evolução de Cliente, Receita ou Carteira deve partir de Contrato, não de Lead.
