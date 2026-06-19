# Sprint 103A.25 — Embedded Bid Financial Integrity Audit

## Objetivo

Auditar e corrigir a consistencia financeira do lance embutido entre engine, tela, apresentacao, PDF, snapshots e propostas geradas.

## Arquivos criados

- `docs/91-sprint-103a25-embedded-bid-financial-integrity-audit.md`

## Arquivos alterados

- `modules/simulator/presentation.ts`
- `modules/simulator/storage.ts`
- `components/simulator/simulator-panel.tsx`
- `components/presentation/client-presentation-page.tsx`
- `components/dashboard/executive-dashboard.tsx`
- `modules/crm/crm-lead-simulation-storage.ts`
- `modules/reports/commercial-pdf.ts`

## Causa raiz

A engine ja calculava corretamente `liquidCredit`:

```text
liquidCredit = updatedCredit - embeddedBidAmount
```

Porem, depois da Sprint 103A.23, varias camadas passaram a usar `updatedCredit` como o campo principal `Credito`.

Isso ficou correto para os casos sem lance e lance em dinheiro, mas ficou comercialmente incorreto para lance embutido, porque o cliente nao recebe o credito atualizado integral e o lance embutido simultaneamente.

## Regra efetivamente implementada

Foi criado o conceito canônico de apresentacao:

```text
commercialCredit = liquidCredit
```

Na pratica:

- sem lance: `commercialCredit = updatedCredit`;
- lance em dinheiro: `commercialCredit = updatedCredit`;
- lance embutido: `commercialCredit = updatedCredit - embeddedBidAmount`.

O campo visual `Credito` agora usa `commercialCredit`.

O campo `Credito atualizado` continua existindo como valor bruto corrigido pelo INCC.

O campo `Credito base` continua existindo como valor original informado.

O campo `Credito disponivel ao cliente` / `Credito liquido disponivel` usa `liquidCredit`.

## Exemplos matematicos

Credito base: R$ 180.000,00.

### Cenario 1 — sem lance

- Credito atualizado: R$ 180.000,00
- Lance: R$ 0,00
- Credito liquido: R$ 180.000,00
- Credito comercial exibido: R$ 180.000,00

### Cenario 2 — lance embutido 25%

Antes:

- A camada visual podia exibir `Credito` como R$ 180.000,00.

Depois:

- Credito atualizado: R$ 180.000,00
- Lance embutido: R$ 45.000,00
- Credito liquido: R$ 135.000,00
- Credito comercial exibido: R$ 135.000,00

### Cenario 3 — lance embutido 50%

- Credito atualizado: R$ 180.000,00
- Lance embutido: R$ 90.000,00
- Credito liquido: R$ 90.000,00
- Credito comercial exibido: R$ 90.000,00

### Cenario 4 — lance em dinheiro 25%

- Credito atualizado: R$ 180.000,00
- Lance em dinheiro: R$ 45.000,00
- Credito liquido: R$ 180.000,00
- Credito comercial exibido: R$ 180.000,00
- Investimento real inclui o lance em dinheiro.

### Cenario 5 — lance embutido 25% + INCC

Exemplo com INCC anual de 4% e mes 50:

- Reajustes INCC: 4
- Credito atualizado: R$ 210.574,54
- Lance embutido: R$ 52.643,64
- Credito liquido: R$ 157.930,91
- Credito comercial exibido: R$ 157.930,91

### Cenario 6 — multi-cotas com lance embutido

A auditoria confirmou que `modules/multi-cotas` nao possui campo ou regra de lance embutido. O modulo calcula credito atualizado por INCC e valorizacao futura das cartas, sem modelar lances.

Portanto, nao havia divergencia de lance embutido a corrigir em multi-cotas nesta sprint.

## Camadas corrigidas

### Engine / presentation

`buildSimulatorCommercialPresentation` agora expoe:

- `updatedCredit`: credito bruto atualizado pelo INCC;
- `liquidCredit`: credito disponivel apos abatimento do lance embutido;
- `commercialCredit`: credito comercial principal exibido ao cliente.

### Tela do simulador

O card `Credito` usa `commercialCredit`.

O grid de resultado preserva a transparencia:

- `Credito`
- `Credito atualizado`
- `Credito base`
- `Credito liquido disponivel`

### Alternativas patrimoniais

Os cards Conservadora, Recomendada e Patrimonial exibem `commercialCredit`.

### Apresentacao comercial

O grid de resultado usa `commercialCredit` como `Credito` e preserva `updatedCredit` como `Credito atualizado`.

### PDF comercial

O PDF usa `commercialCredit` como `Credito` principal e mantem:

- `Credito atualizado pelo INCC`;
- `Credito base`;
- `Credito disponivel ao cliente`;
- `Valor do lance`.

### Snapshots

Snapshots locais passaram a armazenar:

- `updatedCredit`;
- `commercialCredit`;
- `liquidCredit`.

Simulacoes antigas permanecem compativeis por fallback.

### CRM / propostas vinculadas ao lead

O credito salvo no vinculo local de simulacao do lead passou a usar `commercialCredit`.

## Validacoes executadas

Validacao matematica dos cenarios obrigatorios:

- Credito 180.000 sem lance;
- Credito 180.000 com lance embutido 25%;
- Credito 180.000 com lance embutido 50%;
- Credito 180.000 com lance em dinheiro;
- Credito 180.000 com lance embutido + INCC;
- Multi-cotas auditado como nao aplicavel para lance embutido.

Validacoes tecnicas:

```text
npm.cmd run typecheck: passou
npm.cmd run lint: passou com 4 warnings preexistentes em components/crm/crm-page.tsx
npm.cmd run build: passou
```

## Fora do escopo

- SQL
- banco de dados
- schema
- migrations
- Auth
- RLS
- policies
- timeline
- tarefas
- geracao de propostas como nova funcionalidade
- ancoragem comercial
- cadastro manual de lead

## Riscos e observacoes

- Simulacoes antigas que nao possuem `commercialCredit` usam fallback para `liquidCredit`, `updatedCredit` ou `contractedCredit`.
- Se futuramente multi-cotas precisar modelar lance embutido, sera necessario criar um desenho proprio; hoje o modulo nao representa lances.

## Recomendacao para Sprint 103A.26

Executar validacao visual em navegador com Bruno usando credito de R$ 180.000,00 e alternando entre sem lance, lance embutido 25%, lance embutido 50% e lance em dinheiro, confirmando que tela e PDF exibem os mesmos valores.
