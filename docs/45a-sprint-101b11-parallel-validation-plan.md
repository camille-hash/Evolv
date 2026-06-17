# Sprint 101B.11 — Parallel Validation Plan

## Objetivo

Validar as funcoes organizacionais em paralelo ao funcionamento atual do EVOLV, sem alterar policies existentes e sem remover as bridge policies de `crm_leads`.

## Validar que as funcoes existem

Executar o SQL de validation e registrar:

- schema;
- nome da funcao;
- argumentos;
- tipo de retorno;
- linguagem;
- security mode;
- grants.

Funcoes esperadas:

- `public.evolv_current_organization_id()`
- `public.evolv_current_role()`

## Validar retorno esperado para usuarios autenticados

Para uma sessao autenticada valida:

- `evolv_current_organization_id()` deve retornar a `organization_id` do profile ativo;
- `evolv_current_role()` deve retornar o `role` do profile ativo;
- usuarios sem profile ativo devem receber retorno nulo.

O resultado deve ser registrado de forma sanitizada:

- nao registrar tokens;
- nao registrar headers;
- nao registrar secrets;
- registrar apenas se retornou o valor esperado.

## Validar que o CRM continua funcionando

Fluxos minimos:

- abrir CRM;
- listar leads;
- abrir lead;
- editar lead;
- confirmar que `crm_leads` continua com 763 registros esperados;
- confirmar que nao houve alteracao em bridge policies nesta sprint.

## Validar que Auth continua funcionando

Fluxos minimos:

- login Supabase Auth;
- carregamento do profile;
- acesso ao app;
- logout.

## Validar que Recovery continua funcionando

Fluxos minimos:

- solicitar recuperacao de senha;
- abrir rota de recovery;
- confirmar que o fluxo continua sem regressao;
- nao alterar configuracoes de Auth.

## Validar que Lead Notes continua funcionando

Embora nao seja foco desta sprint, `crm_lead_notes` ja depende de isolamento organizacional. Apos a criacao das funcoes, validar:

- listagem de notas;
- criacao de nota;
- ausencia de regressao visivel.

## Como registrar evidencia sanitizada

Registrar:

- data/hora;
- operador;
- ambiente;
- SQL executado manualmente;
- resultados agregados;
- conclusao de cada fluxo.

Nao registrar:

- secrets;
- access tokens;
- refresh tokens;
- connection strings;
- dados pessoais desnecessarios;
- prints contendo chaves.

## Resultado esperado

Se tudo passar:

- as funcoes ficam prontas para serem usadas em uma sprint futura de hardening de `crm_leads`;
- bridge policies continuam intactas;
- o EVOLV continua operacional.

Se qualquer ponto falhar:

- nao avancar para hardening de policies;
- aplicar rollback se necessario;
- registrar a falha e abrir sprint corretiva.
