# Sprint 99C.2D - Modal Adicionar Nota

## Objetivo

Permitir que o usuario registre uma nota interna diretamente no Dossie Executivo Vivo, utilizando a API server-side criada na Sprint 99C.2C.

## Experiencia Implementada

Foi adicionado:

- botao `Adicionar Nota` no bloco de Historico Completo;
- modal simples de criacao;
- campo `Observacao interna`;
- botao `Cancelar`;
- botao `Salvar Nota`;
- estado de salvamento;
- mensagem de erro amigavel;
- preservacao do texto digitado quando a API falha;
- atualizacao imediata da timeline local quando a nota e criada com sucesso.

## Fluxo Tecnico

Fluxo de salvamento:

```text
Dossie Executivo
-> Modal Adicionar Nota
-> POST /api/crm/lead-notes
-> API valida Bearer token
-> API resolve profile
-> API valida organization_id
-> API cria nota interna
-> Dossie insere nota retornada no historico local
```

## Campos Enviados Pela UI

A UI envia apenas:

- `leadId`;
- `content`.

A UI nao envia:

- `organization_id`;
- `author_profile_id`;
- `is_internal`;
- `deleted_at`.

Esses campos continuam responsabilidade do servidor.

## Fora Do Escopo

Nao foi implementado:

- edicao de nota;
- exclusao de nota;
- filtros;
- fixacao;
- IA;
- WhatsApp;
- Google;
- RLS;
- SQL;
- migration;
- alteracao de Auth;
- alteracao de Shadow Runtime;
- alteracao de Observabilidade;
- alteracao de simulador.

## Confirmacoes

- Nenhum SQL foi executado.
- Nenhuma migration foi criada.
- Nenhuma policy foi alterada.
- Nenhum grant foi alterado.
- Nenhum deploy foi realizado.
- Nenhum dado estrutural do CRM foi alterado.
