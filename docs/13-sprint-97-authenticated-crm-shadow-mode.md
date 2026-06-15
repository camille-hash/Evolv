# Sprint 97.1 - Authenticated CRM Shadow Mode

## Resumo executivo

Esta sprint prepara artefatos para revisao humana do caminho autenticado do CRM, sem executar SQL, sem alterar codigo funcional e sem alterar o comportamento operacional atual do EVOLV.

O estado confirmado ate aqui e:

- `public.crm_leads` contem 763 leads.
- `crm_leads` esta com RLS ativo no ambiente de producao.
- Existem policies publicas/anon permissivas para leitura e atualizacao.
- O CRM atual depende da publishable/anon key no browser para listar e atualizar leads.
- `public.organizations` existe.
- A organization `patrion-evolv` existe.
- `public.profiles` existe.
- Camille e Bruno existem em `auth.users` e `profiles` como admin.
- `NEXT_PUBLIC_USE_SUPABASE_AUTH` ainda nao deve ser ativado.

O objetivo do shadow mode e preparar o caminho para uma leitura/escrita autenticada futura, preservando o modelo atual enquanto o banco e o codigo ainda dependem do acesso anon.

## Estado atual

O fluxo atual do CRM compartilhado passa por:

1. `components/crm/crm-page.tsx`
2. `modules/crm/repositories/index.ts`
3. `modules/crm/repositories/supabase-crm-repository.ts`
4. `createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)`
5. `public.crm_leads`

O repository Supabase do CRM usa `persistSession: false` e nao envia sessao autenticada no fluxo atual de `crm_leads`. Na pratica, quando `NEXT_PUBLIC_USE_SUPABASE_CRM=true`, a leitura e a escrita dependem das permissoes publicas atuais da tabela.

## Por que anon nao sera removido agora

Remover as policies anon agora quebraria o CRM em producao, porque:

- a listagem principal de leads usa o client publico no browser;
- o update de leads usa o mesmo client publico;
- nao ha ainda um fluxo autenticado aplicado ao repository de `crm_leads`;
- ainda nao existe backfill confirmado de `organization_id` em todos os 763 leads;
- a remocao antes do shadow mode impediria Bruno de operar o funil.

Portanto, as policies anon atuais devem permanecer durante esta etapa.

## Objetivo do shadow mode

O shadow mode deve permitir validar, em etapas pequenas, se o banco esta pronto para receber o caminho autenticado sem desligar o caminho anon atual.

Nesta sprint, isso significa apenas:

- diagnosticar a estrutura real de `crm_leads`;
- preparar SQL revisavel para adicionar colunas de escopo autenticado;
- preparar SQL revisavel para validar o resultado futuramente;
- documentar riscos e rollback.

Nao ha execucao, backfill, RLS novo, policy nova ou alteracao de codigo.

## Plano em fases

### Fase 1 - Diagnostico passivo

Executar manualmente, quando autorizado, o arquivo:

`supabase/sql/20260614_sprint97_crm_auth_shadow_diagnostics.sql`

Objetivo:

- confirmar tabela;
- confirmar contagem de leads;
- confirmar colunas `organization_id` e `assigned_profile_id`;
- confirmar constraints, indexes, RLS, policies e grants;
- confirmar organization `patrion-evolv`;
- confirmar profiles admin existentes.

### Fase 2 - Preparacao estrutural revisavel

Revisar manualmente o arquivo:

`supabase/sql/20260614_sprint97_prepare_crm_auth_columns.sql`

Esse arquivo foi preparado para conter apenas:

- `ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS organization_id uuid`;
- `ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS assigned_profile_id uuid`;
- constraints FK `NOT VALID` para `organizations` e `profiles`, se ausentes;
- indexes `IF NOT EXISTS`.

Nao ha backfill, `SET NOT NULL`, policy, grant, revoke, alteracao de RLS ou alteracao de dados.

### Fase 3 - Validacao pos-preparo

Executar manualmente, apenas apos aprovacao e eventual execucao da fase 2, o arquivo:

`supabase/sql/20260614_sprint97_validate_crm_auth_columns.sql`

Objetivo:

- validar colunas;
- validar constraints;
- validar indexes;
- confirmar contagem de leads;
- medir leads ainda sem `organization_id`;
- revisar RLS, policies e grants.

### Fase 4 - Backfill futuro

Somente em sprint futura:

- definir organization padrao para os 763 leads;
- executar backfill controlado de `organization_id`;
- validar contagem antes/depois;
- confirmar que nenhum lead foi perdido.

### Fase 5 - Repository autenticado em shadow mode

Somente em sprint futura:

- criar caminho autenticado sem remover o caminho anon;
- comparar leitura autenticada versus leitura atual;
- manter rollback por feature flag;
- nao remover policies anon ate validacao operacional completa.

### Fase 6 - Remediacao final

Somente depois de shadow mode validado:

- criar/ajustar policies autenticadas;
- remover ou restringir policies anon;
- validar Bruno e Camille em producao;
- manter plano de rollback documentado.

## Riscos

| Risco | Severidade | Observacao |
| --- | --- | --- |
| Remover anon antes do shadow mode | Critico | Quebra leitura/escrita atual do CRM. |
| Criar `organization_id` sem backfill | Alto | Nao quebra por si so se nullable, mas nao habilita RLS por organizacao ainda. |
| Tornar `organization_id` obrigatorio cedo demais | Critico | Pode bloquear os 763 leads existentes. |
| Criar policy autenticada antes de validar profiles | Alto | Pode bloquear usuarios validos ou abrir acesso indevido. |
| Executar SQL preparatorio sem revisao | Medio | O arquivo e aditivo, mas deve ser revisado no ambiente real. |
| Assumir schema local igual ao banco de producao | Alto | Ja houve drift entre migrations e banco real. |

## Rollback

Como esta sprint nao executa SQL e nao altera codigo, o rollback operacional e imediato: nao aplicar os SQLs criados.

Se em sprint futura o SQL preparatorio for aplicado, o rollback deve ser definido antes da execucao. Como o preparo adiciona colunas nullable, FKs `NOT VALID` e indices, a remocao nao deve ser feita automaticamente sem nova avaliacao, porque pode afetar dependencias futuras.

## Proximos passos recomendados

1. Camille revisar os tres SQLs criados.
2. Executar manualmente apenas o diagnostico `SELECT-only`.
3. Comparar o resultado com este documento.
4. Se o banco confirmar ausencia das colunas autenticadas, revisar o SQL preparatorio.
5. Somente depois de aprovacao humana, considerar execucao manual do preparo.
6. Criar sprint separada para backfill de `organization_id`.
7. Criar sprint separada para repository autenticado em shadow mode.

## Confirmacoes de escopo

- Nenhum SQL foi executado nesta sprint.
- Supabase CLI nao foi usado.
- Nenhuma migration foi criada.
- Nenhuma policy foi criada, removida ou alterada.
- RLS nao foi habilitado, desabilitado ou alterado.
- Nenhum grant foi criado, removido ou alterado.
- `crm_leads` nao teve dados alterados.
- Nenhum codigo funcional foi alterado.
- Bruno deve perceber zero diferenca operacional no EVOLV apos esta sprint.
