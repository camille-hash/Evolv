# Sprint 103A.43 - Multi-Cotas Read Detail

## Objetivo

Permitir abrir um estudo Multi-Cotas salvo no Dossie do Lead e visualizar seu snapshot persistido em modo somente leitura.

## Arquivos criados

- `docs/109-sprint-103a43-multi-cotas-read-detail.md`

## Arquivos alterados

- `components/crm/crm-lead-detail.tsx`

## Comportamento implementado

Cada item do historico Multi-Cotas agora possui a acao `Abrir`.

Ao abrir, o Dossie exibe um painel inline de detalhe com acao `Fechar detalhe`. O painel reutiliza exclusivamente o registro ja carregado pelo historico, sem nova chamada de API e sem executar a engine Multi-Cotas.

## Origem dos dados

O detalhe le somente o snapshot canonico persistido em `calculationSnapshot`:

```text
{
  input,
  result: {
    cards,
    summary
  },
  metadata
}
```

## Campos exibidos

### Cabecalho

- titulo;
- data/hora de criacao;
- origem Multi-Cotas.

### Resumo

Dados de `result.summary`:

- quantidade de cartas;
- total contratado;
- credito atualizado;
- valor futuro;
- ganho INCC;
- ganho de valorizacao.

### Cartas

Cada carta persistida em `result.cards` exibe:

- posicao;
- valor original;
- mes de contemplacao;
- mes de saque;
- reajustes INCC;
- credito atualizado;
- valor futuro;
- ganho estimado;
- ROI estimado.

### Dados de entrada

Dados de `input`:

- quantidade de cartas;
- valor base;
- prazo;
- contemplacao compartilhada;
- INCC anual;
- valorizacao mensal;
- mes de consolidacao;
- origem metadata.

## Snapshot incompleto

Quando `input`, `result.summary` ou `result.cards` estiver incompleto, o painel exibe:

- `Nao foi possivel carregar todos os dados deste estudo.`

A tela permanece funcional e nao tenta recalcular nem reparar o snapshot.

## Limites de escopo

- Nenhuma edicao, recalculo, salvamento, exclusao ou duplicacao foi adicionada.
- Nenhum PDF, Timeline, dashboard, analytics ou exportacao foi conectado.
- Nenhuma tabela, SQL, migration, RLS, Auth ou policy foi alterada.
- Nenhuma nova entidade ou repository paralelo foi criado.

## Validacao manual recomendada

1. Abrir um lead com estudo Multi-Cotas persistido.
2. Na secao `Multi-Cotas`, acionar `Abrir`.
3. Confirmar cabecalho, resumo, cartas e dados de entrada.
4. Confirmar que nao existe campo editavel ou acao de recalcular/salvar.
5. Acionar `Fechar detalhe`.
6. Abrir um registro com snapshot incompleto, se houver, e confirmar a mensagem segura.

## Validacoes tecnicas

Executar:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check`
- `git status`
- `git diff --stat`

## Recomendacao para proxima sprint

Manter a proxima evolucao em desenho funcional antes de conectar qualquer artefato derivado, como PDF ou eventos de Timeline Multi-Cotas.
