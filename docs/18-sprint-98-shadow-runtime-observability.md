# Sprint 98 - Shadow Runtime Observability

## Objetivo

Expor de forma discreta e tecnica a fonte atual utilizada pelo CRM:

- `authenticated`
- `anon`
- `localStorage`

Esta sprint nao altera a ordem de fallback, nao remove anon, nao remove localStorage e nao muda o comportamento operacional do CRM.

## Implementacao

### Helper de observabilidade

Arquivo:

`modules/crm/crm-source-observability.ts`

Responsabilidades:

- manter em memoria a origem atual do repository;
- expor `getCrmRepositorySource()`;
- expor `setCrmRepositorySource(source)`;
- expor `subscribeCrmRepositorySource(listener)`;
- emitir evento browser-side quando a fonte muda.

O helper e defensivo: se o evento falhar, o erro e ignorado para que a observabilidade nunca afete o runtime do CRM.

### Registro no repository layer

Arquivo:

`modules/crm/repositories/index.ts`

Os pontos de selecao ja existentes agora registram a fonte escolhida:

- `authenticated`, quando `AuthenticatedSupabaseCrmRepository` retorna com sucesso;
- `anon`, quando `SupabaseCrmRepository` retorna com sucesso;
- `localStorage`, quando a flag Supabase CRM esta desligada ou todos os fallbacks Supabase falham.

A ordem de fallback permanece:

1. authenticated shadow, somente se a flag estiver ativa;
2. anon;
3. localStorage.

Com a flag shadow desligada, o caminho permanece o atual:

1. anon, se `NEXT_PUBLIC_USE_SUPABASE_CRM=true`;
2. localStorage.

### Indicador visual

Arquivo:

`components/crm/crm-source-indicator.tsx`

Texto exibido:

`CRM Source: Authenticated`

ou:

- `CRM Source: Anon`
- `CRM Source: LocalStorage`
- `CRM Source: Detectando`

Localizacao:

Topo do CRM operacional, no cabeçalho do bloco `CRM Operacional`, alinhado ao lado direito em telas maiores.

## Seguranca

O indicador nao exibe:

- nome de usuario;
- e-mail;
- organization id;
- lead id;
- payload de leads;
- tokens;
- detalhes de policy/RLS.

Ele exibe somente a categoria tecnica da fonte ativa.

## Falha segura

Se a observabilidade falhar:

- o CRM continua listando leads;
- os fallbacks continuam iguais;
- o indicador pode permanecer em `Detectando`;
- nenhuma operacao de CRM e interrompida.

## Confirmacoes

- Nenhum SQL foi executado.
- Nenhuma policy foi alterada.
- Nenhum grant foi alterado.
- Nenhum RLS foi alterado.
- Nenhum deploy foi realizado.
- Nenhum comportamento funcional foi alterado.
- Anon permanece preservado.
- localStorage permanece preservado.
- Bruno continua operacional.
