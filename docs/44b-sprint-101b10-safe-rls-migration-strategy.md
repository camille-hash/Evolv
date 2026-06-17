# Sprint 101B.10 — Safe RLS Migration Strategy

## Objetivo

Descrever uma migracao segura para substituir o modelo bridge permissivo de `crm_leads` por policies organization-scoped, sem interromper CRM, Auth e Recovery.

## Fase 1 — Criacao das funcoes

Meta:

- introduzir `evolv_current_organization_id()`
- introduzir `evolv_current_role()`

Regras:

- criar sem remover nada existente;
- alinhar a implementacao ao modelo real de `profiles`;
- evitar dependencias circulares;
- documentar claramente o contrato de cada funcao.

Resultado esperado:

- o banco passa a ter helpers canonicos de contexto.

## Fase 2 — Validacao paralela

Meta:

- provar que as funcoes retornam resultados corretos para usuarios validos;
- comparar resultados esperados com `profiles`.

Regras:

- sem trocar policies ainda;
- sem desligar bridge atual;
- evidencias coletadas em paralelo.

Resultado esperado:

- confianca suficiente para usar as funcoes em policies novas.

## Fase 3 — Criacao de policies novas

Meta:

- criar novas policies em `crm_leads` com escopo organizacional real.

Regras:

- policies novas devem usar `evolv_current_organization_id()`;
- se houver refinamento por papel, usar `evolv_current_role()`;
- nao remover imediatamente as bridge policies;
- preparar validacao controlada com usuarios reais.

Resultado esperado:

- `crm_leads` passa a ter um caminho seguro pronto para ser testado.

## Fase 4 — Convivencia controlada

Meta:

- manter por janela curta as policies antigas e novas enquanto se valida o comportamento operacional.

Regras:

- monitorar CRM;
- monitorar login/auth;
- monitorar recovery;
- confirmar leitura e edicao de leads;
- confirmar ausencia de regressao no fluxo comercial.

Resultado esperado:

- evidencia suficiente para decidir se a remocao do bridge e segura.

## Fase 5 — Remocao das bridge policies

Meta:

- remover:
  - `Allow public read crm_leads`
  - `Allow public update crm_leads`
  - `Authenticated bridge read crm_leads`
  - `Authenticated bridge update crm_leads`

Regras:

- remover apenas apos validacao completa;
- manter rollback preparado;
- remover primeiro o caminho publico anon;
- remover por ultimo o bridge authenticated temporario.

Resultado esperado:

- `crm_leads` endurecido com isolamento organizacional definitivo.

## Principios obrigatorios

- nenhuma fase deve interromper CRM, Auth ou Recovery;
- a transicao deve ser incremental;
- o banco deve convergir para um unico modelo canonico de contexto organizacional;
- o Dual Pipeline deve herdar o modelo final, nao o bridge legado.
