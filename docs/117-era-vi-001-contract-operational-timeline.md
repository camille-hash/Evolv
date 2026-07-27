# ERA-VI-001 — Contract Operational Timeline Foundation

## Fontes oficiais

- `public.contract_assemblies`: agenda e estado das assembleias.
- `public.contract_bids`: valores, composição, resultado e contemplação dos lances.
- `public.contract_timeline_events`: read model cronológico; não substitui assembleias ou lances.
- `public.contracts.credit_amount`: base operacional disponível nesta versão.

`contracts.metadata.operationalHistory` permanece restrito ao histórico legado de
transições de status. Não recebe assembleias, lances ou contemplações.

## Base percentual

Ao registrar um lance, `contracts.credit_amount` é copiado para
`contract_bids.credit_base_amount`, exibido como **Base de crédito utilizada no
cálculo**. O snapshot não é recalculado se o crédito do contrato mudar.

As porcentagens são calculadas sobre esse snapshot:

```text
cash_percentage     = cash_amount / credit_base_amount * 100
embedded_percentage = embedded_amount / credit_base_amount * 100
total_percentage    = total_amount / credit_base_amount * 100
```

Com base igual a zero, os percentuais ficam nulos. O total continua sendo
`cash_amount + embedded_amount`.

## Consistência e atomicidade

FKs compostas por `organization_id` impedem vincular contrato, assembleia e lance
de organizações diferentes. As RPCs `register_contract_assembly`,
`register_contract_bid` e `register_contract_bid_result` usam `security invoker`;
portanto, executam com a sessão autenticada e sob RLS.

Cada RPC grava a entidade oficial e seu evento na mesma transação. Os UUIDs de
assembleia e lance são definidos pelo cliente e reaproveitados em nova tentativa.
O índice único de origem/tipo evita eventos duplicados para a mesma operação.

## Autorização

Leitura e escrita exigem perfil ativo, `organization_id` resolvido pelos helpers
oficiais e papel `admin`, `master` ou `sdr`. Não há grants para `anon`, `DELETE`
ou uso de `service_role`.

## Compatibilidade

Não há backfill de eventos. Contratos legados sem assembleias ou lances exibem
estado vazio e continuam funcionando. A contemplação permanece oficial em
`contract_bids`; esta sprint não adiciona campos duplicados em `contracts`.
