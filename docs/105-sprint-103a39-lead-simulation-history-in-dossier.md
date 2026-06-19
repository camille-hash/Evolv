# Sprint 103A.39 - Lead Simulation History in Dossier

## Objetivo

Exibir no Dossie do Lead uma secao simples com as simulacoes salvas em `crm_lead_simulations`, consumindo o endpoint existente:

- `GET /api/crm/lead-simulations?leadId=<leadId>`

Esta sprint e apenas de leitura visual no Dossie.

## Arquivos criados

- `docs/105-sprint-103a39-lead-simulation-history-in-dossier.md`

## Arquivos alterados

- `components/crm/crm-lead-detail.tsx`

## Resumo visual

Foi adicionada a secao:

- `Simulacoes Salvas`

Localizacao:

- Dossie do Lead, apos os cards principais e antes da Timeline Operacional.

Cada simulacao e exibida em card compacto com:

- titulo;
- tipo;
- credito;
- parcela;
- mes de contemplacao;
- data/hora de criacao.

## Estados implementados

### Loading

Exibe:

- `Carregando simulacoes...`

### Vazio

Exibe:

- `Nenhuma simulacao salva neste lead.`

### Erro

Exibe erro seguro:

- `Nao foi possivel carregar as simulacoes.`

## API usada

O Dossie usa o access token Supabase ja obtido pelo helper existente e chama:

- `GET /api/crm/lead-simulations?leadId=<leadId>`

Nao ha consulta direta ao Supabase no componente.

## Fora do escopo confirmado

- Nenhum modal foi criado.
- Nenhum detalhe expandido foi criado.
- Nenhum botao de PDF foi criado.
- Timeline nao foi conectada a simulacoes.
- Multi-Cotas nao foi conectado.
- Simulador nao foi alterado.
- Endpoint/service nao foram alterados.
- Nenhum SQL foi criado ou executado.

## Validacao manual recomendada

1. Abrir um lead com simulacao comercial salva.
2. Confirmar a secao `Simulacoes Salvas`.
3. Confirmar que o card exibe titulo, tipo, credito, parcela, mes e criacao.
4. Abrir um lead sem simulacoes.
5. Confirmar o estado vazio.
6. Confirmar que notas, tarefas e Timeline continuam funcionando.

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
- Timeline service/endpoint nao foram alterados.
- PDF, Multi-Cotas e Simulador nao foram alterados.

## Recomendacao para proxima sprint

Sprint 103A.40 - Lead Simulation Detail Read UX, para permitir abrir uma simulacao salva em leitura detalhada sem gerar PDF, sem editar e sem conectar Multi-Cotas.
