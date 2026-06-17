# Sprint 101B.8 — Privileged Read-Only Verification of Profiles, Functions and RLS

## Objetivo

Obter evidencia real, em modo somente leitura, sobre:

- `profiles`
- funcoes organizacionais
- RLS atual
- policies atuais
- grants atuais

para reavaliar os bloqueios apontados na Sprint 101B.7.

## Escopo executado

Esta sprint permaneceu em modo estritamente investigativo:

- leitura de arquivos locais do checkout;
- verificacao de ambiente local;
- consultas read-only via client Supabase configurado no proprio repo;
- consolidacao documental das evidencias.

Nao houve:

- SQL de alteracao;
- migration;
- deploy;
- alteracao de codigo;
- alteracao de schema;
- alteracao de dados.

## Fonte real de acesso disponivel

Neste checkout, a unica rota de consulta efetivamente disponivel foi o client browser/publico configurado em `.env.local`, com:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Nao foi encontrada credencial privilegiada reutilizavel no repo para:

- `SUPABASE_SERVICE_ROLE_KEY`
- conexao direta Postgres
- outro caminho administrativo read-only

Impacto: esta sprint conseguiu produzir evidencia real do caminho publico configurado no ambiente local, mas nao conseguiu realizar uma verificacao verdadeiramente privilegiada de catalogo, grants e policies internas do banco.

## Evidencias observadas

### 1. `crm_leads`

Consulta read-only bem-sucedida via Supabase:

- total de registros: `763`
- `organization_id` nulo: `0`
- distribuicao observada:
  - `ca9fc6a1-8b37-4d13-9435-3458df9c5213`: `763`

Conclusao: a base operacional principal continua consistente no recorte observado.

### 2. `profiles`

Consulta read-only em `public.profiles` respondeu sem erro estrutural, mas com:

- `count = 0`
- amostra retornada = `[]`

Isso prova apenas que o caminho atualmente usado nao observou registros visiveis via essa credencial publica. Nao prova, por si so, ausencia absoluta de registros no banco nem consistencia interna de ownership/perfis.

### 3. Funcoes organizacionais

As chamadas RPC para:

- `public.evolv_current_organization_id()`
- `public.evolv_current_role()`

retornaram erro `PGRST202`, informando que as funcoes nao foram encontradas no schema cache acessivel por esse caminho.

Conclusao: nesta rota de consulta, as funcoes nao estao disponiveis. Isso nao permite afirmar com seguranca se elas nao existem no banco ou se apenas nao estao expostas/acessiveis pelo caminho observado.

### 4. Novas tabelas Dual Pipeline

Consultas read-only para:

- `public.crm_stage_events`
- `public.crm_green_flags`

retornaram erro `PGRST205`, informando que as tabelas nao foram encontradas no schema cache.

Conclusao: isso e coerente com o estado esperado ate aqui: os SQLs do Dual Pipeline foram preparados documentalmente, mas nao aplicados.

## Evidencias nao obtidas

Nao foi possivel obter, de forma privilegiada e conclusiva, nesta sprint:

- inventario completo de RLS por tabela;
- inventario completo de policies por role;
- inventario completo de grants para `anon`, `authenticated` e `service_role`;
- confirmacao administrativa da contagem real de `profiles`;
- confirmacao administrativa da existencia interna das funcoes organizacionais.

### Motivo

O checkout nao forneceu credencial administrativa ou conexao privilegiada read-only. O unico caminho operacional observado foi o client publico configurado no repo.

### Impacto

Sem essa visibilidade privilegiada, os bloqueios da Sprint 101B.7 nao podem ser considerados superados apenas com base nas evidencias desta sprint.

## Parecer consolidado

### Pontos favoraveis confirmados

- `crm_leads` continua acessivel e consistente no recorte validado;
- `organization_id` continua preenchido nos 763 registros observados;
- o schema Dual Pipeline ainda nao foi aplicado, o que elimina risco de drift novo introduzido por execucao parcial.

### Pontos ainda bloqueantes

- nao ha evidencia privilegiada suficiente sobre `profiles`;
- nao ha evidencia privilegiada suficiente sobre funcoes organizacionais;
- nao ha evidencia privilegiada suficiente sobre RLS, policies e grants atuais.

## Conclusao final

**NOT READY FOR CONTROLLED EXECUTION**

Justificativa: a sprint produziu evidencia real relevante sobre `crm_leads` e sobre a ausencia pratica das estruturas Dual Pipeline no schema cache publico, mas nao conseguiu provar, com acesso privilegiado e somente leitura, o estado atual de `profiles`, funcoes organizacionais, RLS, policies e grants. Esses pontos continuam sendo bloqueios materiais para a futura execucao controlada.

## Proxima sprint recomendada

Executar uma sprint de verificacao administrativa com acesso privilegiado real e somente leitura, capaz de responder objetivamente:

- quantos `profiles` existem de fato;
- quais roles/organizacoes estao presentes;
- se `evolv_current_organization_id()` e `evolv_current_role()` existem e funcionam;
- quais policies e grants estao ativos hoje nas tabelas relevantes.
