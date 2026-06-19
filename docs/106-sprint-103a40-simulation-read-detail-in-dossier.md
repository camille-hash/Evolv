# Sprint 103A.40 - Simulation Read Detail in Dossier

## Objetivo

Permitir abrir uma simulacao salva no Dossie do Lead em modo somente leitura, exibindo os principais dados persistidos em `crm_lead_simulations`.

## Arquivos criados

- `docs/106-sprint-103a40-simulation-read-detail-in-dossier.md`

## Arquivos alterados

- `components/crm/crm-lead-detail.tsx`

## Comportamento implementado

A secao `Simulacoes Salvas` agora permite selecionar uma simulacao salva pelo botao:

- `Ver detalhes`

Ao selecionar, o Dossie exibe um painel inline de detalhe. O painel pode ser fechado por:

- `Fechar detalhe`

A leitura e feita exclusivamente a partir dos dados ja carregados pelo endpoint existente:

- `GET /api/crm/lead-simulations?leadId=<leadId>`

Nenhuma chamada nova ao banco foi adicionada alem da leitura ja existente da lista.

## Campos exibidos

### Identificacao

- titulo;
- tipo;
- status;
- data de criacao.

### Resumo Comercial

- credito;
- credito atualizado;
- credito comercial;
- parcela antes;
- parcela pos;
- mes de contemplacao;
- INCC;
- ROI estimado;
- lucro estimado;
- venda estimada.

### Premissas Tecnicas

Dados lidos de `technicalInput`:

- administradora;
- cenario;
- seguro;
- tipo de lance;
- taxa administrativa;
- fundo de reserva;
- prazo;
- INCC;
- venda da carta;
- lance embutido;
- lance em dinheiro.

### Apresentacao

Dados lidos de `presentationSnapshot.presentation`, quando disponiveis:

- cenario selecionado;
- seguro;
- tipo de lance;
- investimento real;
- credito liquido;
- credito comercial;
- lucro estimado;
- multiplo de alavancagem.

## Origem dos dados

O painel usa somente o registro retornado pela API de simulacoes:

- colunas relacionais de summary;
- `technicalInput`;
- `presentationSnapshot.presentation`.

O painel nao executa engine, nao recalcula valores e nao monta nova proposta.

## Limitacoes conhecidas

- Nao ha edicao de simulacao.
- Nao ha PDF.
- Nao ha reaplicacao da simulacao na engine.
- Nao ha comparacao entre simulacoes.
- Nao ha detalhe especifico de Multi-Cotas.
- Campos ausentes no snapshot sao exibidos como `-`.

## Validacao manual recomendada

1. Abrir um lead com simulacao salva.
2. Confirmar a secao `Simulacoes Salvas`.
3. Clicar em `Ver detalhes`.
4. Confirmar que o painel exibe identificacao, resumo comercial, premissas tecnicas e apresentacao.
5. Confirmar que os valores exibidos correspondem aos dados salvos.
6. Confirmar que `Fechar detalhe` oculta o painel.
7. Confirmar que nao existe edicao, PDF, proposta ou recalculo.

## Validacoes tecnicas

Executar:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`

## Confirmacoes de governanca

- Nenhum SQL foi criado.
- Nenhum SQL foi executado.
- Banco nao foi alterado.
- Auth nao foi alterado.
- RLS nao foi alterado.
- Policies nao foram alteradas.
- Endpoint/service nao foram alterados.
- Timeline nao foi alterada.
- PDF, Multi-Cotas e Simulador nao foram alterados.

## Recomendacao para Sprint 103A.41

Implementar um fluxo de navegacao controlada entre simulacao salva e artefatos derivados futuros, com escopo inicial documental antes de qualquer PDF/proposta/timeline.
