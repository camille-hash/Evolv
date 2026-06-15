# Sprint 96.1 - Auditoria Passiva Do Legado De Seguranca Do CRM

## Natureza

Auditoria passiva. Nao e remediacao.

Nenhum arquivo funcional foi alterado. Nenhum SQL foi executado. Nenhum banco, policy, grant, RLS, Auth, frontend, repository ou flag foi modificado.

## Contexto Confirmado

- `public.organizations` existe.
- `public.profiles` existe.
- Organization `patrion-evolv` criada.
- Profiles Camille e Bruno criados como `admin`.
- `auth.users` tem Camille e Bruno.
- `public.crm_leads` tem 763 leads.
- `crm_leads` esta com RLS ativo.
- `crm_leads` possui policies anon permissivas:
  - `Allow public read crm_leads`
  - `Allow public update crm_leads`
- O CRM atual depende de public/publishable/anon key no browser.
- `NEXT_PUBLIC_USE_SUPABASE_AUTH` ainda nao deve ser ativado.

## Arquivo SQL De Diagnostico

Criado:

`supabase/sql/20260614_sprint96_security_legacy_diagnostics.sql`

O arquivo contem apenas `SELECTs` para observar:

- grants de `crm_leads`;
- policies de `crm_leads`;
- RLS de `crm_leads` e `profiles`;
- contagem de `crm_leads`;
- contagem de `profiles`;
- contagem de `auth.users`;
- vinculos `profiles` / `auth.users`;
- colunas existentes em `crm_leads`;
- postura de acesso anon/authenticated via `has_table_privilege`;
- policies anon permissivas informadas no contexto.

## Evidencias De Codigo

### CRM Supabase client-side

Arquivo: `modules/crm/repositories/supabase-crm-repository.ts`

Evidencias:

- `SupabaseCrmRepository` cria client com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `list()` executa `.from("crm_leads").select(...)`.
- `getById()` executa `.from("crm_leads").select(...)`.
- `updateLead()` executa `.from("crm_leads").update(...)`.
- fallback de update tenta `.eq("external_id", ...)`.

Impacto:

- O CRM compartilhado depende de permissao browser-side para ler e atualizar `crm_leads`.

### Seletor Supabase vs localStorage

Arquivo: `modules/crm/repositories/index.ts`

Evidencias:

- `listCrmLeadsFromRepository()` usa Supabase quando `canUseSupabaseCrmRepository()` permite.
- Em falha, cai para localStorage.
- `updateCrmLeadInRepository()` tenta Supabase e depois cai para localStorage.

Impacto:

- Falhas de Supabase podem ser mascaradas pelo fallback local.
- Em maquinas sem a base local, o fallback pode gerar CRM vazio.

### CRM Page

Arquivo: `components/crm/crm-page.tsx`

Evidencias:

- Carregamento inicial chama `listCrmLeadsFromRepository()`.
- Edicao de dossie e movimentacao chamam `updateCrmLeadInRepository()`.

Impacto:

- A operacao diaria de Bruno depende do repository para leitura e escrita compartilhadas quando a flag CRM estiver ativa.

### Supabase Auth e profiles

Arquivo: `modules/access/supabase-auth.ts`

Evidencias:

- `createSupabaseAuthClient()` usa `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ou fallback `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `loadValidatedProfile()` consulta `profiles` com `.select("id, organization_id, name, email, role, is_active")`.

Impacto:

- Auth futuro depende de leitura de `profiles` via sessao autenticada.
- `NEXT_PUBLIC_USE_SUPABASE_AUTH` nao deve ser ativado ate a postura de Auth/Profile estar validada.

### Flags e variaveis

Arquivo: `.env.example`

Evidencias:

