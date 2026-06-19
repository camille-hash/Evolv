# Sprint 103A.32 - Lead-Centric Simulation RLS Refinement

## Objetivo

Refinar o pacote SQL criado na Sprint 103A.30 para corrigir a ressalva apontada na Sprint 103A.31:

```text
As policies de insert/update validavam organization_id, mas nao garantiam explicitamente que lead_id pertence a mesma organizacao.
```

Esta sprint nao executou SQL e nao alterou banco, Auth, RLS real, policies reais, CRM, Simulador, Multi-Cotas, Timeline, PDF ou codigo TypeScript/React.

## Arquivos criados

- `docs/98-sprint-103a32-lead-simulation-rls-refinement.md`

## Arquivos alterados

- `supabase/sql/20260619_sprint103a30_lead_simulations_apply.sql`
- `supabase/sql/20260619_sprint103a30_lead_simulations_validation.sql`

## Arquivos revisados sem alteracao

- `supabase/sql/20260619_sprint103a30_lead_simulations_rollback.sql`

## Problema de seguranca/integridade corrigido

Como `public.crm_lead_simulations` e uma tabela lead-centric, nao basta validar que a simulacao possui:

```text
organization_id = public.evolv_current_organization_id()
```

Tambem e obrigatorio garantir que:

```text
lead_id pertence a public.crm_leads da mesma organization_id do usuario autenticado
```

Sem essa regra, uma escrita direta via Data API poderia criar uma simulacao com `organization_id` correto, mas associada a um lead de outra organizacao. Isso nao necessariamente exporia dados de outra organizacao, mas criaria inconsistencia multi-tenant grave para auditoria, timeline futura e metricas.

## Nova regra de insert

A policy de insert agora exige simultaneamente:

```text
organization_id = public.evolv_current_organization_id()
```

e:

```text
exists (
  select 1
  from public.crm_leads lead
  where lead.id = lead_id
    and lead.organization_id = public.evolv_current_organization_id()
)
```

Resultado esperado:

- simulacao so pode nascer na organizacao autenticada;
- simulacao so pode apontar para lead da organizacao autenticada;
- `organization_id` nao depende da UI como fonte confiavel;
- o futuro service continua responsavel por resolver campos confiaveis server-side.

## Nova regra de update

A policy de update agora aplica duas camadas.

### `using`

Valida a linha atual:

```text
organization_id = public.evolv_current_organization_id()
and lead_id pertence a crm_leads da organizacao autenticada
```

### `with check`

Valida a nova versao da linha:

```text
organization_id = public.evolv_current_organization_id()
and lead_id pertence a crm_leads da organizacao autenticada
```

Resultado esperado:

- o usuario autenticado so atualiza simulacoes da sua propria organizacao;
- se `lead_id` for alterado no futuro, o novo lead tambem precisa pertencer a mesma organizacao;
- se `organization_id` for enviado no update, ele precisa permanecer igual a organizacao autenticada;
- a policy reduz risco de vinculo cross-organization.

Observacao:

Uma policy nao compara diretamente valor antigo versus novo para impedir toda mudanca de `organization_id`. Ela garante que a linha atual e a linha resultante permanecem dentro da organizacao autenticada. Para bloquear imutabilidade absoluta de `organization_id`, seria necessaria regra adicional futura, como trigger ou service-only update. Para V1, a policy refinada atende o isolamento exigido.

## Decisao final de `source`

Foi removido o valor ambiguo:

```text
manual
```

Valores finais aceitos:

```text
lead_detail
simulator
multi_cotas
api
```

Default final:

```text
api
```

Racional:

- `lead_detail`: simulacao iniciada a partir do dossie do lead;
- `simulator`: simulacao iniciada pelo simulador comercial;
- `multi_cotas`: simulacao iniciada pelo fluxo Multi-Cotas;
- `api`: criacao server-side/generica, sem atribuir origem visual incorreta.

## Melhorias no validation

O validation continua read-only e recebeu novas verificacoes para:

- existencia da FK para `public.crm_leads`;
- policy de insert contendo validacao de `crm_leads`, `lead_id`, `organization_id` e `public.evolv_current_organization_id()`;
- policy de update validando linha atual com `qual`;
- policy de update validando nova linha com `with_check`;
- ausencia de policy ampla com `true`;
- alinhamento final dos valores de `source`;
- manutencao das checagens existentes de:
  - policies esperadas;
  - ausencia de delete policy;
  - ausencia de anon policy;
  - grants corretos;
  - helper `public.evolv_current_organization_id()`;
  - trigger `set_updated_at`.

## Revisao do rollback

O rollback foi revisado e permanece coerente.

Nao foi necessario altera-lo porque:

- os nomes das policies nao mudaram;
- o trigger nao mudou;
- a tabela nao mudou de nome;
- o rollback continua removendo somente artefatos de `public.crm_lead_simulations`;
- nao remove helper functions;
- nao toca em `crm_leads`, `profiles`, `organizations`, `crm_tasks` ou `crm_lead_notes`.

Aviso permanece valido:

```text
Rollback destrutivo so deve ser usado antes de simulacoes reais serem criadas, ou apos backup/export verificado e aprovacao explicita.
```

## Confirmacoes

- Nenhum SQL foi executado.
- Nenhum apply foi executado.
- Nenhum validation foi executado.
- Nenhum rollback foi executado.
- Nenhum banco foi alterado.
- Nenhuma migration foi criada.
- Nenhum schema real foi alterado.
- Nenhum Auth foi alterado.
- Nenhum RLS real foi alterado.
- Nenhuma policy real foi alterada.
- Nenhum endpoint, repository, service, UI ou componente foi criado.
- CRM, Simulador, Multi-Cotas, Timeline e PDF nao foram alterados.

## Parecer sobre nova readiness review

O pacote ficou mais forte do ponto de vista multi-tenant e elimina a ressalva principal da Sprint 103A.31.

Mesmo assim, antes de execucao manual, recomenda-se uma nova readiness review curta para:

- revisar a expressao final das policies;
- revisar se `source = 'api'` como default atende a operacao;
- confirmar que validation permanece read-only;
- confirmar que rollback continua limitado;
- emitir um GO/NO-GO final para janela manual.

## Recomendacao para Sprint 103A.33

Recomenda-se:

```text
Sprint 103A.33 - Lead-Centric Simulation SQL Package Final Readiness
```

Objetivo sugerido:

- revisar o pacote refinado;
- nao executar SQL;
- confirmar que a ressalva de RLS foi encerrada;
- produzir parecer final para futura execucao manual controlada.
