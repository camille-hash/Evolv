# Sprint 99A - Dossie Executivo do Lead

## Objetivo

Redesenhar visualmente o dossie do lead para apoiar tomada de decisao comercial em menos de 10 segundos, sem alterar persistencia, regras comerciais, Supabase, Auth, RLS, grants, policies ou simulador.

## Escopo realizado

O componente do detalhe do lead foi reorganizado em blocos executivos:

1. Quem e
2. Contexto Estrategico
3. Ultimas Movimentacoes
4. Historico Completo
5. Proximas Acoes
6. Propostas e Simulacoes

Os campos editaveis existentes foram preservados e redistribuidos visualmente.

## Estrutura visual

### Card 1 - Quem e

Mostra rapidamente:

- nome;
- telefone;
- e-mail;
- origem;
- cidade/pais quando houver dado disponivel;
- objetivo derivado de produto de interesse, titulo da oportunidade ou valor desejado.

### Card 2 - Contexto Estrategico

Usa o campo atual de observacoes como fonte temporaria.

Nao cria nova persistencia.

### Card 3 - Ultimas Movimentacoes

Mostra apenas dados ja existentes:

- criado em;
- atualizado em;
- funil atual;
- etapa atual.

### Card 4 - Historico Completo

Espaco visual reservado para a Sprint 99B.

Nao implementa cronologia estruturada.

### Card 5 - Proximas Acoes

Evidencia:

- proxima acao;
- responsavel;
- valor desejado;
- CTAs comerciais existentes.

### Card 6 - Propostas e Simulacoes

Mantem a exibicao das propostas geradas em memoria local da sessao.

Nao altera simulador.

## Comportamento preservado

- Salvar lead continua usando o mesmo `onSave`.
- Voltar ao pipeline continua usando o mesmo `onCancel`.
- WhatsApp continua usando `buildWhatsappUrl`.
- Gerar simulacao continua usando `onGenerateSimulation`.
- Gerar proposta permanece desabilitado como antes.
- Ligar permanece desabilitado como antes.
- Nenhum campo novo foi persistido.

## Arquivos impactados

- `components/crm/crm-lead-detail.tsx`

## Confirmacoes

- Nenhum SQL foi executado.
- Nenhuma migration foi criada.
- Nenhum dado foi alterado.
- Nenhuma policy foi alterada.
- Nenhum grant foi alterado.
- Nenhum RLS foi alterado.
- Nenhuma regra comercial foi alterada.
- Nenhuma persistencia nova foi criada.
- Simulador nao foi alterado.
- Shadow Runtime e Observabilidade nao foram alterados.
