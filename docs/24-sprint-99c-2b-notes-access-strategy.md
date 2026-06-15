# Sprint 99C.2B - Notes Access Strategy

## 1. Decisao Arquitetural Escolhida

A estrategia aprovada para notas estruturadas e:

```text
Frontend -> Server Action/API -> Supabase
```

Esta e a estrategia B.

Motivo da decisao:

- evita expor acesso direto amplo a `crm_lead_notes` no browser;
- permite validar sessao e profile antes de qualquer leitura/escrita;
- permite garantir `organization_id` no servidor;
- reduz risco enquanto RLS final das notas ainda nao esta consolidado;
- prepara uma transicao mais segura para policies organizacionais futuras.

## 2. Fluxo Completo De Criacao De Nota

Fluxo futuro recomendado:

1. Usuario abre o dossie de um lead.
2. Frontend envia conteudo da nota e `leadId` para uma Server Action ou API route.
3. Camada server-side valida a sessao Supabase.
4. Camada server-side resolve o profile do usuario autenticado.
5. Camada server-side valida se o profile esta ativo.
6. Camada server-side consulta o lead por `leadId`.
7. Camada server-side confirma que `lead.organization_id = profile.organization_id`.
8. Camada server-side insere a nota em `crm_lead_notes`.
9. `author_profile_id` recebe `profile.id`.
10. `organization_id` deve ser preenchido a partir do lead ou validado pela trigger do banco.
11. Resposta retorna a nota criada em formato seguro para o frontend.
12. Frontend atualiza o dossie sem alterar outros fluxos do CRM.

## 3. Fluxo Completo De Listagem De Notas

Fluxo futuro recomendado:

1. Frontend solicita notas de um `leadId`.
2. Server Action/API valida sessao Supabase.
3. Server Action/API resolve profile.
4. Server Action/API valida profile ativo e role permitida.
5. Server Action/API busca o lead.
6. Server Action/API confirma que o lead pertence a mesma organizacao do profile.
7. Server Action/API lista notas com:

```sql
lead_id = leadId
deleted_at is null
order by created_at desc
```

8. Resposta retorna apenas notas internas autorizadas para o usuario operacional.

## 4. Como Validar Sessao

A camada server-side deve:

- usar o client Supabase server-side apropriado;
- recuperar a sessao atual;
- rejeitar a operacao se nao houver usuario autenticado;
- nunca confiar em `profileId`, `organizationId` ou role enviados pelo frontend.

Falha de sessao deve retornar mensagem generica:

```text
Nao foi possivel concluir a operacao.
```

## 5. Como Resolver Profile Do Usuario

Depois de validar a sessao:

1. Ler `auth.user.id`.
2. Buscar `profiles` usando:

```sql
profiles.id = auth.user.id
```

3. Recuperar:

- `id`
- `organization_id`
- `role`
- `is_active`
- `name`
- `email`

4. Bloquear se:

- profile nao existir;
- `organization_id` estiver vazio;
- `is_active` nao for `true`;
- role nao for permitida.

## 6. Como Validar `organization_id`

Regra:

- `organization_id` operacional vem do profile autenticado;
- `organization_id` da nota deve coincidir com `organization_id` do lead;
- o frontend nao deve enviar `organization_id` como fonte de verdade.

Na criacao:

- preferir derivar `organization_id` do lead no servidor;
- manter a trigger de consistencia como segunda camada de protecao.

## 7. Como Garantir Que Lead Pertence A Mesma Organizacao

Antes de listar ou criar notas:

1. Buscar lead por `id`.
2. Ler `lead.organization_id`.
3. Comparar com `profile.organization_id`.
4. Se diferente, bloquear.

Essa validacao deve acontecer antes de qualquer acesso a `crm_lead_notes`.

## 8. Como Preencher `author_profile_id`

Na criacao de nota:

- `author_profile_id = profile.id`;
- nao aceitar `author_profile_id` vindo do frontend;
- `updated_by_profile_id` deve ficar nulo na criacao;
- `deleted_by_profile_id` deve ficar nulo na criacao.

