# Sprint 99H.3A - Supabase Data API Access Audit

## 1. Resumo executivo

O fluxo de Supabase Auth do EVOLV ja autentica o usuario em `auth.users`, mas o acesso so e concluido se o app conseguir ler `public.profiles` no navegador logo apos o login.

A evidencia atual aponta para um bloqueio de acesso via Data API em `profiles`. Como o codigo client-side executa `.from("profiles").select(...).eq("id", user.id).maybeSingle()`, a autenticacao passa, mas a validacao do profile falha e o app devolve a mensagem:

```text
Nao foi possivel concluir seu acesso. Entre em contato com o administrador.
```

Nenhuma alteracao foi realizada nesta sprint. O objetivo foi confirmar por leitura de codigo quais tabelas sao acessadas no browser, quais dependem de Data API e qual seria a correcao minima segura futura.

## 2. Evidencia do problema

Evidencias confirmadas:

- O login nao retorna mais `E-mail ou senha invalidos.`.
- `auth.users` esta correto.
- `profiles.id = auth.users.id`.
- `profiles.organization_id` esta preenchido.
- `profiles.role = admin`.
- `profiles.is_active = true`.
- O navegador usa client Supabase para consultar `profiles`.
- O painel do Supabase mostrou:

```text
profiles - RLS Disabled - API Disabled
This table cannot be accessed via the Data API.
```

Isso e compativel com o comportamento do codigo:

- `signInWithPassword()` autentica o usuario;
- em seguida o app tenta ler `profiles`;
- se a leitura falha, o app interpreta como acesso nao validado e executa `signOut()`.

## 3. Fluxo tecnico do login Supabase

Fluxo atual:

```text
LoginPage
-> isSupabaseAuthEnabled()
-> signInWithSupabaseAuth(email, password)
-> supabase.auth.signInWithPassword()
-> loadValidatedProfile(supabase, data.user)
-> supabase.from("profiles").select(...).eq("id", user.id).maybeSingle()
-> isValidProfile(profile)
-> app libera acesso
```

Se `profiles` falhar:

```text
loadValidatedProfile() retorna null
-> signOutFromSupabaseAuth()
-> erro generico de acesso
```

Na carga inicial da pagina, o app repete a mesma dependencia:

```text
app/page.tsx
-> loadSupabaseCurrentUser()
-> supabase.auth.getSession()
-> loadValidatedProfile()
```

Ou seja, sem leitura de `profiles`, o login Supabase nao se sustenta.

## 4. Tabelas acessadas no client

### No fluxo de login Supabase

Leitura client-side confirmada:

- `profiles`

Chamadas relevantes:

- `modules/access/supabase-auth.ts`
  - `supabase.auth.signInWithPassword(...)`
  - `supabase.auth.getSession()`
  - `supabase.from("profiles").select("id, organization_id, name, email, role, is_active").eq("id", user.id).maybeSingle()`

### No fluxo de CRM via Supabase no browser

Leituras/escritas client-side existentes no checkout:

- `crm_leads`
- `crm_lead_notes`

Arquivos relevantes:

- `modules/crm/repositories/supabase-crm-repository.ts`
- `modules/crm/repositories/authenticated-supabase-crm-repository.ts`
- `modules/crm/repositories/crm-lead-notes-repository.ts`

Esses fluxos dependem de Data API para tabelas de CRM quando o browser acessa o Supabase diretamente.

## 5. Diagnostico sobre `profiles`

`profiles` e lida no navegador, sim.

Conclusoes:

- `profiles` e parte obrigatoria do login Supabase atual.
- O login nao usa `profiles` apenas como dado opcional; ele depende dela para validar acesso.
- Se `profiles` nao estiver acessivel pela Data API, o login falha mesmo com `auth.users` valido.
- Nao ha escrita em `profiles` durante o login.
- O login faz apenas `SELECT`.

Portanto:

- `profiles` precisa estar acessivel via Data API.
- Como contem `organization_id`, `role`, `email` e status operacional, nao deve ser exposta sem controle.
- O modelo correto e `Data API enabled + RLS enabled + policy de SELECT minima para o proprio usuario autenticado`.

## 6. Diagnostico sobre `organizations`

`organizations` nao e lida no fluxo atual de login Supabase.

O login usa apenas `organization_id` vindo de `profiles`. Nao existe consulta browser-side direta a `organizations` para validar acesso inicial.

Implicacao:

- `organizations` nao parece ser o gargalo atual do login.
- O problema principal continua concentrado em `profiles`.

## 7. Diferenca entre RLS, Data API e policies

