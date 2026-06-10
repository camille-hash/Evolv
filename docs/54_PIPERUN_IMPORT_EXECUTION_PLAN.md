# 54 - Plano de Execucao para Importacao PipeRun

## Resumo Executivo

A importacao do banco PipeRun para o CRM do EVOLV e tecnicamente viavel, mas deve ser executada como processo assistido, validado em etapas e com possibilidade de rollback.

O arquivo auditado contem dados suficientes para criar oportunidades no CRM do EVOLV, incluindo nome, e-mail, origem, consultor, funil, etapa, status, valor potencial e tags. Ainda assim, a importacao nao deve ser feita de forma cega, porque existem etapas divergentes, campos incompletos e contatos repetidos com multiplas oportunidades.

Recomendacao geral:

- Executar primeiro um preview completo sem salvar dados.
- Importar uma amostra pequena de teste.
- Validar com Bruno antes da carga completa.
- Preservar sempre o identificador externo do PipeRun para evitar duplicidade futura.

Esta sprint e exclusivamente documental. Nenhum dado deve ser importado nesta etapa.

## Fonte de Dados

Arquivo atual:

- `temp-imports/Banco Piperun.xlsx`

Estrutura auditada:

- Abas: 1
- Registros: 763
- Colunas: 25

Observacao operacional:

- A auditoria anterior tambem identificou uma copia do arquivo na raiz do projeto EVOLV.
- A importacao futura deve definir explicitamente qual arquivo sera a fonte oficial antes de qualquer carga.

## Mapeamento Final

| PipeRun | EVOLV CRM futuro | Regra |
| --- | --- | --- |
| Hash | `externalId` | Preservar como identificador externo unico do PipeRun. |
| Funil | `pipeline` | Mapear para pipeline configuravel atual. |
| Etapa | `etapa` | Mapear para etapa configuravel atual. |
| Dono da oportunidade | `consultor` | Usar se o nome do dono nao estiver disponivel. |
| Nome do dono | `consultor` | Campo preferencial para responsavel comercial. |
| Nome do dono da oportunidade | `consultor` | Campo preferencial quando exportado com este nome. |
| Origem | `origem` | Importacao direta. |
| Data de cadastro | `createdAt` | Preservar data original do PipeRun. |
| Data de fechamento | `closedAt` | Campo futuro recomendado para oportunidades ganhas/perdidas. |
| Titulo | `nome` ou `tituloOportunidade` | Usar como apoio quando nao houver nome completo; preferir campo futuro `tituloOportunidade`. |
| Descricao | `observacoes` | Concatenar em observacoes se houver conteudo. |
| Descrição | `observacoes` | Concatenar em observacoes se houver conteudo. |
| Observacoes | `observacoes` | Campo principal de observacoes comerciais. |
| Observações | `observacoes` | Campo principal de observacoes comerciais. |
| Status | `status` | Aplicar regra de status abaixo. |
| Situacao | `status` | Usar como fallback se `Status` estiver ausente. |
| Situação | `status` | Usar como fallback se `Status` estiver ausente. |
| Valor de P&S | `valorPotencial` | No CRM atual corresponde ao valor potencial da oportunidade. |
| Tags | `tags` | Separar por virgula, remover vazios e preservar texto original. |
| Nome completo (Pessoa) | `nome` | Campo preferencial para nome do lead. |
| E-mail (Pessoa) | `email` | Importacao direta quando preenchido. |

Nota tecnica:

- O CRM atual usa `valorPretendido` internamente para o valor potencial. O importador futuro pode mapear `Valor de P&S` para `valorPretendido` mantendo a nomenclatura comercial `valorPotencial` nos relatorios e no preview.
- `externalId`, `closedAt` e `tituloOportunidade` devem ser tratados como campos de preparacao futura caso ainda nao estejam persistidos no CRM no momento da importacao.

## Regras de Status

Mapeamento recomendado:

| PipeRun | EVOLV |
| --- | --- |
| Em andamento | `ativa` |
| Aberta | `ativa` |
| Ganha | `ganha` |
| Perdida | `perdida` |

Regra de seguranca:

- Se o status for desconhecido, assumir `ativa`.
- Registrar aviso no relatorio de importacao.
- Nunca descartar uma oportunidade por status desconhecido.

## Regras de Pipeline e Etapa

Os pipelines e etapas devem ser migrados respeitando a configuracao atual do CRM do EVOLV.

Regra geral:

- Se o pipeline existir na configuracao atual, usar o pipeline correspondente.
- Se a etapa existir dentro do pipeline configurado, usar a etapa correspondente.
- Se o pipeline ou etapa nao existir, preservar o valor original.
- Sinalizar discretamente como pipeline ou etapa nao configurada.
- Nunca descartar o lead por divergencia de funil.

Mapeamento inicial sugerido:

| PipeRun | EVOLV |
| --- | --- |
| Prospeccao | `prospecting` |
| Prospecção | `prospecting` |
| Vendas | `sales` |
| Administrativo | `administrative` |
| Perdidos | `lost` |

Etapas divergentes devem ser tratadas no preview para decisao operacional de Bruno antes da importacao completa.

