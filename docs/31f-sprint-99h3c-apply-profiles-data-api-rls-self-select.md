# Sprint 99H.3C - Apply Profiles Data API + RLS Self-Select

## 1. Resumo executivo

Esta sprint prepara a aplicacao controlada da correcao minima para o login Supabase do EVOLV.

O problema atual nao esta em `auth.users` nem no conteudo de `public.profiles`. O gargalo esta no fato de o frontend precisar ler `profiles` no navegador logo apos `signInWithPassword()`, enquanto a tabela aparece como `API Disabled`.

Como a Data API e habilitada no painel do Supabase e nao por SQL, esta sprint separa a execucao em duas partes:

1. passo manual no painel para habilitar Data API em `public.profiles`;
2. SQL manual e revisavel para habilitar RLS e criar uma policy minima de self-select para `authenticated`.

Nada foi executado por Codex. Nada foi alterado em producao, Vercel, codigo do app, Auth users, profiles, CRM ou integracoes.

## 2. Arquivos criados nesta sprint

- `docs/31f-sprint-99h3c-apply-profiles-data-api-rls-self-select.md`
- `supabase/sql/20260616_sprint99h3c_profiles_self_select_apply.sql`
- `supabase/sql/20260616_sprint99h3c_profiles_self_select_validation.sql`
- `supabase/sql/20260616_sprint99h3c_profiles_self_select_rollback.sql`

## 3. O que sera aplicado futuramente

### Passo manual no painel do Supabase

Camille deve habilitar a Data API para `public.profiles` no painel do Supabase.

Observacao importante:

- este passo nao esta no SQL;
- ele deve acontecer antes do teste de login;
- ele nao deve abrir acesso publico;
- ele deve ser combinado com RLS e policy minima.

### Passo SQL manual

O SQL de aplicacao faz apenas:

- `enable row level security` em `public.profiles`;
- criacao da policy de `SELECT` para `authenticated`;
- restricao com `auth.uid() = id`.

O SQL nao faz:

- `INSERT`;
- `UPDATE`;
- `DELETE`;
- policy `anon`;
- alteracao de dados;
- alteracao de `auth.users`;
- alteracao de `organization_id`;
- alteracao de `role`;
- alteracao de `is_active`.

## 4. Ordem segura de execucao

1. Revisar o arquivo `20260616_sprint99h3c_profiles_self_select_apply.sql`.
2. Habilitar Data API de `public.profiles` no painel do Supabase.
3. Executar manualmente o SQL de aplicacao no SQL Editor.
4. Executar manualmente o SQL de validacao.
5. Testar login Supabase no checkout local.
6. Testar refresh da pagina.
7. Testar abertura do CRM.
8. Testar abertura de lead.
9. Testar criacao de nota.
10. Se algo falhar, executar o rollback e interromper a 99I.

## 5. Resultado esperado apos a aplicacao

Com a aplicacao correta:

- o login Supabase deixa de falhar na camada EVOLV;
- `loadValidatedProfile()` consegue ler o proprio profile;
- o usuario autenticado nao consegue ler profiles de terceiros;
- `anon` continua sem acesso;
- nenhuma escrita client-side em `profiles` e liberada.

## 6. Riscos conhecidos

- habilitar Data API sem executar RLS/policy logo em seguida cria risco de exposicao;
- habilitar RLS sem a policy minima mantem o login bloqueado;
- criar policy mais ampla que `auth.uid() = id` aumenta o risco de leitura lateral entre usuarios;
- rollback incompleto pode deixar a tabela acessivel de forma diferente do planejado.

## 7. Rollback proposto

O rollback desta sprint remove apenas a policy criada.

Ele tambem desabilita RLS em `public.profiles`, mas esse passo deve ser usado com cautela. Se houver dependencia nova em producao ou em outro ambiente, Camille deve parar e reavaliar antes de executar o rollback completo.

O rollback nao:

- altera dados;
- altera `auth.users`;
- altera `profiles` como conteudo;
- altera CRM;
- altera notas.

## 8. Validacao manual recomendada

Depois da aplicacao:

- confirmar que `public.profiles` aparece acessivel pela Data API no painel;
- confirmar que RLS esta ativa;
- confirmar que a policy `Profiles can read own profile` existe;
- testar login com usuario valido;
- testar refresh;
- testar CRM;
- testar nota.

## 9. Criterio para liberar a 99I

A 99I so pode ser liberada se:

- Data API de `profiles` estiver habilitada;
- RLS estiver ativa;
- a policy de self-select existir;
- o login Supabase concluir sem erro generico;
- o CRM abrir;
- a nota for criada com sucesso;
- o refresh mantiver a sessao.

## 10. Status atual

Status da 99I: **bloqueada**.

Motivo:

- a correcao foi apenas preparada;
- nenhum passo foi aplicado ainda no Supabase;
- o login ainda depende da execucao manual controlada desses artefatos.

## 11. Confirmacoes finais

- Apenas documentacao e SQLs manuais foram criados.
- Nenhum codigo do app foi alterado nesta sprint.
- Nenhum SQL foi executado por Codex.
- Nenhuma migration foi criada.
- Nenhum deploy foi realizado.
- Nenhuma alteracao em Vercel foi feita.
- Nenhum dado em `profiles` foi alterado.
- O diretorio proibido `C:\Users\camil\Documents\Codex` nao foi usado.
