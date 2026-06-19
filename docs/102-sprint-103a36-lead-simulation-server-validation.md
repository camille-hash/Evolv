# Sprint 103A.36 - Lead-Centric Simulation Server-Side Validation

## Objetivo

Validar tecnicamente a camada server-side criada para `public.crm_lead_simulations` antes de conectar Simulador Comercial, Multi-Cotas ou qualquer UI.

Esta sprint nao alterou UI, Simulador Comercial, Multi-Cotas, Timeline, PDF, Auth, RLS, policies, schema ou banco.

## Arquivos criados

- `docs/102-sprint-103a36-lead-simulation-server-validation.md`

## Arquivos alterados

- Nenhum arquivo de codigo foi alterado nesta sprint.

## Ambiente usado para validacao

Diretorio:

```text
C:\Projetos\Evolv-Auth
```

Ambiente local possui chaves de configuracao para:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_USE_SUPABASE_AUTH`
- `NEXT_PUBLIC_USE_SUPABASE_CRM`
- `NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW`

Nao foi encontrado access token Supabase autenticado nem credenciais de usuario em `.env.local`.

Por seguranca, nenhum valor secreto foi impresso no relatorio.

## Estrategia de validacao aplicada

Foram realizadas:

1. Validacao estatica do contrato implementado.
2. Validacao tecnica via `typecheck`, `lint` e `build`.
3. Revisao dos fluxos server-side contra os casos obrigatorios.

Nao foram executados testes HTTP autenticados reais porque a sprint exige usuario/token autenticado e esse token nao estava disponivel no ambiente local do Codex. Fingir sucesso de POST/GET com RLS seria incorreto.

## Casos testados

### 1. POST valido

Status:

```text
PENDENTE DE EXECUCAO MANUAL COM TOKEN AUTENTICADO
```

Payload sanitizado recomendado:

```json
{
  "leadId": "<lead-da-organizacao-atual>",
  "simulationType": "commercial",
  "title": "Validacao tecnica 103A.36",
  "source": "api",
  "technicalInput": {
    "credit": 180000,
    "termMonths": 180
  },
  "calculationSnapshot": {
    "updatedCredit": 180000,
    "commercialCredit": 180000
  },
  "presentationSnapshot": {
    "headline": "Simulacao de validacao"
  },
  "summary": {
    "totalCredit": 180000,
    "updatedCredit": 180000,
    "commercialCredit": 180000,
    "monthlyPayment": 2500,
    "contemplationMonth": 1,
    "quotaCount": 1,
    "inccRate": 0.04
  }
}
```

Resultado esperado pelo codigo:

- server resolve `organization_id`;
- server resolve `created_by`;
- server valida lead/organizacao;
- server grava snapshots;
- server deriva summary fields;
- retorna `201` com `simulation.id`.

Resultado real nesta sprint:

- nao executado por ausencia de token autenticado.

### 2. GET por lead

Status:

```text
PENDENTE DE EXECUCAO MANUAL COM TOKEN AUTENTICADO
```

Endpoint:

```text
GET /api/crm/lead-simulations?leadId=<leadId>
```

Resultado esperado pelo codigo:

- valida sessao;
- valida profile;
- valida lead da mesma organizacao;
- lista simulacoes por `lead_id`;
- ordena por `created_at desc`.

Resultado real nesta sprint:

- nao executado por ausencia de token autenticado.

### 3. GET por simulationId

Status:

```text
PENDENTE DE EXECUCAO MANUAL COM TOKEN AUTENTICADO
```

Endpoint:

```text
GET /api/crm/lead-simulations?simulationId=<simulationId>
```

Resultado esperado pelo codigo:

- valida sessao;
- busca simulacao por id;
- valida `organization_id`;
- revalida lead/organizacao;
- retorna somente a simulacao solicitada.

Resultado real nesta sprint:

- nao executado por ausencia de token autenticado.

### 4. Lead invalido

Status:

```text
VALIDADO POR REVISAO DE CODIGO / PENDENTE DE EXECUCAO HTTP
```

Comportamento implementado:

- `createLeadSimulation()` chama `validateLeadOrganization()`;
- se o lead nao existir ou nao possuir `organization_id`, retorna `404`;
- se o lead for de outra organizacao, retorna `404`;
- nenhum insert e chamado antes dessa validacao.

### 5. Payload incompleto

Status:

```text
VALIDADO POR REVISAO DE CODIGO / PENDENTE DE EXECUCAO HTTP
```

Comportamento implementado:

- route valida presenca de `leadId`, `title`, `simulationType`, `technicalInput`, `calculationSnapshot` e `presentationSnapshot`;
- service reforca que snapshots obrigatorios sao objetos nao vazios;
- falha com erro seguro antes do insert.

### 6. Tipo invalido

Status:

```text
VALIDADO POR REVISAO DE CODIGO / PENDENTE DE EXECUCAO HTTP
```

Comportamento implementado:

- route usa `isCrmLeadSimulationType()`;
- service reforca `isCrmLeadSimulationType()`;
- valores aceitos:
  - `commercial`;
  - `multi_cotas`.

### 7. Source invalido

Status:

```text
VALIDADO POR REVISAO DE CODIGO / PENDENTE DE EXECUCAO HTTP
```

Comportamento implementado:

- route usa `isCrmLeadSimulationSource()`;
- service reforca `isCrmLeadSimulationSource()`;
- valores aceitos:
  - `lead_detail`;
  - `simulator`;
  - `multi_cotas`;
  - `api`.

### 8. Campos nao confiaveis

Status:

```text
VALIDADO POR REVISAO DE CODIGO / PENDENTE DE EXECUCAO HTTP
```

Campos testados conceitualmente:

- `organizationId`;
- `createdBy`.

Comportamento implementado:

- route nao repassa `organizationId`;
- route nao repassa `createdBy`;
- service monta payload com:
  - `organization_id: context.profile.organization_id`;
  - `created_by: context.profile.id`.

Conclusao:

Mesmo que o client envie esses campos extras no JSON, eles sao ignorados pela route atual.

## Problemas encontrados

Nao foi encontrado problema de typecheck, lint error ou build.

Limitacao operacional encontrada:

```text
Nao havia access token Supabase autenticado disponivel para executar os casos HTTP reais com RLS ativo.
```

## Correcoes realizadas

Nenhuma correcao de codigo foi realizada nesta sprint.

## Evidencias sanitizadas

### Typecheck

```text
npm.cmd run typecheck
Resultado: passou.
```

### Lint

```text
npm.cmd run lint
Resultado: passou com 4 warnings preexistentes em components/crm/crm-page.tsx.
```

Warnings observados:

- `handleSubmit` nao usado;
- `handleCancelEdit` nao usado;
- `handlePipelineChange` nao usado;
- `LeadForm` nao usado.

### Build

```text
npm.cmd run build
Resultado: passou.
```

Build confirmou a rota:

```text
/api/crm/lead-simulations
```

## Limitacoes conhecidas

- Testes HTTP autenticados reais nao foram executados nesta sprint por falta de token autenticado.
- Nenhuma simulacao real foi criada pelo Codex.
- Nenhum teste cross-organization real foi executado.
- Nenhum teste de RLS real foi executado por ferramenta.
- A validacao final de POST/GET deve ser feita pela operadora com usuario Supabase autenticado e lead real.

## Checklist manual recomendado para Camille

1. Abrir app local ou ambiente controlado com Supabase Auth ativo.
2. Fazer login com usuario valido da organizacao.
3. Obter um `leadId` real da organizacao atual.
4. Executar POST valido em `/api/crm/lead-simulations`.
5. Confirmar retorno `201` e `simulation.id`.
6. Executar GET por `leadId`.
7. Confirmar simulacao criada no topo da lista.
8. Executar GET por `simulationId`.
9. Testar POST com lead inexistente.
10. Testar POST sem snapshots.
11. Testar `simulationType` invalido.
12. Testar `source` invalido.
13. Testar envio de `organizationId` e `createdBy` falsos e confirmar que nao sao gravados.

## Confirmacoes

- Nenhum SQL foi criado.
- Nenhum SQL foi executado.
- Nenhum banco foi alterado.
- Nenhum schema foi alterado.
- Nenhum Auth foi alterado.
- Nenhum RLS foi alterado.
- Nenhuma policy foi alterada.
- Nenhuma UI foi alterada.
- Simulador Comercial nao foi conectado.
- Multi-Cotas nao foi conectado.
- Timeline nao foi alterada.
- PDF nao foi alterado.

## Recomendacao para Sprint 103A.37

Recomenda-se:

```text
Sprint 103A.37 - Lead-Centric Simulation Authenticated Smoke Test
```

Objetivo sugerido:

- executar os casos HTTP com token autenticado real;
- registrar evidencias sanitizadas;
- confirmar POST/GET com RLS ativo;
- corrigir somente se algum erro real aparecer;
- manter UI e simuladores ainda desconectados ate o smoke autenticado passar.