Na resposta ao frontend:

- pode retornar `author_profile_id`;
- em sprint futura, pode enriquecer com nome do autor a partir de `profiles`.

## 9. Como Preparar Edicao Futura

Edicao futura deve seguir:

- todos os usuarios ativos da organizacao podem editar;
- validar sessao;
- resolver profile;
- confirmar que nota existe;
- confirmar que nota pertence a lead da mesma organizacao;
- atualizar `content`;
- atualizar `updated_by_profile_id = profile.id`;
- preservar `author_profile_id`;
- rejeitar edicao de nota com `deleted_at` preenchido.

## 10. Como Preparar Soft Delete Futuro

Soft delete futuro deve seguir:

- apenas `admin` pode apagar nota;
- validar sessao;
- resolver profile;
- confirmar `profile.role = 'admin'`;
- confirmar mesma organizacao;
- preencher `deleted_at = now()`;
- preencher `deleted_by_profile_id = profile.id`;
- nao executar delete fisico em fluxo operacional.

## 11. Como Preparar RLS Futura

Mesmo com camada server-side, RLS futura deve proteger:

- leitura apenas para usuarios autenticados com profile ativo;
- acesso apenas dentro da propria organizacao;
- insert apenas quando `organization_id` corresponder ao profile;
- update de conteudo para usuarios ativos da organizacao;
- soft delete apenas para admin.

RLS deve ser validada em sprint separada antes de expor leitura ampla.

## 12. Arquivos Provavelmente Criados/Alterados Na Proxima Sprint

Provaveis arquivos novos:

- `app/api/crm/lead-notes/route.ts` ou Server Action equivalente;
- `modules/crm/server/crm-lead-notes-service.ts`;
- `modules/crm/server/crm-server-auth.ts`;
- testes ou scripts de validacao, se o projeto adotar.

Provaveis arquivos alterados:

- `components/crm/crm-lead-detail.tsx`;
- `components/crm/crm-structured-notes.tsx`;
- `modules/crm/crm-lead-notes.ts`;
- `modules/crm/repositories/crm-lead-notes-repository.ts`, se a camada atual for reaproveitada apenas como tipo/contrato.

## 13. Riscos

Riscos principais:

- expor notas no browser antes de RLS final;
- aceitar `organization_id` vindo do frontend;
- permitir autoria forjada;
- permitir leitura de notas de outro tenant;
- permitir soft delete para SDR;
- conectar UI antes de validar sessao/profile/lead no servidor;
- duplicar regras entre client repository e server action sem uma fonte clara.

Mitigacao:

- manter frontend sem acesso direto a notas ate a camada server-side estar pronta;
- validar sessao/profile/organizacao em toda operacao;
- nao confiar em campos sensiveis enviados pelo frontend.

## 14. Rollback Conceitual

Rollback da proxima implementacao deve ser simples:

1. Remover chamada da UI para Server Action/API.
2. Manter dossie usando dados temporarios derivados do lead.
3. Preservar tabela `crm_lead_notes`.
4. Nao apagar notas reais.
5. Nao alterar `crm_leads`.
6. Nao alterar Auth, Shadow Runtime ou fallback do CRM.

## 15. Criterios De Sucesso

A proxima sprint sera bem-sucedida se:

- notas forem listadas apenas via server-side;
- criacao de nota ocorrer apenas apos sessao valida;
- `author_profile_id` for preenchido no servidor;
- lead e profile forem da mesma organizacao;
- notas com `deleted_at` nao aparecerem;
- nenhum dado de outra organizacao puder ser acessado;
- Bruno nao perceber regressao operacional.

## Confirmacoes Da Sprint 99C.2B

- Nenhum codigo funcional foi alterado.
- Nenhum SQL foi executado.
- Nenhuma migration foi criada.
- Nenhum dado foi alterado.
- Nenhum deploy foi realizado.
- Nenhum endpoint foi implementado.
- Nenhuma Server Action foi implementada.
- Nenhuma UI foi conectada.
