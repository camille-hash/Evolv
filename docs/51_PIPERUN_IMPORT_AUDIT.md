# 51 - Auditoria do Banco Piperun para Migracao EVOLV

## Resumo Executivo

O arquivo `Banco Piperun.xlsx` foi auditado em modo somente leitura para avaliar a viabilidade de migracao futura para o CRM do EVOLV.

Resultado geral:

- O arquivo possui 1 aba.
- A aba possui 763 registros e 25 colunas.
- O conjunto parece representar oportunidades/leads exportados do PipeRun.
- A migracao e viavel, mas nao deve ser considerada importacao direta integral.
- Os campos principais de lead existem parcialmente: nome, e-mail, origem, responsavel, funil, etapa, status, valor potencial e tags.
- Nao existe coluna de telefone no arquivo auditado.
- Ha muitos e-mails repetidos, sugerindo multiplas oportunidades para a mesma pessoa ou duplicidades operacionais.
- Algumas etapas do PipeRun nao existem atualmente no CRM do EVOLV e exigem regra de adaptacao.
- Campos empresariais estao 100% vazios e nao agregam valor para a migracao atual.

Classificacao de viabilidade:

- Importacao direta: parcial.
- Importacao com adaptacao: recomendada.
- Dados que exigem decisao manual: etapas divergentes, status "Ganha", duplicidades por e-mail e ausencia de telefone.

Importante: nenhum dado foi importado, transformado ou persistido no EVOLV nesta sprint.

## Estrutura do Arquivo

Arquivo analisado:

- `Banco Piperun.xlsx`

Observacao de caminho:

- A solicitacao menciona `temp-imports/Banco Piperun.xlsx`.
- No workspace atual, o arquivo foi encontrado como `Banco Piperun.xlsx` na raiz do projeto EVOLV.
- Tambem existe um arquivo com o mesmo nome no caminho informado pelo usuario no OneDrive.
- A auditoria usou a copia visivel dentro da pasta do projeto EVOLV.

### Abas

| Aba | Registros | Colunas | Linha de cabecalho |
| --- | ---: | ---: | ---: |
| Sheet1 | 763 | 25 | 1 |

### Colunas da aba `Sheet1`

| # | Coluna | Tipo aparente | Vazios | Observacao |
| ---: | --- | --- | ---: | --- |
| 1 | Hash | texto | 0 | Identificador externo unico do PipeRun. |
| 2 | Funil | texto | 0 | Mapeavel para `pipeline`. |
| 3 | Etapa | texto | 0 | Mapeavel para `etapa`, com adaptacoes. |
| 4 | Lead-Timing da etapa | numero | 0 | Metrica operacional sem campo atual no EVOLV. |
| 5 | Dono da oportunidade | texto | 0 | E-mail do responsavel. |
| 6 | Nome do dono da oportunidade | texto | 0 | Mapeavel para `consultor`. |
| 7 | Origem | texto | 0 | Mapeavel para `origem`. |
| 8 | Data de cadastro | data | 0 | Mapeavel para `createdAt`, com decisao tecnica. |
| 9 | Data de fechamento | data | 377 | Sem campo atual direto. |
| 10 | Lead-Timing | numero | 0 | Metrica operacional sem campo atual no EVOLV. |
| 11 | Titulo | texto | 0 | Pode apoiar `nome` ou observacao, mas nao deve substituir nome completo. |
| 12 | Descricao | vazio | 763 | Campo sem conteudo util. |
| 13 | Observacoes | texto | 761 | Mapeavel para `observacoes`, mas quase vazio. |
| 14 | Status | texto | 0 | Aberta, Perdida, Ganha. Exige adaptacao. |
| 15 | Situacao | texto | 0 | Repete a classificacao de status. |
| 16 | Valor de P&S | numero | 480 | Mapeavel para `valorPretendido`, com muitas lacunas. |
| 17 | Tags | texto | 495 | Mapeavel para `tags`, com parser por virgula. |
| 18 | Nome fantasia (Empresa) | vazio | 763 | Sem uso atual. |
| 19 | CNPJ (Empresa) | vazio | 763 | Sem uso atual. |
| 20 | Capital social (Empresa) | vazio | 763 | Sem uso atual. |
| 21 | Endereco - Estado (UF) (Empresa) | vazio | 763 | Sem uso atual. |
| 22 | E-mail de contato (Empresa) | vazio | 763 | Sem uso atual. |
| 23 | Website (Empresa) | vazio | 763 | Sem uso atual. |
| 24 | Nome completo (Pessoa) | texto | 0 | Melhor fonte para `nome`. |
| 25 | E-mail (Pessoa) | texto | 4 | Mapeavel para `email`. |

