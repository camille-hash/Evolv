# Sprint 97.2 - Ownership Foundation

## Objetivo

Preparar `public.crm_leads` para o futuro modelo autenticado baseado em organizacao, sem alterar o comportamento operacional atual do EVOLV.

Resultado esperado apos execucao manual futura e validada:

- 763 leads preservados.
- 763 leads vinculados a organization `patrion-evolv`.
- Zero leads orfaos.
- Nenhuma alteracao em autentificacao.
- Nenhuma alteracao em frontend.
- Nenhuma alteracao em repositories.
- Nenhuma alteracao em policies, grants ou estado de RLS.

## Natureza da sprint

Esta sprint cria apenas documentacao e SQLs manuais revisaveis. Nenhum SQL foi executado por Codex.

Os SQLs foram separados para permitir aprovacao humana etapa a etapa:

1. Diagnostico inicial.
2. Preparo estrutural da coluna `organization_id`.
3. Indice de `organization_id`.
4. Foreign key `NOT VALID`.
5. Backfill controlado para `patrion-evolv`.
6. Validacao final.
7. Rollback revisavel.

## Riscos

| Risco | Severidade | Controle |
| --- | --- | --- |
| Atualizar coluna errada nos leads | Critico | O backfill atualiza apenas `organization_id`. |
| Vincular leads a organization incorreta | Critico | O backfill usa exclusivamente `where slug = 'patrion-evolv'`. |
| Alterar policies anon atuais | Critico | Nenhum SQL desta sprint cria, altera ou remove policies. |
| Alterar grants | Alto | Nenhum SQL desta sprint executa `GRANT` ou `REVOKE`. |
| Alterar RLS | Alto | Nenhum SQL desta sprint habilita ou desabilita RLS. |
| Perder leads | Critico | Nenhum SQL desta sprint remove ou insere leads. |
| Rollback apagar coluna preexistente | Alto | Rollback deve ser executado apenas conforme resultado do diagnostico inicial. |

## Ordem segura de execucao manual

### 1. Diagnostico inicial

Arquivo:

`supabase/sql/20260614_sprint97_2_ownership_initial_diagnostics.sql`

Executar primeiro. Aprovacao esperada:

- `public.crm_leads` existe.
- Total esperado: 763 leads.
- Organization `patrion-evolv` existe e retorna exatamente uma linha.
- Estado atual de `organization_id` e nulos e conhecido.
- Indices e constraints existentes foram mapeados.

### 2. Preparo estrutural

Arquivo:

`supabase/sql/20260614_sprint97_2_add_organization_id_column.sql`

Conteudo permitido:

- `ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS organization_id uuid`

Nao executa backfill e nao altera dados.

### 3. Indice

Arquivo:

`supabase/sql/20260614_sprint97_2_create_organization_id_index.sql`

Conteudo permitido:

- `CREATE INDEX IF NOT EXISTS` exclusivamente em `public.crm_leads(organization_id)`

### 4. Foreign key protegida

Arquivo:

`supabase/sql/20260614_sprint97_2_add_organization_id_fk_not_valid.sql`

Conteudo permitido:

- FK de `public.crm_leads.organization_id` para `public.organizations.id`
- Obrigatoriamente `NOT VALID`

Nao valida constraint nesta sprint.

### 5. Backfill controlado

Arquivo:

`supabase/sql/20260614_sprint97_2_backfill_patrion_organization_id.sql`

Conteudo permitido:

- atualizar apenas `public.crm_leads.organization_id`;
- usar apenas a organization encontrada por `where slug = 'patrion-evolv'`;
- preservar todos os demais campos.

### 6. Validacao final

Arquivo:

`supabase/sql/20260614_sprint97_2_ownership_validation.sql`

Validar:

- total de leads;
- total de nulos;
- distribuicao por organizacao;
- presenca da FK;
- presenca do indice;
- RLS, policies e grants inalterados.

## Criterios de aprovacao

A sprint so deve ser considerada aprovada apos execucao manual futura se:

- `crm_leads_total = 763`.
- `leads_without_organization_id = 0`.
- A distribuicao por organizacao aponta 763 leads para `patrion-evolv`.
- A FK `crm_leads_organization_id_fk` existe como `NOT VALID`.
- O indice `crm_leads_organization_id_idx` existe.
- Nenhuma policy foi alterada.
- Nenhum grant foi alterado.
- RLS permaneceu no mesmo estado anterior.
- Bruno nao percebeu qualquer diferenca operacional.

## Criterios de rollback

O rollback deve ser aprovado manualmente e depende do diagnostico inicial.

Se `organization_id` nao existia antes desta sprint:

- remover FK criada;
- remover indice criado;
- remover coluna `organization_id`.

Se `organization_id` ja existia antes desta sprint:

- nao remover a coluna;
- nao executar rollback destrutivo da coluna;
- avaliar apenas a reversao dos objetos criados nesta sprint;
- nao apagar valores sem snapshot de pre-execucao.

Como o backfill altera `organization_id`, qualquer rollback de dados deve ser manualmente aprovado e baseado no diagnostico inicial. Sem snapshot confiavel, nao e seguro zerar `organization_id` em massa.

## Validacoes obrigatorias

Antes de qualquer execucao manual em producao:

- revisar todos os SQLs;
- confirmar que Camille aprovou a etapa;
- executar diagnostico inicial;
- registrar resultados;
- executar cada SQL separadamente;
- executar validacao final;
- comparar total de leads antes e depois.

## Confirmacoes de escopo

- Esta sprint nao executa SQL.
- Esta sprint nao usa Supabase CLI.
- Esta sprint nao altera migrations.
- Esta sprint nao altera frontend.
- Esta sprint nao altera repositories.
- Esta sprint nao altera login, Auth ou feature flags.
- Esta sprint nao cria, altera ou remove policies.
- Esta sprint nao cria, altera ou remove grants.
- Esta sprint nao habilita nem desabilita RLS.
