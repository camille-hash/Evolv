# Sprint 103A.38 - Commercial Simulation Lead Binding

## Objetivo

Conectar a Simulacao Comercial real ao lead, permitindo salvar uma simulacao comercial em `public.crm_lead_simulations` a partir do contexto do Dossie do Lead.

Esta sprint conectou apenas a Simulacao Comercial. Multi-Cotas, Timeline, PDF tracking, proposal tracking e historico visual de simulacoes ficaram fora do escopo.

## Arquivos criados

- `docs/104-sprint-103a38-commercial-simulation-lead-binding.md`

## Arquivos alterados

- `components/simulator/simulator-panel.tsx`

## Fluxo implementado

Quando a Simulacao Comercial e aberta a partir do Dossie do Lead, o painel ja recebe `leadProposalContext` com o `leadId` real. A sprint adicionou no banner de contexto do lead a acao:

- `Salvar simulacao no lead`

Ao clicar, o frontend:

1. valida que existe `leadProposalContext.leadId`;
2. le a sessao Supabase local e obtem `access_token`;
3. monta um payload real a partir da engine e da apresentacao atual;
4. envia `POST /api/crm/lead-simulations`;
5. exibe feedback simples de sucesso ou erro.

O botao nao aparece fora do contexto do lead. A simulacao nao e salva automaticamente.

## Payload enviado

O POST envia somente campos permitidos pelo contrato client-side:

- `leadId`
- `simulationType`
- `source`
- `title`
- `technicalInput`
- `calculationSnapshot`
- `presentationSnapshot`
- `summary`

Campos confiaveis continuam fora do payload:

- `organizationId`
- `createdBy`

Esses campos permanecem resolvidos server-side pela API/service.

## Snapshots utilizados

### `technicalInput`

Inclui os dados tecnicos reais usados pela simulacao:

- `simulatorInput`
- `formState`
- `selectedScenarioKey`
- `insuranceOption`
- `bidType`
- dados nao sensiveis da administradora selecionada

### `calculationSnapshot`

Inclui:

- resultado real de `calculateSimulatorScenarios(simulatorInput)`
- cenario selecionado usado pela apresentacao

### `presentationSnapshot`

Inclui:

- `presentation` real gerada por `buildSimulatorCommercialPresentation`
- dados comerciais do formulario
- contexto do lead, sem ownership confiavel

## Summary fields

O `summary` enviado contem os campos usados pelo repository para popular colunas resumidas:

- `totalCredit`
- `updatedCredit`
- `commercialCredit`
- `monthlyPayment`
- `postContemplationPayment`
- `contemplationMonth`
- `quotaCount`
- `inccRate`
- `estimatedRoi`
- `estimatedGain`
- `estimatedSaleValue`

Para Simulacao Comercial V1, `quotaCount = 1`.

## Comportamento de sucesso e erro

Sucesso:

- exibe mensagem de simulacao salva;
- exibe o `id` retornado quando disponivel;
- nao recarrega a pagina;
- nao altera o fluxo local de salvar simulacao.

Erro:

- exibe mensagem segura em portugues;
- nao bloqueia o restante do simulador;
- nao altera dados locais.

## Limitacoes conhecidas

- Ainda nao existe lista visual de simulacoes salvas no Dossie.
- Ainda nao ha evento na Timeline Operacional.
- Ainda nao ha tracking de PDF/proposta.
- Multi-Cotas nao foi conectado.
- A validacao manual completa depende de sessao Supabase autenticada e lead real.

## Validacao manual recomendada

1. Abrir um lead real.
2. Iniciar Simulacao Comercial pelo Dossie do Lead.
3. Ajustar parametros da simulacao.
4. Clicar em `Salvar simulacao no lead`.
5. Confirmar feedback visual de sucesso.
6. Abrir a pagina interna de smoke test ou chamar `GET /api/crm/lead-simulations?leadId=<leadId>`.
7. Confirmar:
   - `simulationType = commercial`;
   - `source = lead_detail`;
   - `leadId` correto;
   - snapshots preenchidos;
   - summary fields preenchidos;
   - `organization_id` e `created_by` resolvidos server-side.

## Validacoes tecnicas

Executar:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`

## Confirmacoes de governanca

- Nenhum SQL foi criado.
- Nenhum SQL foi executado.
- Banco nao foi alterado por esta sprint.
- Auth nao foi alterado.
- RLS nao foi alterado.
- Policies nao foram alteradas.
- Multi-Cotas nao foi alterado.
- Timeline nao foi alterada.
- PDF/proposal engine nao foram alterados.

## Recomendacao para Sprint 103A.39

Implementar a visualizacao de simulacoes salvas no Dossie do Lead, consumindo `GET /api/crm/lead-simulations?leadId=<leadId>` e mantendo a Timeline fora do escopo ate decisao especifica.
