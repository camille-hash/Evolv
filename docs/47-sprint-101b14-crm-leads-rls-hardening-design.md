# Sprint 101B.14 — CRM Leads RLS Hardening Design

## Resumo executivo

Esta sprint desenha a migracao controlada das policies atuais de `public.crm_leads` para um modelo organization-scoped baseado nas funcoes ja existentes e validadas:

- `public.evolv_current_organization_id()`
- `public.evolv_current_role()`

O objetivo nao e executar a migracao agora. O objetivo e produzir um desenho seguro para substituir gradualmente as policies bridge permissivas por policies que restrinjam leitura e atualizacao aos leads da organizacao do usuario autenticado.

## Contexto confirmado

Tabela:

- `public.crm_leads`

RLS:

- habilitado

Policies atuais:

- `Allow public read crm_leads`
- `Allow public update crm_leads`
- `Authenticated bridge read crm_leads`
- `Authenticated bridge update crm_leads`

As policies atuais ainda usam condicoes permissivas:

- `qual = true`
- `with_check = true`

Funcoes organizacionais:

- `public.evolv_current_organization_id()` existe
- `public.evolv_current_role()` existe
- ambas foram validadas na Sprint 101B.13

## Arquitetura atual

O modelo atual preserva operacao, mas ainda nao representa o estado final de seguranca:

```text
Browser / App
↓
Supabase Auth ou bridge authenticated
↓
crm_leads RLS enabled
↓
Policies permissivas com true
↓
Acesso operacional preservado, mas sem isolamento organizacional real em crm_leads
```

## Arquitetura alvo

O modelo alvo usa `profiles` e as funcoes canonicas como fonte de contexto organizacional:

```text
Supabase Auth
↓
profiles
↓
evolv_current_organization_id()
evolv_current_role()
↓
crm_leads RLS organization-scoped
↓
SELECT / UPDATE apenas dentro da organizacao do usuario autenticado
```

## Policies futuras desenhadas

### SELECT

Leitura deve ser permitida apenas quando:

```text
crm_leads.organization_id = public.evolv_current_organization_id()
```

Role alvo:

- `authenticated`

Sem policy para:

- `anon`

### UPDATE

Atualizacao deve ser permitida apenas quando:

```text
USING:
crm_leads.organization_id = public.evolv_current_organization_id()

WITH CHECK:
crm_leads.organization_id = public.evolv_current_organization_id()
```

Role alvo:

- `authenticated`

Sem policy para:

- `anon`

## Por que manter convivencia temporaria

A remocao imediata das bridge policies pode quebrar o CRM caso algum fluxo ainda dependa do caminho antigo.

Por isso, o desenho recomenda uma janela curta de convivencia:

```text
Bridge policies atuais
+
Organization-scoped policies novas
↓
validacao operacional
↓
remocao controlada das bridge policies
```

## Criterios para remover bridge policies

Remover as bridge policies somente se todos os criterios forem verdadeiros:

- login Supabase Auth funcionando;
- CRM lista leads;
- CRM abre dossie;
- CRM edita lead;
- Lead Notes continua funcionando;
- Recovery continua funcionando;
- `crm_leads` permanece com 763 registros esperados;
- nenhum erro de permissao em fluxo operacional;
- evidence baseline da 101B.13 permanece valido;
- rollback testado conceitualmente e disponivel.

## Impacto potencial

### CRM

Risco alto, pois `crm_leads` e a tabela operacional central.

### Auth

Risco medio, pois a policy alvo depende de contexto autenticado correto.

### Lead Notes

Risco baixo a medio, pois ja usa isolamento por organizacao, mas deve ser testado apos qualquer alteracao de RLS em `crm_leads`.

### `crm_stage_events`

Sem impacto imediato, pois ainda e dominio futuro. A arquitetura alvo deve ser reutilizada quando a tabela existir.

### `crm_green_flags`

Sem impacto imediato, mas deve nascer com o mesmo modelo organization-scoped.

### Dual Pipeline

Risco estrategico alto se o Dual Pipeline nascer antes de `crm_leads` estar endurecido. O hardening de `crm_leads` deve ser baseline de seguranca para o Dual Pipeline.

## Riscos principais

- policy nova bloqueando usuario legitimo;
- policy nova permitindo update fora da organizacao;
- remocao precoce de bridge policy;
- dependencia residual de `anon`;
- diferenca entre ambiente de teste e producao.

## Conclusao

O EVOLV esta pronto para desenhar o hardening, mas a aplicacao deve ocorrer em sprint separada, com janela controlada, validacao paralela e rollback documentado.

Esta sprint nao executa SQL, nao altera Supabase e nao altera producao.
