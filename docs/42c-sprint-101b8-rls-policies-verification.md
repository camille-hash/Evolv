# Sprint 101B.8 — RLS, Policies and Grants Verification

## Itens auditados

- estado atual de RLS
- policies atuais
- grants atuais

## Fonte da evidencia

Fontes efetivamente disponiveis nesta sprint:

1. observacao do ambiente local configurado no repo;
2. consultas read-only via client Supabase publico;
3. respostas reais da Data API para tabelas e funcoes consultadas.

Nao houve acesso a catalogo administrativo do banco.

## Evidencia observada

### 1. Caminho de acesso disponivel

Foi identificado apenas o caminho publico/browser configurado por:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Nao foram encontradas credenciais administrativas reutilizaveis para auditar:

- grants por role;
- policies por tabela;
- estado completo de RLS no catalogo.

### 2. Resposta de tabelas operacionais

- `crm_leads` respondeu normalmente via Data API publica;
- `crm_stage_events` retornou `PGRST205`;
- `crm_green_flags` retornou `PGRST205`.

Leitura segura:

- `crm_leads` segue acessivel por esse caminho;
- as novas tabelas Dual Pipeline ainda nao estao presentes no schema cache observavel;
- isso e coerente com o fato de os SQLs permanecerem nao executados.

### 3. Resposta de funcoes

As funcoes organizacionais retornaram `PGRST202`, sem presenca no schema cache acessivel.

## Evidencia nao obtida

Nao foi possivel inventariar de forma conclusiva:

- quais tabelas estao com RLS ativo hoje;
- quais tabelas estao sem RLS;
- nomes e escopos completos das policies atuais;
- grants atuais para `anon`, `authenticated` e `service_role`.

## Por que faltou

A sprint nao recebeu nem encontrou no checkout um mecanismo privilegiado read-only para inspecao do catalogo do banco.

## Risco

Critico.

## Impacto

Sem esse inventario privilegiado, qualquer decisao de execucao controlada do Dual Pipeline fica sem uma das validacoes mais importantes: a compatibilidade real entre schema novo, policies existentes, grants existentes e funcoes de contexto organizacional.

## Conclusao

O estado atual de RLS, policies e grants permanece **nao verificado de forma privilegiada**. Este e um bloqueio formal para avancar a execucao controlada.
