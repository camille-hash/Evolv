# Sprint 101B.8 — Profiles Verification

## Item auditado

`public.profiles`

## Fonte da evidencia

Consulta read-only realizada via client Supabase configurado no checkout local, utilizando as variaveis:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Consulta observada:

- `from('profiles').select('id,organization_id,role,is_active', { count: 'exact' }).limit(5)`

## Evidencia observada

Resultado observado:

- erro estrutural: nenhum
- `count = 0`
- `sampleSize = 0`
- `sample = []`

## O que esta evidencia prova

- a tabela `profiles` esta acessivel por esse caminho de Data API no ambiente observado;
- nao houve registros visiveis retornados por essa credencial publica no momento da verificacao.

## O que esta evidencia nao prova

- nao prova ausencia absoluta de registros na tabela;
- nao prova inconsistencia estrutural definitiva;
- nao prova que `profiles` esteja vazia para acessos privilegiados;
- nao prova distribuicao real por `organization_id` e `role` no plano administrativo.

## Informacao faltante

Faltou a verificacao privilegiada de:

- total administrativo real de `profiles`;
- distribuicao real por `organization_id`;
- distribuicao real por `role`;
- consistencia administrativa completa.

## Por que faltou

Nao havia credencial privilegiada reutilizavel no repo para consulta read-only administrativa:

- sem `SUPABASE_SERVICE_ROLE_KEY`;
- sem DSN/Postgres read-only;
- sem outro caminho administrativo configurado.

## Risco

Alto.

## Impacto

Sem confirmar `profiles` de forma privilegiada, nao e seguro assumir que a base de perfis esta pronta para sustentar policies organization-scoped e funcoes dependentes de contexto organizacional.

## Conclusao

O estado de `profiles` permanece **inconclusivo** do ponto de vista administrativo. A evidencia real disponivel por esta sprint nao e suficiente para remover o bloqueio identificado anteriormente.