- `NEXT_PUBLIC_USE_SUPABASE_CRM=false`
- `NEXT_PUBLIC_USE_SUPABASE_AUTH=false`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=`

Impacto:

- O rollback por flags existe, mas producao precisa ser verificada manualmente.

## Matriz De Risco

| Item auditado | Evidencia | Risco | Criticidade | Depende do funcionamento atual? | Pode ser removido agora? | Recomendacao |
| --- | --- | --- | --- | --- | --- | --- |
| Policy anon de leitura em `crm_leads` | Contexto confirmado: `Allow public read crm_leads` | Exposicao de dados comerciais dos 763 leads via anon key | Critico | Sim, enquanto CRM browser-side depende dela | Nao | Planejar substituicao por policy autenticada/org antes de remover. |
| Policy anon de update em `crm_leads` | Contexto confirmado: `Allow public update crm_leads` | Alteracao de leads por cliente anon/public key | Critico | Sim, se escrita CRM atual usa anon no browser | Nao | Criar rota segura ou policy autenticada com RLS por organizacao antes de remover. |
| CRM listagem por publishable key | `SupabaseCrmRepository.list()` | CRM pode ficar vazio se anon for removido sem alternativa | Alto | Sim | Nao | Migrar leitura para Auth/RLS validado ou server-side. |
| CRM update por publishable key | `SupabaseCrmRepository.updateLead()` | Edicoes deixam de persistir ou caem para localStorage | Alto | Sim | Nao | Migrar escrita para Auth/RLS ou endpoint server-side. |
| Fallback localStorage | `modules/crm/repositories/index.ts` | Mascara falha de seguranca e fragmenta dados | Medio | Sim | Incerto | Adicionar observabilidade em sprint futura antes de mudancas de RLS. |
| `NEXT_PUBLIC_USE_SUPABASE_CRM` | `canUseSupabaseCrmRepository()` | Ativar/desativar altera fonte operacional do CRM | Alto | Sim | Nao | Validar flag real em producao antes de qualquer remediacao. |
| `NEXT_PUBLIC_USE_SUPABASE_AUTH` | `modules/access/supabase-auth.ts` | Ativar antes da hora bloqueia usuarios/profile | Alto | Nao deve depender agora | Nao | Manter desativado ate fim do plano Auth/RLS. |
| Profile validation | `loadValidatedProfile()` | Sem policy correta em `profiles`, Auth bloqueia todos | Alto | Futuro | Nao | Validar policy de profiles antes de ativar Auth. |
| Service role em script | `scripts/import-crm-to-supabase.ts` | Chave poderosa fora do browser, risco operacional se mal usada | Alto | Nao no runtime | Nao aplicavel | Manter apenas em ambiente controlado, nunca client-side. |
| Migrations antigas com RLS/policies | `supabase/migrations/*` | Drift entre repo e producao pode causar aplicacao insegura | Medio | Nao runtime | Nao | Nao aplicar migrations antigas automaticamente. |

## Dependencias Confirmadas

- `crm_leads` e lido no browser pelo CRM compartilhado.
- `crm_leads` e atualizado no browser pelo CRM compartilhado.
- O CRM depende de `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` quando `NEXT_PUBLIC_USE_SUPABASE_CRM=true`.
- O Auth futuro depende de `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- O Auth futuro depende de leitura de `profiles`.
- O estado atual de seguranca de producao inclui policies anon permissivas em `crm_leads`.

## Dependencias Incertas

- Flag real `NEXT_PUBLIC_USE_SUPABASE_CRM` em producao precisa ser confirmada fora do codigo.
- Flag real `NEXT_PUBLIC_USE_SUPABASE_AUTH` em producao precisa permanecer desativada.
- Grants reais de `crm_leads` devem ser confirmados pelo SQL diagnostico.
- Policies reais devem ser confirmadas pelo SQL diagnostico.
- A extensao exata de acesso anon depende da combinacao de grants + RLS + policies.

## Ordem Futura Para Remediacao

Nao implementar nesta sprint. Ordem recomendada:

1. Executar manualmente o SQL diagnostico e registrar resultados.
2. Confirmar flags reais no ambiente de producao.
3. Confirmar grants e policies efetivos de `crm_leads`.
4. Confirmar se o CRM em producao esta realmente usando Supabase ou localStorage.
5. Definir se leitura/escrita do CRM ficara no browser com Auth/RLS ou migrara para server-side.
6. Criar plano de substituicao da policy anon read por policy autenticada/org.
7. Criar plano de substituicao da policy anon update por policy autenticada/org ou endpoint server-side.
8. Testar em staging com Camille/Bruno admin.
9. So depois remover permissividades anon em producao.

## Proximo Passo Recomendado

Executar manualmente `supabase/sql/20260614_sprint96_security_legacy_diagnostics.sql` no SQL Editor e compartilhar os resultados. A Sprint seguinte deve analisar os resultados reais antes de qualquer remediacao.

## Confirmacao De Escopo

- Nenhum SQL foi executado.
- Nenhuma policy foi criada, alterada ou removida.
- Nenhum grant foi criado, alterado ou removido.
- RLS nao foi habilitado nem desabilitado.
- `crm_leads` nao foi alterado.
- Tabelas `crm_*` nao foram alteradas.
- Frontend, repositories, login, middleware e flags nao foram alterados.