### Distribuicoes principais

Funil:

| Funil | Registros |
| --- | ---: |
| Prospeccao | 424 |
| Perdidos | 278 |
| Vendas | 61 |

Status/Situacao:

| Status | Registros |
| --- | ---: |
| Aberta | 377 |
| Perdida | 325 |
| Ganha | 61 |

Responsavel:

| Responsavel | Registros |
| --- | ---: |
| Bruno | 548 |
| Carlos Arrabal | 215 |

Origem:

| Origem | Registros |
| --- | ---: |
| Facebook | 758 |
| Instagram | 2 |
| Indicacoes Clientes | 2 |
| Carteira de Clientes | 1 |

Etapas encontradas:

| Etapa PipeRun | Registros |
| --- | ---: |
| Abertura | 234 |
| Nao conseguiu mais retorno | 189 |
| Conexao | 72 |
| Agendamento | 62 |
| Telefone Incorreto | 51 |
| 1a Reuniao | 38 |
| Novos | 37 |
| Nao esta no momento de investir | 21 |
| Qualificados | 12 |
| Cliente nao compareceu a reuniao | 12 |
| Contorno de objecoes | 12 |
| No show | 7 |
| 2a Reuniao | 5 |
| Fechou com concorrente | 5 |
| Documentacao | 4 |
| Green flag | 2 |

Valor de P&S:

| Indicador | Valor |
| --- | ---: |
| Registros preenchidos | 283 |
| Registros vazios | 480 |
| Registros com valor diferente de zero | 13 |
| Soma dos valores preenchidos | R$ 7.240.000 |

## Mapeamento Piperun -> EVOLV

### Mapeamento recomendado para `CrmLead`

| Piperun | EVOLV CRM atual | Tipo de migracao | Observacao |
| --- | --- | --- | --- |
| Nome completo (Pessoa) | `nome` | Direta | Melhor fonte para nome do lead. |
| E-mail (Pessoa) | `email` | Direta parcial | 4 registros sem e-mail. |
| Origem | `origem` | Direta | Campo preenchido em todos os registros. |
| Nome do dono da oportunidade | `consultor` | Direta | Bruno ou Carlos Arrabal. |
| Valor de P&S | `valorPretendido` | Direta parcial | 480 vazios e muitos zeros. |
| Observacoes | `observacoes` | Direta parcial | Apenas 2 registros preenchidos. |
| Funil | `pipeline` | Adaptacao | PipeRun usa Prospeccao, Vendas, Perdidos. EVOLV tambem tem Administrativo. |
| Etapa | `etapa` | Adaptacao | Algumas etapas nao existem no EVOLV. |
| Tags | `tags` | Adaptacao simples | Separar por virgula quando houver multiplas tags. |
| Data de cadastro | `createdAt` | Adaptacao tecnica | Exige decisao para preservar data original ou usar data de importacao. |
| Status/Situacao | Sem campo direto | Adaptacao | Pode influenciar pipeline/etapa, mas nao existe campo `status` em `CrmLead`. |
| Hash | Sem campo direto | Recomendado preservar futuramente | Poderia virar `externalId` em uma sprint futura. |

### Campos nao presentes no arquivo, mas existentes no EVOLV

