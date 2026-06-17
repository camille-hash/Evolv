# Sprint 101B.13 — Next RLS Hardening Readiness

## Pergunta central

O sistema esta pronto para desenhar a proxima sprint de hardening das policies de `crm_leads`?

## Resposta esperada desta sprint

Esta sprint nao executa hardening. Ela apenas prepara a evidencia necessaria para decidir se a proxima sprint pode desenhar ou executar a transicao das policies.

## Condicoes para readiness

O EVOLV pode avancar para a proxima sprint de hardening se a auditoria pos-deploy confirmar:

- `public.evolv_current_organization_id()` existe;
- `public.evolv_current_role()` existe;
- ambas nao recebem argumentos;
- retorno das funcoes esta correto;
- grants estao limitados conforme planejado;
- `anon` nao possui permissao de execucao;
- `authenticated` possui permissao de execucao;
- `crm_leads` continua operacional;
- `profiles` continua integro;
- bridge policies ainda estao intactas;
- CRM, Auth, Recovery e Lead Notes continuam funcionando.

## Condicoes de bloqueio

Bloquear hardening se:

- qualquer funcao estiver ausente;
- tipo de retorno estiver incorreto;
- grant para `anon` existir;
- grants forem mais amplos que o planejado;
- `crm_leads` tiver regressao operacional;
- Auth ou Recovery apresentarem regressao;
- houver duvida sobre o resultado de validacao.

## Como interpretar a chamada direta

Se as chamadas diretas retornarem `null` no SQL Editor, isso pode ser normal quando nao ha contexto autenticado. O dado mais importante para readiness e:

- metadado da funcao correto;
- grants corretos;
- teste em contexto autenticado retornando valores esperados;
- CRM funcionando.

## Proxima etapa recomendada

Se a evidencia for positiva, a proxima sprint deve desenhar ou preparar a troca controlada de `crm_leads` para policies organization-scoped, ainda preservando rollback e janela de convivencia.

Se a evidencia for incompleta ou negativa, abrir sprint corretiva focada apenas nas funcoes e grants antes de qualquer alteracao em `crm_leads`.
