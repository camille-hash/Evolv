# Sprint 68 - Exportacao segura dos dados locais

## Objetivo

Criar uma rotina manual e segura para exportar os dados locais do EVOLV para um arquivo JSON, sem alterar a persistencia atual e sem conectar Supabase.

## Contexto

O diagnostico da persistencia local confirmou que o CRM e outros modulos ainda usam `localStorage`.

Isso significa que:

- Camille ve os leads importados porque a importacao PipeRun foi executada no navegador dela;
- Bruno ve o CRM zerado quando acessa por outro navegador ou computador;
- os dados ainda nao estao em banco compartilhado.

## Chaves exportadas

A rotina exporta as seguintes chaves de `localStorage`:

- `evolv.crm.v1`
- `evolv.crm.pipelines.v1`
- `evolv.crm.goal.v1`
- `evolv.crm.notes.v1`
- `evolv.crm.activities.v1`
- `evolv.crm.stage-changes.v1`
- `evolv.crm.backup.before-piperun-import.v1`
- `evolv.users.v1`
- `evolv.client-context.v1`
- `evolv.portfolio.v1`
- `evolv.simulations.v1`
- `evolv.operations.v1`
- `evolv.strategies.v1`
- `evolv.followup.v1`
- `evolv.wealth.evolution.v1`
- `evolv.administrators.v1`
- `evolv.multi-cotas.v1`

## Formato do arquivo

O arquivo gerado segue o padrao:

```text
evolv-local-backup-YYYY-MM-DD-HH-mm.json
```

O JSON contem:

- nome do app;
- tipo do backup;
- versao do formato;
- timestamp de geracao;
- lista das chaves exportadas;
- resumo com total de chaves encontradas e ausentes;
- contagem de registros quando o valor da chave e um array;
- valor bruto preservado de cada chave;
- valor parseado quando o conteudo e JSON valido.

## Local da interface

O botao esta disponivel na area administrativa de configuracoes:

```text
Exportar backup local
```

## Garantias de seguranca

A rotina:

- apenas le `localStorage`;
- nao chama `localStorage.setItem`;
- nao chama `localStorage.removeItem`;
- nao altera leads;
- nao apaga dados;
- nao importa dados;
- nao conecta Supabase;
- nao modifica a persistencia atual do app.

## Uso recomendado

Antes de migrar para Supabase/Postgres:

1. Acessar o EVOLV no navegador da Camille.
2. Entrar como administrador.
3. Abrir Configuracoes.
4. Clicar em `Exportar backup local`.
5. Guardar o arquivo JSON gerado.
6. Conferir no arquivo se `evolv.crm.v1` possui os leads esperados.
7. Usar esse arquivo como fonte de migracao futura para Supabase/Postgres.

## Fora do escopo

Esta sprint nao implementa:

- importacao de backup;
- migracao para Supabase;
- conexao com banco;
- sincronizacao entre navegadores;
- alteracao do CRM funcional;
- alteracao de login;
- alteracao de Simulacao Comercial;
- alteracao de Multi-Cotas;
- alteracao dos leads existentes.

## Validacoes

Validacoes obrigatorias executadas ao final da sprint:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`
