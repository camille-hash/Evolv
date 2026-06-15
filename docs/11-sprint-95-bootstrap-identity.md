# Sprint 95.2 - Bootstrap Seguro De Identidade

## Objetivo

Preparar artefatos manuais para introducao futura do Supabase Auth sem alterar o comportamento atual do CRM, login, frontend, repositories, flags ou banco de dados.

Se Bruno perceber qualquer diferenca operacional apos esta sprint, a implementacao esta incorreta.

## Artefatos Criados

- `supabase/sql/20260614_sprint95_create_default_organization.sql`
- `supabase/sql/20260614_sprint95_profiles_bootstrap_template.sql`
- `supabase/sql/20260614_sprint95_validation_queries.sql`

## Procedimento Manual Futuro

1. Rodar `20260614_sprint95_validation_queries.sql` no SQL Editor para observar o estado atual.
2. Confirmar que `organizations` e `profiles` existem.
3. Confirmar que `auth.users` ja possui os usuarios reais criados manualmente no Supabase Auth.
4. Rodar `20260614_sprint95_create_default_organization.sql` somente apos revisao.
5. Copiar os UUIDs reais de `auth.users`.
6. Editar localmente o template `20260614_sprint95_profiles_bootstrap_template.sql` substituindo placeholders por UUIDs/e-mails reais.
7. Rodar o template apenas em ambiente controlado.
8. Reexecutar `20260614_sprint95_validation_queries.sql`.
9. Nao ativar RLS nesta etapa.
10. Nao alterar `NEXT_PUBLIC_USE_SUPABASE_AUTH` nesta etapa.

## Organizacao Padrao

Slug previsto:

`patrion-evolv`

Nome previsto:

`Patrion EVOLV`

O SQL de organizacao e idempotente e usa `on conflict (slug) do nothing`.

## Profiles

O template de profiles usa UUIDs explicitos porque `profiles.id` deve corresponder ao `auth.users.id`.

Nao inventar UUIDs.

Nao criar profiles antes dos usuarios existirem em Supabase Auth.

Roles previstas:

- Camille: `admin`
- Bruno: `admin`
- SDRs: `sdr`

## O Que Esta Sprint Nao Faz

- Nao altera `crm_leads`.
- Nao altera tabelas `crm_*`.
- Nao altera repositories.
- Nao altera frontend.
- Nao altera login.
- Nao altera middleware.
- Nao altera flags `NEXT_PUBLIC_USE_*`.
- Nao executa SQL automaticamente.
- Nao executa migrations.
- Nao usa Supabase CLI.
- Nao cria policies.
- Nao altera policies.
- Nao habilita nem desabilita RLS.
- Nao altera `auth.users`.
- Nao altera `.env`.
- Nao altera Vercel.
- Nao regenera chaves.

## Riscos Identificados

- Inserir profile com UUID diferente de `auth.users.id` quebra a validacao minima de profile.
- Criar profile antes do usuario existir em Auth viola a estrategia oficial.
- Usar e-mail placeholder em producao gera identidade invalida.
- Ativar Auth antes de profiles validos bloqueia usuarios.
- Ativar RLS antes do backfill/validation pode tornar o CRM invisivel.
- Alterar `crm_leads` nesta etapa poderia afetar os 763 leads reais.

## Checklist Antes De Qualquer Execucao Manual

- Backup validado.
- Usuario Auth criado manualmente.
- UUID real do usuario Auth copiado.
- E-mail real confirmado.
- Role revisada.
- Organizacao `patrion-evolv` confirmada.
- SQL revisado por duas pessoas.
- Nenhuma flag de Auth alterada.

## Checklist Depois Da Execucao Manual Futura

- `organizations` contem `patrion-evolv`.
- `profiles` contem apenas IDs que existem em `auth.users`.
- Camille e Bruno aparecem como `admin`.
- SDRs aparecem como `sdr`.
- `profiles.is_active = true` nos usuarios que devem acessar.
- Nenhuma tabela CRM foi modificada.
- RLS continua no estado planejado para a etapa.

## Proximo Passo Seguro

Executar apenas as queries de validacao, revisar resultados e confirmar manualmente os UUIDs reais de `auth.users` antes de qualquer insert futuro de profile.