| Campo EVOLV | Situacao |
| --- | --- |
| `telefone` | Nao ha coluna equivalente no arquivo. |
| `produtoInteresse` | Nao ha coluna equivalente clara. |
| `temperatura` | Nao ha coluna equivalente clara. Default futuro seria `morna`. |
| `proximaAcao` | Nao ha coluna equivalente clara. |
| `dataProximaAcao` | Nao ha coluna equivalente clara. |

## Dados Compativeis

Podem ser migrados com baixo risco:

- Nome do lead: `Nome completo (Pessoa)`.
- E-mail: `E-mail (Pessoa)`, exceto 4 registros vazios.
- Origem: `Origem`.
- Consultor: `Nome do dono da oportunidade`.
- Valor potencial: `Valor de P&S`, aceitando vazios como `0` apenas se Bruno validar essa regra.
- Tags: `Tags`, convertendo texto separado por virgula em `string[]`.
- Pipeline: `Funil`, desde que aplicado mapeamento controlado.

## Dados que Precisam de Ajustes

### Pipeline

Mapeamento sugerido:

| PipeRun | EVOLV |
| --- | --- |
| Prospeccao | `prospecting` |
| Vendas | `sales` |
| Perdidos | `lost` |

Nao ha registros de Administrativo no arquivo, embora o EVOLV tenha pipeline `administrative`.

### Etapas

Etapas com correspondencia direta ou quase direta:

| PipeRun | EVOLV |
| --- | --- |
| Novos | `novos` |
| Abertura | `abertura` |
| Conexao | `conexao` |
| Qualificados | `qualificados` |
| No show | `no-show` |
| Agendamento | `agendamento` |
| 1a Reuniao | `primeira-reuniao` |
| 2a Reuniao | `segunda-reuniao` |
| Contorno de objecoes | `contorno-objecoes` |
| Green flag | `green-flag` |
| Documentacao | `documentacao` |
| Cliente nao compareceu a reuniao | `cliente-nao-compareceu` |
| Nao esta no momento de investir | `nao-esta-no-momento` |
| Fechou com concorrente | `fechou-concorrente` |

Etapas que exigem decisao:

| PipeRun | Possivel destino EVOLV | Motivo |
| --- | --- | --- |
| Nao conseguiu mais retorno | `tentativas-contato` | Nao existe etapa igual no EVOLV. |
| Telefone Incorreto | `tentativas-contato` ou nova etapa futura | O EVOLV nao tem etapa especifica para telefone incorreto. |

### Status/Situacao

O EVOLV CRM atual ainda nao possui campo separado para `status`.

Possivel interpretacao:

- `Aberta`: manter no pipeline original.
- `Perdida`: enviar para pipeline `lost`.
- `Ganha`: exige decisao manual, pois o EVOLV ainda nao possui estado "ganha" ou conversao formal Lead -> Cliente.

## Dados Sem Correspondencia

Nao possuem correspondencia atual no EVOLV CRM:

- `Hash`.
- `Lead-Timing da etapa`.
- `Lead-Timing`.
- `Data de fechamento`.
- `Dono da oportunidade` como e-mail separado do consultor.
- `Status` e `Situacao` como campos independentes.
- Campos empresariais:
  - Nome fantasia (Empresa)
  - CNPJ (Empresa)
  - Capital social (Empresa)
  - Endereco - Estado (UF) (Empresa)
  - E-mail de contato (Empresa)
  - Website (Empresa)

Observacao: embora `Hash` nao tenha campo atual, ele e tecnicamente importante para auditoria e deduplicacao futura. Antes de importacao real, recomenda-se criar um campo ou estrutura de `externalId`.

## Riscos da Migracao

### 1. Ausencia de telefone

Nao ha nenhuma coluna semelhante a telefone, celular ou WhatsApp.

Impacto:

- O CRM do EVOLV possui campo `telefone`, mas ele ficaria vazio em todos os leads.
- Para rotina comercial real, essa e a maior lacuna operacional.

### 2. Duplicidade por e-mail

Foram identificados 303 e-mails com repeticao.

Observacoes:

