# Sprint 99C.1 - Dossie Executivo Vivo (UI)

## Objetivo

Redesenhar visualmente o Dossie Executivo do Lead para melhorar a leitura operacional diaria, sem conectar notas ao Supabase, sem persistir novas informacoes e sem alterar fluxos estabilizados do CRM.

## Organizacao Visual

O dossie foi reorganizado em blocos de leitura executiva:

- Quem e: dados estaveis do lead.
- Contexto Estrategico: leitura temporaria derivada das informacoes atuais.
- Ultima Movimentacao: um unico sinal recente para leitura rapida.
- Proxima Acao: bloco visual com estado vazio amigavel quando nao houver acao.
- Acoes Comerciais: CTAs existentes preservados.
- Historico Completo: secao recolhivel, fechada por padrao.
- Dados Comerciais: campos editaveis preservados sem mudar comportamento.

## Comportamento Preservado

Foram preservados:

- salvar lead;
- voltar ao pipeline;
- gerar simulacao;
- WhatsApp;
- placeholders existentes;
- propostas e simulacoes;
- campos editaveis existentes.

## Fora Do Escopo

Nao foi implementado:

- persistencia de notas;
- conexao Supabase para notas;
- repository novo;
- migration;
- SQL;
- alteracao de Auth;
- alteracao de Shadow Runtime;
- alteracao de Ownership;
- alteracao de Observabilidade;
- alteracao de simulador;
- alteracao de fallback do CRM.

## Confirmacoes

- Nenhum SQL foi executado.
- Nenhuma migration foi criada.
- Nenhum dado foi alterado.
- Nenhuma policy foi alterada.
- Nenhum grant foi alterado.
- Nenhum RLS foi alterado.
- Nenhum deploy foi realizado.
- Nenhuma alteracao funcional foi implementada.
