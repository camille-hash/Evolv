# Bootstrap e Backfill Para Auth + Profiles + RLS

Este plano prepara a ativacao segura de Supabase Auth, profiles e RLS no EVOLV sem executar SQL nesta sprint.

## Objetivo

Definir uma ordem operacional segura para:

- criar a organizacao padrao Patrion/EVOLV;
- criar profiles minimos vinculados a usuarios ja existentes em Supabase Auth;
- preencher `organization_id` nos leads atuais;
- validar que os 763 leads continuam visiveis antes de ativar RLS;
- reduzir risco de CRM vazio apos a mudanca.

## Pre-Requisitos

- A migration oficial de Auth/Profiles/CRM deve estar revisada e aprovada.
- Usuarios precisam existir previamente em Supabase Auth.
- E-mails reais de Camille, Bruno e SDRs precisam estar definidos.
- A organizacao padrao deve existir antes da criacao dos profiles.
- Profiles devem existir antes de ligar `NEXT_PUBLIC_USE_SUPABASE_AUTH=true`.
- `crm_leads.organization_id` deve estar preenchido antes de habilitar RLS operacional.
- O total esperado de leads deve continuar em 763 antes e depois do backfill.

## Ordem Segura De Execucao Futura

1. Executar diagnostico em ambiente de teste/staging.
2. Confirmar estrutura real de `organizations`, `profiles` e `crm_leads`.
3. Confirmar existencia dos usuarios em Supabase Auth.
4. Criar organizacao padrao `patrion-evolv` se ela ainda nao existir.
5. Criar profiles minimos para os usuarios existentes em `auth.users`.
6. Validar profiles por organizacao e role.
7. Preencher `crm_leads.organization_id` apenas onde estiver `null`.
8. Validar total de leads, leads sem organizacao e distribuicao por organizacao.
9. Testar login com `NEXT_PUBLIC_USE_SUPABASE_AUTH=true` em ambiente controlado.
10. Testar leitura do CRM com RLS em staging.
11. Somente depois repetir em producao com janela operacional definida.

## Rollback

Rollback funcional imediato:

- desligar `NEXT_PUBLIC_USE_SUPABASE_AUTH`;
- manter login local ativo;
- manter CRM sem depender de RLS ate validacao final.

Rollback de dados em ambiente de teste:

- desfazer associacao de `organization_id` apenas para registros que foram alterados no teste;
- preservar qualquer lead que ja tinha organizacao antes do backfill;
- nunca apagar leads para reverter o teste.

Em producao, rollback deve ser precedido de backup e contagem antes/depois. Nao executar comandos destrutivos sem aprovacao formal.

## Checklist Antes De Aplicar

- Confirmar backup recente do Supabase.
- Confirmar que a migration oficial nao falha em staging.
- Confirmar organizacao padrao `patrion-evolv`.
- Confirmar usuarios existentes em Supabase Auth.
- Confirmar e-mails reais de Camille, Bruno e SDRs.
- Confirmar que `profiles.id = auth.users.id`.
- Confirmar que `crm_leads.organization_id` existe.
- Confirmar total esperado de 763 leads.
- Confirmar que nenhum lead sera sobrescrito se ja possuir `organization_id`.

## Checklist Depois De Aplicar

- Total de leads continua 763.
- Leads sem `organization_id` = 0.
- Profiles possuem `organization_id` preenchido.
- Profiles possuem role valida: `admin` ou `sdr`.
- Camille e Bruno estao como `admin`.
- SDRs estao como `sdr`.
- Usuario inativo nao acessa.
- Usuario sem profile nao acessa.
- Usuario sem organizacao nao acessa.
- CRM nao fica vazio apos RLS em staging.

## Smoke Test

1. Entrar com usuario admin em staging.
2. Validar que o profile carregado possui `organization_id`.
3. Validar que o dashboard abre normalmente.
4. Validar que CRM lista os 763 leads esperados.
5. Validar que leads aparecem apenas da organizacao padrao.
6. Entrar com SDR.
7. Validar acesso apenas as areas permitidas.
8. Validar que SDR nao consegue excluir leads quando RLS estiver ativo.
9. Desativar temporariamente a feature flag e confirmar rollback para login local.

## Riscos

- Aplicar RLS antes do backfill pode deixar o CRM vazio.
- Criar profiles antes dos usuarios Supabase gera IDs incorretos e quebra `profiles.id = auth.users.id`.
- Usar e-mails placeholders sem substituir por e-mails reais pode criar profiles incompletos.
- Ambientes com migrations antigas podem ter `crm_leads` divergente.
- Leads importados sem `organization_id` precisam de backfill antes da ativacao real.

## Decisoes Pendentes

- Definir e-mails reais dos usuarios iniciais.
- Confirmar se todos os 763 leads pertencem inicialmente a Patrion/EVOLV.
- Definir janela de aplicacao em producao.
- Definir se `organizations` tambem recebera RLS na mesma etapa ou em sprint dedicada.
- Definir plano de auditoria para alteracoes futuras em leads e profiles.

## Arquivo SQL Preparado

O roteiro SQL estatico esta em:

`supabase/sql/20260613_bootstrap_backfill_plan.sql`

Ele nao deve ser executado automaticamente. Deve ser revisado, ajustado com e-mails reais e aplicado manualmente apenas em ambiente controlado.
