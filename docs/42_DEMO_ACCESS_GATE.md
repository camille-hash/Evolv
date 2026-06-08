# 42 — Demo Access Gate

## Visao Geral

A versao demo do EVOLV pode ser publicada em um link publico, como Vercel, antes da implementacao de autenticacao real.

Para reduzir exposicao acidental durante demonstracoes, foi adicionada uma barreira simples de acesso por senha.

Esta protecao e provisoria e nao substitui autenticacao real.

## Variavel de Ambiente

A senha da demo deve ser configurada por ambiente:

```env
NEXT_PUBLIC_DEMO_ACCESS_PASSWORD=troque-esta-senha
```

O arquivo `.env.example` registra essa variavel para orientar configuracoes locais e de deploy.

## Comportamento

Quando `NEXT_PUBLIC_DEMO_ACCESS_PASSWORD` existe:

1. o EVOLV exibe uma tela de acesso antes da aplicacao;
2. o usuario informa a senha;
3. se a senha estiver correta, a sessao da demo e liberada;
4. o navegador grava em `sessionStorage`:

```text
evolv.demo.access.granted = true
```

Se a senha estiver incorreta, a tela exibe:

```text
Senha invalida.
```

## Ambiente Local

Se `NEXT_PUBLIC_DEMO_ACCESS_PASSWORD` nao estiver configurada, o acesso e liberado automaticamente.

Esse comportamento evita travar o desenvolvimento local e permite que Bruno ou o time continuem usando o EVOLV sem configurar senha em cada maquina.

## Limites de Seguranca

Esta solucao:

- nao e autenticacao real;
- nao cria usuarios;
- nao cria permissoes;
- nao protege dados por perfil;
- nao substitui Supabase Auth;
- nao deve ser usada como seguranca definitiva.

Como a variavel usa prefixo `NEXT_PUBLIC`, ela e adequada apenas para uma barreira simples de demo, nao para segredo sensivel.

## Futuro

Esta protecao devera ser substituida por Supabase Auth quando o EVOLV iniciar a fase operacional com:

- usuarios reais;
- organizacoes;
- papeis;
- permissoes;
- RLS;
- auditoria.

## Nao Fazer Nesta Sprint

Nesta sprint, nao foi feito:

- Supabase Auth;
- autenticacao real;
- criacao de usuarios;
- banco de dados;
- alteracao de `localStorage`;
- alteracao de calculos;
- alteracao de modulos de negocio.