### Data API

Controla se a tabela pode ser acessada via chamadas de dados do Supabase por client libraries como `supabase.from("profiles")`.

Se estiver desabilitada:

- o browser nao consegue consultar a tabela;
- a consulta falha antes mesmo de a policy ser relevante para esse fluxo.

### RLS

Controla quais linhas um usuario autenticado pode ler/escrever quando acessa a tabela via Data API.

Se estiver habilitada sem policy adequada:

- a tabela pode ficar acessivel pela API;
- mas o usuario nao consegue ler nada.

### Policies

Sao as regras concretas aplicadas quando RLS esta habilitada.

Para este caso, a policy minima conceitual e:

```sql
auth.uid() = id
```

Ou seja, cada usuario autenticado le apenas o proprio profile.

## 8. Risco atual

Risco operacional imediato:

- Supabase Auth autentica, mas o EVOLV nao consegue concluir acesso.

Risco de seguranca se habilitar Data API isoladamente:

- se `profiles` ficar acessivel pela API sem RLS, existe risco de exposicao indevida de perfis;
- o browser passaria a consultar uma tabela com dados organizacionais e papeis sem isolamento adequado.

Risco de habilitar RLS sem policies completas:

- o login pode continuar falhando;
- usuarios validos podem ficar bloqueados;
- CRM e notas podem herdar falhas se usarem o mesmo padrao de client-side access.

## 9. Correcao minima futura recomendada

Correcao minima conceitual:

1. Habilitar `profiles` na Data API.
2. Habilitar RLS em `profiles`.
3. Criar policy de `SELECT` apenas para `authenticated`.
4. Restringir a leitura ao proprio usuario:

```sql
auth.uid() = id
```

5. Nao permitir leitura publica `anon`.
6. Nao permitir `UPDATE` ou `DELETE` pelo client sem policy especifica e motivo claro.
7. Testar login Supabase.
8. So depois testar CRM.
9. So depois continuar o smoke test de notas.

## 10. SQL conceitual futuro

Sem criar arquivo `.sql`, o desenho conceitual seria:

```sql
-- habilitar Data API para public.profiles no painel

alter table public.profiles enable row level security;

create policy "Profiles self select"
on public.profiles
for select
to authenticated
using (auth.uid() = id);
```

Nao recomendado nesta fase:

```sql
-- leitura anon de profiles
to anon

-- update/delete amplos no client
for update using (true)
for delete using (true)
```

## 11. Ordem segura de correcao futura

1. Habilitar Data API de `profiles`.
2. Habilitar RLS em `profiles`.
3. Criar policy minima de `SELECT` para `authenticated`.
4. Confirmar que nao existe leitura `anon` aberta.
5. Testar login Supabase.
6. Testar refresh de pagina.
7. Testar abertura do CRM.
8. Testar abertura de lead.
9. Testar criacao de nota.
10. So depois avaliar ajustes em outras tabelas client-side, se necessario.

## 12. Criterio de aprovacao para desbloquear 99H.3

99H.3 so deve ser considerado desbloqueado quando:

- login Supabase concluir sem erro generico;
- `loadValidatedProfile()` conseguir ler `profiles`;
- refresh mantiver sessao;
- usuario acessar CRM normalmente;
- lead abrir normalmente;
- nota puder ser criada;
- nao houver leitura publica indevida de `profiles`.

## 13. Status da 99I

Status: **bloqueada**.

Motivo:

- o fluxo de Supabase Auth ainda nao conclui acesso com sucesso;
- `profiles` parece indisponivel pela Data API;
- sem isso, nao e seguro prosseguir para o smoke test completo de CRM e notas.

## 14. Conclusao

O problema atual nao parece ser dado invalido em `auth.users` ou `profiles`. O problema mais provavel e de acesso: o browser precisa ler `profiles`, mas a tabela aparenta estar com Data API desabilitada.

A resposta curta para a pergunta operacional e:

- **sim**, tecnicamente da para habilitar Data API pelo painel;
- **nao**, nao e seguro fazer isso isoladamente, sem habilitar RLS e sem criar ao menos a policy minima `auth.uid() = id`.

## 15. Checklist final

- Apenas documentacao criada.
- Nenhum codigo alterado.
- Nenhum SQL executado.
- Nenhuma migration criada.
- Nenhum servidor iniciado.
- Nenhum build, lint ou typecheck executado.
- Nenhuma alteracao no Supabase.
- Nenhuma alteracao em producao.
- Diretorio proibido `C:\\Users\\camil\\Documents\\Codex` nao utilizado.
