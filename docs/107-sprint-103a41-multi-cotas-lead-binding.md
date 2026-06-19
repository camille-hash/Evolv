# Sprint 103A.41 - Multi-Cotas Lead Binding

## Objetivo

Vincular estudos Multi-Cotas a leads usando o modelo oficial e unico:

- `public.crm_lead_simulations`
- `simulation_type = multi_cotas`

Nenhuma tabela paralela foi criada. `multi_quota_simulations` ficou explicitamente fora do escopo para preservar a arquitetura lead-centric aprovada nas sprints 103A.27 a 103A.33.

## Arquivos criados

- `docs/107-sprint-103a41-multi-cotas-lead-binding.md`

## Arquivos alterados

- `app/page.tsx`
- `components/crm/crm-page.tsx`
- `components/crm/crm-lead-detail.tsx`
- `components/multi-cotas/multi-cotas-page.tsx`
- `modules/crm/crm-lead-proposal-context.ts`

## Fluxo implementado

1. No Dossie do Lead, o atalho `Gerar Multi-Cotas` cria um contexto temporario com o `leadId` real.
2. A aplicacao abre a pagina Multi-Cotas com o lead vinculado.
3. A pagina exibe o lead e um campo de titulo do estudo.
4. O usuario aciona explicitamente `Salvar estudo no lead`.
5. O frontend obtem o access token Supabase e envia `POST /api/crm/lead-simulations`.
6. O server-side existente valida sessao, profile, organizacao e pertencimento do lead, depois persiste o registro.

Nao existe autosave. Fora de um contexto de lead, o botao de persistencia nao e exibido.

## Payload persistido

O POST usa:

- `leadId` do contexto do Dossie;
- `simulationType = multi_cotas`;
- `source = multi_cotas`;
- titulo informado pelo usuario;
- snapshots reais da engine Multi-Cotas;
- summary fields reais.

O client nao envia `organizationId` nem `createdBy`. Esses campos continuam resolvidos pelo service server-side existente.

### Snapshot canonico

As tres camadas persistidas incluem o snapshot canonico completo:

```text
{
  input,
  result: { cards, summary },
  metadata: {
    source: "multi_cotas",
    version: "103A.41-R1"
  }
}
```

`presentationSnapshot` tambem acrescenta os dados compactos apresentados no resumo.

O `input` armazena:

- quantidade de cartas;
- valor base;
- prazo;
- INCC anual;
- valorizacao mensal parada;
- meses compartilhados;
- configuracao de cada carta.

O `result` armazena os `cards` calculados e o `summary` calculado da engine.

### Summary fields

- `totalCredit`;
- `updatedCredit`;
- `commercialCredit`;
- `quotaCount`;
- `contemplationMonth`;
- `inccRate`;
- `estimatedGain`;
- `estimatedSaleValue`.

## Recuperacao no Dossie

O Dossie continua usando `GET /api/crm/lead-simulations?leadId=<leadId>`.

Foi adicionada uma secao compacta `Multi-Cotas`, com:

- quantidade de estudos salvos;
- titulo de cada estudo;
- quantidade de cartas;
- data/hora de criacao.

O historico e o detalhe expandido de Multi-Cotas ficaram fora do escopo.

## Regras preservadas

- Todo estudo salvo requer `leadId`.
- Um lead pode possuir varios estudos Multi-Cotas.
- Nenhum estudo paralelo e criado fora de `crm_lead_simulations`.
- Nenhum lead e removido por uma operacao Multi-Cotas.
- Nenhuma exclusao de estudos foi implementada: o schema atual nao possui policy de delete e a direcao do dominio continua sendo arquivamento futuro, nao hard delete.

## Fora do escopo

- Nova tabela ou migration.
- SQL, RLS, policies ou Auth.
- Update/delete de estudos.
- Timeline.
- Historico expandido.
- Detalhe especifico de Multi-Cotas.
- PDF, proposta, dashboard, analytics ou recomendacao automatica.

## Validacao manual recomendada

1. Abrir um lead real no CRM.
2. Acionar `Gerar Multi-Cotas`.
3. Ajustar a estrategia Multi-Cotas.
4. Informar ou confirmar o titulo.
5. Acionar `Salvar estudo no lead`.
6. Confirmar a mensagem de sucesso.
7. Retornar ao Dossie e confirmar a secao `Multi-Cotas` com quantidade, titulo e data.
8. Confirmar por `GET /api/crm/lead-simulations?leadId=<leadId>` que o registro possui `simulationType = multi_cotas`, `source = multi_cotas`, snapshots e summary preenchidos.

## Validacoes tecnicas

Executar:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`

## Confirmacoes de governanca

- Nenhum SQL foi criado.
- Nenhum SQL foi executado.
- Nenhuma tabela foi criada.
- Banco nao foi alterado.
- Auth, RLS e policies nao foram alterados.
- O endpoint e service existentes foram reutilizados sem alteracao.

## Recomendacao para Sprint 103A.42

Criar o historico de estudos Multi-Cotas no Dossie usando a mesma fonte `crm_lead_simulations`, com filtro `simulation_type = multi_cotas` e sem introduzir nova persistencia.
