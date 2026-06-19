# Sprint 103A.45 - PDF Comercial Multi-Cotas

## Objetivo

Permitir que um estudo Multi-Cotas ja persistido no Dossie do Lead gere um PDF comercial somente leitura, usando exclusivamente o snapshot salvo em `crm_lead_simulations`.

## Fluxo implementado

No detalhe de um estudo Multi-Cotas salvo, o botao `Gerar PDF` usa o `calculationSnapshot` do registro aberto. O gerador le `snapshot.input`, `snapshot.result.summary` e `snapshot.result.cards`; ele nao chama a engine Multi-Cotas, nao recalcula valores e nao atualiza a simulacao.

O PDF inclui:

- EVOLV, titulo do estudo, nome do lead e data de geracao;
- resumo executivo com valores presentes no snapshot;
- cartas e seus dados financeiros disponiveis;
- resultado consolidado quando os campos existem;
- observacao sobre o estudo refletir os parametros da data da simulacao.

Campos sem valor no snapshot nao sao inventados nem exibidos como dados comerciais.

## Arquivos

- Criado: `modules/reports/multi-cotas-pdf.ts`.
- Alterado: `modules/reports/index.ts` para expor o gerador.
- Alterado: `components/crm/crm-lead-detail.tsx` para disponibilizar o botao no detalhe somente leitura e encaminhar o snapshot persistido.

## Limites e seguranca

O botao aparece somente quando o snapshot aberto possui resumo e cartas suficientes. A funcionalidade nao altera banco, Auth, RLS, policies, Timeline, lead ou registro de simulacao. Nenhum SQL foi criado ou executado.

O evento `PDF Multi-Cotas gerado` nao foi adicionado a Timeline nesta sprint. O modelo atual nao possui uma fonte persistida adequada para esse evento, e registrar uma visualizacao ou geracao somente no cliente criaria uma evidencia artificial. Essa auditoria deve ser modelada em sprint futura.

## Validacao manual recomendada

1. Abrir um lead que possua um estudo Multi-Cotas salvo.
2. Abrir o estudo pelo historico Multi-Cotas.
3. Selecionar `Gerar PDF`.
4. Conferir que o PDF apresenta os mesmos resumo e cartas do snapshot exibido no detalhe.
5. Confirmar que o estudo nao foi recalculado, modificado nem duplicado.

## Limitacoes conhecidas

O PDF nao inclui envio, assinatura, compartilhamento, Excel, dashboard ou evento de Timeline. Ele tambem nao exibe parcela ou investimento quando esses valores nao existem no snapshot salvo.

## Validacoes tecnicas

- `npm.cmd run typecheck`: aprovado.
- `npm.cmd run lint`: aprovado com quatro warnings preexistentes em `components/crm/crm-page.tsx` para simbolos nao utilizados; nenhum warning novo foi introduzido.
- `npm.cmd run build`: aprovado.
- `git diff --check`: aprovado.

## Proxima sprint recomendada

Sprint 103A.46 - Dashboard e Analytics, ou uma sprint especifica de modelagem de eventos persistidos para auditoria de geracao/envio de PDFs.
