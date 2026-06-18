# Sprint 103A.23 — Simulator Commercial Consistency Audit

## Objetivo

Garantir consistencia comercial entre a engine do simulador, a visualizacao em tela e o PDF de estrategia comercial para o credito projetado na contemplacao.

## Escopo auditado

- `modules/simulator/presentation.ts`
- `modules/simulator/storage.ts`
- `components/simulator/simulator-panel.tsx`
- `components/presentation/client-presentation-page.tsx`
- `modules/reports/commercial-pdf.ts`

## Causa raiz

A engine de apresentacao ja calculava o credito atualizado pelo INCC em `updatedCredit`, usando a regra anual de reajuste em `calculateInccAdjustmentCount`.

O problema estava na camada de apresentacao: a tela principal, a grade de resultados e o PDF exibiam `contractedCredit` no campo comercial principal. Esse valor representa o credito base informado na simulacao e, por isso, nao variava quando o mes de contemplacao mudava.

## Regra validada

O numero de reajustes INCC e calculado por:

```text
floor((mes_de_contemplacao - 1) / 12)
```

Assim:

- mes 1: 0 reajustes
- mes 50: 4 reajustes
- mes 91: 7 reajustes
- mes 150: 12 reajustes

O credito exibido comercialmente deve usar:

```text
credito_base * (1 + INCC_anual) ^ quantidade_de_reajustes
```

## Correcoes implementadas

- O contrato `SimulatorCommercialPresentation` passou a expor `inccRate`, para permitir transparencia no PDF.
- A tela do simulador passou a exibir `updatedCredit` como `Credito`.
- A apresentacao comercial passou a exibir `updatedCredit` como `Credito`.
- O PDF comercial passou a exibir `updatedCredit` como `Credito`.
- O PDF comercial passou a informar `INCC utilizado nesta projecao: X,XX% ao ano`.
- Simulacoes salvas passaram a armazenar `updatedCredit` no snapshot local, com fallback retrocompativel para registros antigos.
- A nomenclatura visual `Credito contratado` foi substituida por `Credito` onde o valor comercial principal e apresentado.
- Quando o valor base ainda e util, ele passou a aparecer como `Credito base`.

## Consistencia engine, tela e PDF

A engine permanece como fonte unica do calculo.

Tela e PDF agora consomem o mesmo campo derivado:

```text
presentation.updatedCredit
```

O campo `contractedCredit` permanece disponivel como valor tecnico/base, sem mudanca de persistencia em banco.

## Fora do escopo

- SQL
- migrations
- banco de dados
- Auth
- RLS
- policies
- timeline
- tarefas
- ancoragem comercial
- mudancas em regras de proposta fora da apresentacao do credito

## Validacoes

Executadas:

```text
npm.cmd run typecheck: passou
npm.cmd run lint: passou com 4 warnings preexistentes em components/crm/crm-page.tsx
npm.cmd run build: passou
```

## Riscos

- Simulacoes antigas salvas localmente podem nao ter `updatedCredit`; foi aplicado fallback para `contractedCredit` nesses casos.
- O valor base continua existindo para compatibilidade tecnica, mas o valor comercial principal agora e o credito atualizado pela engine.

## Recomendacao para Sprint 103A.24

Executar uma validacao manual do simulador e do PDF com os meses 1, 50, 91 e 150, registrando prints comparativos e confirmando a progressao visual do credito com INCC acumulado.