## Deduplicacao

Regra recomendada:

- Nao deduplicar automaticamente por e-mail.

Motivo:

- Um mesmo contato pode possuir multiplas oportunidades.
- A auditoria identificou e-mails repetidos, o que pode representar recorrencia comercial real e nao necessariamente duplicidade.

Controle recomendado:

- Criar `externalId` a partir do campo `Hash`.
- Antes de importar, verificar se ja existe lead com o mesmo `externalId`.
- Se existir, nao importar novamente sem confirmacao manual.

## Campos Incompletos

Regras de tratamento:

- Telefone ausente: importar como string vazia.
- E-mail ausente: importar como string vazia e sinalizar no relatorio.
- E-mail repetido: permitir.
- `Valor de P&S` vazio: importar como `0`.
- Observacoes vazias: importar como string vazia.
- Tags vazias: importar como array vazio.
- Data de fechamento vazia: importar como vazio ou `null` em campo futuro.

Campos sem correspondencia atual devem ser preservados apenas no relatorio de preview, sem forcar entrada no CRM.

## Estrategia de Importacao

### Fase 1 - Preview completo, sem salvar

Gerar uma pre-visualizacao com:

- quantidade total de registros;
- quantidade valida para importacao;
- quantidade com status desconhecido;
- quantidade com pipeline ou etapa nao configurada;
- quantidade sem e-mail;
- quantidade sem valor;
- amostra de registros por pipeline;
- amostra de registros problemáticos.

Nenhum dado deve ser salvo nesta fase.

### Fase 2 - Importar 20 registros de teste

Selecionar uma amostra pequena, preferencialmente contendo:

- leads ativos;
- leads ganhos;
- leads perdidos;
- pelo menos uma etapa divergente;
- pelo menos um e-mail repetido;
- pelo menos um registro sem valor de P&S.

### Fase 3 - Validar com Bruno

Bruno deve validar:

- leitura dos cards no Kanban;
- pipeline e etapa;
- status da oportunidade;
- tags;
- valor potencial;
- nomes e responsaveis;
- consistencia da amostra com o PipeRun.

### Fase 4 - Importacao completa

Executar somente depois da validacao da amostra.

Ao final, gerar relatorio com:

- total importado;
- total ignorado por `externalId` duplicado;
- total com avisos;
- total por pipeline;
- total por status;
- registros que exigem decisao manual.

## Rollback

Como a importacao futura ainda deve operar sobre localStorage, o rollback precisa ser simples e verificavel.

Antes da importacao:

- criar backup da chave `evolv.crm.v1`;
- salvar backup como arquivo JSON ou chave temporaria;
- registrar data e hora do backup;
- registrar quantidade de leads antes da importacao.

Chaves sugeridas para backup temporario:

- `evolv.crm.v1.backup-before-piperun-import`
- `evolv.crm.import.preview.v1`

Restauracao manual:

- substituir o conteudo de `evolv.crm.v1` pelo backup;
- recarregar a aplicacao;
- validar quantidade de leads restaurada.

## Criterios de Sucesso

A importacao futura sera considerada bem-sucedida se:

- a quantidade importada bater com o arquivo ou com o lote aprovado;
- leads aparecerem no pipeline correto;
- etapas configuradas forem reconhecidas;
- etapas nao configuradas forem preservadas e sinalizadas;
- status `ganha`, `perdida` e `ativa` forem preservados;
- tags forem preservadas;
- valores de P&S forem convertidos corretamente;
- oportunidades com mesmo e-mail forem mantidas quando tiverem `Hash` diferente;
- Bruno validar a amostra antes da carga completa.

## Riscos e Decisoes Manuais

Riscos principais:

- etapas do PipeRun sem correspondencia direta no EVOLV;
- ausencia de telefone no arquivo auditado;
- e-mails repetidos;
- campos de valor vazios;
- diferenca entre status `Aberta` e nomenclatura `Em andamento`;
- necessidade futura de campos como `externalId`, `closedAt` e `tituloOportunidade`.

Decisoes recomendadas antes da importacao:

- confirmar se `Aberta` deve sempre virar `ativa`;
- confirmar destino de etapas divergentes;
- confirmar se `Titulo` deve ser preservado em observacoes ou campo proprio;
- confirmar se leads sem e-mail devem entrar no funil;
- confirmar formato final de relatorio de importacao.

## Fora do Escopo

Nao implementar nesta sprint:

- importador;
- upload de arquivo;
- alteracao no CRM;
- alteracao no Dashboard;
- alteracao no localStorage;
- Supabase;
- autenticacao;
- automacoes;
- deduplicacao inteligente;
- enriquecimento de dados;
- APIs;
- interface visual.

## Proximos Passos Sugeridos

1. Criar campo tecnico `externalId` no CRM antes da importacao real.
2. Criar preview de importacao em modo somente leitura.
3. Criar relatorio de divergencias de pipeline, etapa e status.
4. Validar amostra de 20 registros com Bruno.
5. Executar backup de `evolv.crm.v1`.
6. Rodar importacao completa somente apos aprovacao.
7. Gerar relatorio final pos-importacao.

