# Sprint 99H - Supabase Auth Local Flag Test

## 1. Resumo executivo

Esta sprint prepara e documenta o teste local do EVOLV com `NEXT_PUBLIC_USE_SUPABASE_AUTH=true`, antes de qualquer ativacao em producao.

O objetivo do teste e confirmar se o fluxo Supabase Auth resolve a falha `Sessao indisponivel.` no modal `Adicionar Nota`, validando que um usuario autenticado pelo Supabase recebe `access_token`, consegue acessar o CRM, abrir um lead e criar uma nota pela API server-side.

Status desta execucao: **teste preparado, nao executado**.

Motivo: antes de iniciar o teste real, e necessario que Camille confirme manualmente as credenciais Supabase e a existencia/validade dos profiles de Camille e Bruno. Senhas nao devem ser solicitadas nem compartilhadas no chat. O teste deve ser feito localmente com Camille digitando as credenciais no navegador.

## 2. Pre-requisitos confirmados

Confirmacoes obrigatorias antes de executar o teste real:

- [ ] E-mail/login Supabase de Camille confirmado.
- [ ] E-mail/login Supabase de Bruno confirmado.
- [ ] Senhas disponiveis para teste local, digitadas pela propria Camille/Bruno no navegador.
- [ ] Camille existe em Supabase Auth.
- [ ] Bruno existe em Supabase Auth.
- [ ] Camille possui profile em `public.profiles`.
- [ ] Bruno possui profile em `public.profiles`.
- [ ] `profiles.id` corresponde a `auth.users.id`.
- [ ] `organization_id` esta preenchido para ambos.
- [ ] Ambos pertencem a organizacao correta.
- [ ] Roles estao validas: `admin` ou `sdr`.
- [ ] `is_active = true` para ambos.

Nesta execucao, estes pre-requisitos nao foram confirmados por consulta ao Supabase nem por login real. Portanto, a Sprint 99I nao deve ser liberada ainda.

## 3. Ambiente local usado

Diretorio oficial:

```text
C:\Users\camil\OneDrive\Área de Trabalho\PROJETOS DIGITAIS\Evolv
```

Estado da execucao:

- Producao nao alterada.
- Vercel nao alterada.
- Nenhum deploy realizado.
- Nenhum SQL executado.
- Nenhuma migration criada.
- Nenhuma variavel de producao alterada.
- Nenhum codigo funcional alterado.

## 4. Variaveis locais testadas

Variavel principal do teste:

```text
NEXT_PUBLIC_USE_SUPABASE_AUTH=true
```

Variaveis Supabase exigidas:

```text
NEXT_PUBLIC_SUPABASE_URL=<url do projeto Supabase>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

Fallback tecnico aceito pelo codigo:

```text
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

Importante: esta sprint nao alterou `.env`, Vercel ou qualquer variavel real. A flag deve ser aplicada apenas em ambiente local de teste.

Forma recomendada para teste local em PowerShell, sem gravar em arquivo:

```powershell
$env:NEXT_PUBLIC_USE_SUPABASE_AUTH='true'
npm.cmd run dev
```

## 5. Fluxo de login Supabase

Fluxo esperado com a flag ligada:

```text
LoginPage
-> isSupabaseAuthEnabled() retorna true
-> signInWithSupabaseAuth(email, senha)
-> supabase.auth.signInWithPassword()
-> loadValidatedProfile()
-> profiles.id = auth.users.id
-> valida organization_id
-> valida role admin/sdr
-> valida is_active = true
-> app recebe usuario mapeado
```

Criterio de sucesso:

- Login Supabase funciona para Camille.
- Login Supabase funciona para Bruno.
- Mensagem de erro permanece generica se credencial/profile falhar.
- Usuario sem profile valido nao acessa o app.

Status nesta execucao: **nao testado por falta de confirmacao manual das credenciais/profiles**.

## 6. Teste de acesso ao CRM

Fluxo esperado:

```text
Login Supabase concluido
-> app/page.tsx recebe usuario autenticado
-> CRM abre normalmente
-> leads continuam acessiveis conforme configuracao atual do CRM
```

Criterio de sucesso:

- CRM abre apos login Supabase.
- Pipeline carrega.
- Bruno/Camille conseguem visualizar a operacao sem diferenca visual relevante.

Status nesta execucao: **nao testado**.

## 7. Teste de abertura de lead

Fluxo esperado:

```text
CRM aberto
-> clicar em lead
-> abrir Dossie Executivo
-> CTAs preservados
-> botao Adicionar Nota visivel
```

Criterio de sucesso:

- Dossie abre normalmente.
- Nenhum erro de sessao ocorre apenas ao abrir o dossie.
- Modal `Adicionar Nota` pode ser aberto.

Status nesta execucao: **nao testado**.

## 8. Teste de criacao de nota

Fluxo esperado:

```text
Dossie aberto
-> Adicionar Nota
-> escrever conteudo valido
-> Salvar Nota
-> readSupabaseAccessToken()
-> supabase.auth.getSession()
-> access_token disponivel
-> POST /api/crm/lead-notes
-> Authorization: Bearer <token>
-> API valida auth.getUser(accessToken)
-> API valida profile
-> API valida organization_id
-> API valida lead da mesma organizacao
-> nota criada
-> timeline atualizada
```

Criterio de sucesso:

- `Sessao indisponivel.` nao aparece para usuario Supabase autenticado.
- Nota e criada com sucesso.
- Modal fecha apos sucesso.
- Timeline atualiza com a nota criada.

Status nesta execucao: **nao testado**.

## 9. Teste de logout/login

Fluxo esperado:

```text
Usuario logado por Supabase Auth
-> logout
-> supabase.auth.signOut()
-> estado local limpo
-> tela de login exibida
-> novo login Supabase funciona
```

Criterio de sucesso:

- Logout encerra sessao Supabase.
- Login posterior recria sessao.
- CRM continua acessivel.

Status nesta execucao: **nao testado**.

## 10. Teste de refresh de pagina

Fluxo esperado:

```text
Usuario logado por Supabase Auth
-> refresh no navegador
-> loadSupabaseCurrentUser()
-> supabase.auth.getSession()
-> profile validado
-> app permanece acessivel
```

Criterio de sucesso:

- Refresh nao derruba o usuario indevidamente.
- Sessao Supabase persistida e reconhecida.
- CRM abre sem login local.

Status nesta execucao: **nao testado**.

## 11. Erros encontrados

Nenhum erro de runtime foi coletado nesta execucao porque o teste local com credenciais reais nao foi iniciado.

Risco ja conhecido:

- Se o usuario estiver autenticado apenas pelo login local, o modal abre, mas salvar nota falha com `Sessao indisponivel.`.

## 12. Correcoes necessarias

Nenhuma correcao de codigo foi implementada nesta sprint.

Possiveis correcoes futuras, se o teste real falhar:

- Profile ausente: criar/backfill de profile no Supabase antes da ativacao.
- `organization_id` ausente: corrigir profile antes da ativacao.
- Role invalida: ajustar role para `admin` ou `sdr`.
- Usuario Auth inexistente: criar usuario no Supabase Auth.
- Senha desconhecida: executar fluxo de recovery/reset.
- Falha no CRM apos login Supabase: investigar dependencias de permissao ou sessao antes de producao.

## 13. Parecer final

Parecer: **falhou por pre-requisito nao confirmado / teste nao executado**.

A sprint nao pode ser marcada como `passou` porque nao houve login real com Supabase Auth nem criacao real de nota em ambiente local.

A sprint tambem nao prova falha do codigo. Ela prova apenas que nao e seguro avancar sem a confirmacao manual de Auth/profiles e sem smoke test local.

## 14. Recomendacao

Recomendacao: **bloquear 99I ate execucao do teste local com credenciais Supabase confirmadas**.

Ordem recomendada:

1. Camille confirma e-mail Supabase de Camille.
2. Camille confirma e-mail Supabase de Bruno.
3. Camille confirma que ambos possuem senha ou fluxo de recovery disponivel.
4. Camille confirma profiles e `organization_id` no Supabase.
5. Rodar localmente com `NEXT_PUBLIC_USE_SUPABASE_AUTH=true`.
6. Testar login Camille.
7. Testar login Bruno.
8. Testar CRM.
9. Testar abertura de lead.
10. Testar criacao de nota.
11. Testar logout/login.
12. Testar refresh.
13. Somente se tudo passar, liberar Sprint 99I.

## 15. Confirmacoes desta sprint

- Apenas documento criado.
- Nenhum codigo produtivo alterado.
- Nenhuma variavel de producao alterada.
- Nenhuma variavel da Vercel alterada.
- Nenhum deploy realizado.
- Nenhum SQL executado.
- Nenhuma migration criada.
- Nenhum RLS alterado.
- Nenhuma policy alterada.
- Nenhum grant alterado.
- Nenhum usuario criado.
- Nenhum profile editado.
- Nenhum dado de CRM alterado.
- Diretorio proibido `C:\Users\camil\Documents\Codex` nao foi usado, consultado ou modificado.