- `Hash` nao possui duplicidade.
- Isso indica que o PipeRun pode conter multiplas oportunidades para a mesma pessoa.
- Nao e seguro deduplicar automaticamente por e-mail sem decisao do Bruno.

### 3. Valor potencial incompleto

`Valor de P&S` possui:

- 480 registros vazios.
- 270 registros preenchidos com `0`.
- Apenas 13 registros com valor diferente de zero.

Impacto:

- O dashboard comercial do EVOLV ficaria subestimado se os vazios/zeros forem importados literalmente.
- A meta mensal e valor em negociacao dependeriam de saneamento desse campo.

### 4. Etapas divergentes

Etapas como `Telefone Incorreto` e `Nao conseguiu mais retorno` nao existem no EVOLV.

Impacto:

- Exige tabela de equivalencia.
- Ou exige criacao futura de etapas adicionais no CRM do EVOLV.

### 5. Status "Ganha"

Existem 61 registros com status `Ganha`.

Impacto:

- O EVOLV ainda nao tem entidade de conversao formal de lead para cliente.
- Importar como lead ativo pode distorcer o funil.
- Importar como perdido seria incorreto.
- Requer decisao manual ou campo futuro de status.

### 6. Campos empresariais vazios

Todos os campos de empresa estao 100% vazios.

Impacto:

- Nao devem ser considerados nesta primeira migracao.

### 7. Dados pessoais sensiveis

O arquivo contem nomes e e-mails de pessoas.

Impacto:

- Qualquer importacao futura deve considerar LGPD, consentimento, finalidade e controle de acesso.

## Recomendacao Tecnica

Recomendacao: importacao com adaptacao, nao importacao direta cega.

Antes de importar dados para o EVOLV, recomenda-se:

1. Definir se cada linha representa uma oportunidade independente ou se deve haver deduplicacao por pessoa/e-mail.
2. Criar regra de mapeamento oficial para etapas divergentes.
3. Decidir como tratar leads com status `Ganha`.
4. Decidir se o `Hash` sera preservado em campo tecnico futuro.
5. Validar com Bruno se `Valor de P&S` vazio deve entrar como `0` ou permanecer sem valor.
6. Obter ou complementar telefones, pois o arquivo auditado nao contem esse dado.

Viabilidade por bloco:

| Bloco | Viabilidade | Comentario |
| --- | --- | --- |
| Leads basicos | Alta | Nome, e-mail, origem e consultor estao disponiveis. |
| Pipeline | Media/alta | Funil e etapa existem, mas exigem equivalencias. |
| Valor comercial | Media/baixa | Campo muito incompleto. |
| Contato operacional | Baixa | Telefone ausente. |
| Historico/atividades | Baixa | Timing existe, mas nao ha notas/atividades detalhadas. |
| Empresas | Nula nesta base | Campos 100% vazios. |

## Proximos Passos Sugeridos

1. Validar com Bruno se a importacao deve preservar oportunidades duplicadas por e-mail.
2. Definir tabela oficial de mapeamento de etapas PipeRun -> EVOLV.
3. Decidir tratamento dos 61 registros com status `Ganha`.
4. Decidir se o EVOLV deve ganhar um campo tecnico `externalId` para armazenar o `Hash` do PipeRun.
5. Solicitar uma exportacao complementar do PipeRun contendo telefone/WhatsApp, se existir.
6. Criar uma sprint futura apenas para desenho da estrategia de importacao.
7. Somente depois criar uma rotina manual e reversivel de importacao, preferencialmente com dry-run e relatorio de erros.

## Confirmacao de Escopo

Esta sprint foi somente de leitura e documentacao.

Nao foi realizada importacao de dados.
Nao foi feita transformacao persistida.
Nao foi criado script de importacao.
Nao foi alterado `localStorage`.
Nao foi alterado CRM.
Nao foi alterado Dashboard.
Nao foi alterado Supabase.
Nao foi alterado Multi-Cotas.
Nao foi alterada Simulacao Comercial.
Nao foi criada API.
Nao foi criada interface visual.
