# Sprint 101B.8 — Functions Verification

## Itens auditados

- `public.evolv_current_organization_id()`
- `public.evolv_current_role()`

## Fonte da evidencia

Chamadas read-only via RPC com o client Supabase configurado localmente:

- `rpc('evolv_current_organization_id')`
- `rpc('evolv_current_role')`

## Evidencia observada

Ambas as chamadas retornaram erro `PGRST202`:

- `Could not find the function public.evolv_current_organization_id without parameters in the schema cache`
- `Could not find the function public.evolv_current_role without parameters in the schema cache`

## Interpretacao segura

Com base apenas no que foi observado, estas funcoes:

- nao estao disponiveis no schema cache acessivel por este caminho; ou
- nao existem nesse ambiente; ou
- existem, mas nao estao expostas/acessiveis pela rota de consulta utilizada.

## Informacao faltante

Faltou a confirmacao privilegiada de:

- existencia real da funcao no banco;
- definicao da funcao;
- schema ownership;
- permissao de execucao;
- eventual indisponibilidade apenas no caminho publico/Data API.

## Por que faltou

Nao foi encontrado no checkout um caminho administrativo read-only com credencial suficiente para inspecionar catalogo de funcoes.

## Risco

Alto.

## Impacto

Sem confirmar a existencia e acessibilidade dessas funcoes, permanece bloqueada a confianca operacional nas policies e helpers organization-scoped desenhados para o Dual Pipeline.

## Conclusao

As funcoes organizacionais seguem **nao verificadas de forma privilegiada**. O estado atual deve ser tratado como bloqueio ate que uma verificacao administrativa read-only confirme existencia e comportamento.
