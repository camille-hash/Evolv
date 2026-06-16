# Sprint 99H.3B - Profiles Data API + RLS Self-Select Proposal

## 1. Resumo executivo

O bloqueio atual do EVOLV esta no acesso client-side a `public.profiles`.

O Supabase Auth autentica corretamente o usuario, mas o app so conclui o login quando consegue ler o proprio profile no navegador. Como `profiles` esta com `API Disabled`, a validacao falha mesmo com os dados corretos em `auth.users` e `profiles`.

Para destravar esse ponto com seguranca, `profiles` precisa ficar disponivel para Data API, mas protegida por RLS. A policy minima recomendada deve permitir somente que o usuario autenticado leia o proprio profile.

Nada foi executado nesta sprint. Esta entrega e apenas uma proposta tecnica com SQL conceitual, ordem segura, rollback e validacao.

## 2. Problema atual

Estado atual confirmado:

- `profiles` aparece como `API Disabled`;
- o login Supabase passa;
- o EVOLV falha ao validar o profile;
- os dados do profile estao corretos:
  - `profiles.id = auth.users.id`
  - `email` correto
  - `organization_id` preenchido
  - `role = admin`
  - `is_active = true`

Conclusao:

- a falha esta no acesso a `profiles`, nao no conteudo de `profiles`.

## 3. Fluxo afetado

Fluxo atual:

```text
LoginPage
-> signInWithSupabaseAuth(email, password)
-> supabase.auth.signInWithPassword()
-> loadValidatedProfile(supabase, data.user)
-> supabase.from("profiles").select(...).eq("id", user.id).maybeSingle()
-> isValidProfile(profile)
-> acesso liberado
```

Se a leitura falha:

```text
loadValidatedProfile() retorna null
-> signOutFromSupabaseAuth()
-> erro final:
"Nao foi possivel concluir seu acesso. Entre em contato com o administrador."
```

Na restauracao de sessao, o mesmo padrao reaparece:

```text
loadSupabaseCurrentUser()
-> supabase.auth.getSession()
-> loadValidatedProfile()
```

Logo, o login Supabase atual depende diretamente de `profiles` acessivel pela Data API.

## 4. Proposta de arquitetura segura

Desenho recomendado:

- habilitar Data API para `public.profiles`;
- habilitar RLS em `public.profiles`;
- criar policy de `SELECT` apenas para `authenticated`;
- usar a condicao:

```sql
auth.uid() = id
```

- nao criar policy para `anon`;
- nao permitir `INSERT`, `UPDATE` ou `DELETE` pelo client nesta etapa;
- manter as alteracoes pequenas, documentadas e reversiveis.

Esse desenho atende o contrato atual do frontend:

- o navegador precisa apenas ler o proprio profile;
- o login nao precisa escrever em `profiles`;
- a validacao local de `organization_id`, `role` e `is_active` continua sob controle do EVOLV.

## 5. SQL conceitual futuro

SQL conceitual, sem criar migration real nem executar nada nesta sprint:

```sql
alter table public.profiles enable row level security;

create policy "Profiles can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);
```

Complemento operacional fora do SQL:

- habilitar `profiles` na Data API pelo painel do Supabase.

O que nao deve ser criado nesta etapa:

- policy `anon`;
- policy de `insert`;
- policy de `update`;
- policy de `delete`.

## 6. Por que essa proposta e segura

Ela reduz o escopo ao minimo necessario:

- expoe apenas leitura;
- restringe a leitura ao proprio usuario autenticado;
- evita acesso publico;
- evita escrita client-side;
- resolve exatamente o gargalo atual do login, sem mexer em CRM, notas ou outras tabelas.

## 7. Riscos se executar errado

Se habilitar Data API sem RLS:

- risco de exposicao indevida de `email`, `organization_id`, `role` e `is_active` de outros usuarios.

Se habilitar RLS sem policy adequada:

- o login continuara falhando;
- usuarios validos podem ficar bloqueados.

Se criar policy ampla demais:

- pode surgir leitura lateral entre usuarios autenticados.

## 8. Ordem segura de execucao futura

Sequencia recomendada:

1. habilitar Data API para `profiles`;
2. habilitar RLS em `profiles`;
3. criar policy minima de self-select para `authenticated`;
4. confirmar ausencia de acesso `anon`;
5. testar login Supabase;
6. testar refresh da pagina;
7. testar carregamento do CRM;
8. testar abertura de lead;
9. testar criacao de nota;
10. so depois avaliar se outras tabelas browser-side precisam do mesmo tratamento.

## 9. Rollback proposto

Rollback conceitual, se a futura aplicacao falhar:

1. remover a policy criada para `profiles`;
2. reavaliar se RLS deve permanecer habilitado ou voltar ao estado anterior;
3. se necessario, desabilitar a Data API de `profiles` no painel;
4. manter `NEXT_PUBLIC_USE_SUPABASE_AUTH` desligada ate nova validacao completa.

Sinais para rollback:

- login continua falhando;
- leitura de `profiles` retorna vazio ou erro inesperado;
- aparece qualquer indicio de exposicao indevida;
- CRM ou notas passam a falhar por regressao de acesso.

## 10. Validacao futura

Checklist quando a proposta for aplicada:

- login nao retorna mais erro generico;
- `loadValidatedProfile()` consegue ler `profiles`;
- refresh mantem sessao;
- usuario entra no CRM;
- lead abre normalmente;
- nota pode ser criada;
- tentativa `anon` de leitura em `profiles` continua bloqueada;
- usuario autenticado nao consegue ler profile de outro usuario.

## 11. Criterio de aprovacao para desbloquear 99H.3

99H.3 so deve ser considerado concluido quando:

- `profiles` estiver acessivel pela Data API;
- RLS estiver habilitado;
- policy de self-select estiver funcional;
- login Supabase concluir com profile valido;
- CRM abrir normalmente;
- smoke test de nota passar.

## 12. Status da 99I

Status: **bloqueada**.

Motivo:

- a correcao ainda esta apenas proposta;
- nada foi aplicado no Supabase;
- sem leitura segura de `profiles`, o EVOLV continua falhando apos o login Supabase.

## 13. Conclusao

O frontend nao parece ser o problema aqui. O contrato atual do app esta coerente: ele precisa ler o proprio profile logo apos autenticar o usuario.

A menor correcao segura esta no Supabase: habilitar Data API para `profiles`, ligar RLS e criar uma policy estrita de self-select com `auth.uid() = id`. Isso resolve o bloqueio do login sem abrir leitura publica e sem introduzir escrita client-side desnecessaria.
