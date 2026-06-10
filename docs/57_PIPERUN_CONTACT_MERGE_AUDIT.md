# 57 - Auditoria de Consolidacao PipeRun: Oportunidades + Contatos

## Resumo Executivo

Foram auditados dois arquivos exportados do PipeRun para avaliar se o arquivo de contatos com telefones resolve o bloqueio identificado no preview de importacao do CRM do EVOLV.

Arquivos analisados na pasta do projeto EVOLV:

- `Banco Piperun.xlsx`
- `Banco Piperun telefone.xlsx`

Observacao de caminho:

- A solicitacao menciona `temp-imports/Banco Piperun.xlsx` e `temp-imports/Contatos Piperun.xlsx`.
- No workspace atual, os arquivos disponiveis estao na raiz do projeto com os nomes acima.
- O arquivo `Banco Piperun telefone.xlsx` foi tratado como o arquivo de contatos com telefone.

Conclusao objetiva:

- E possivel consolidar os arquivos.
- O arquivo de contatos resolve o bloqueio tecnico de telefone para as 763 oportunidades.
- A melhor chave operacional para enriquecer telefone e `E-mail (Pessoa)` -> `E-mail`.
- Para as 4 oportunidades sem e-mail, o fallback por nome completo encontra telefone.
- A importacao continua viavel, mas deve permanecer assistida.
- Nao existe uma chave de pessoa realmente segura entre os dois arquivos.
- O `Hash` continua sendo a melhor chave para evitar reimportar a mesma oportunidade, mas nao serve para unir contatos, pois nao existe no arquivo de contatos.

Ponto de atencao principal:

- 628 linhas de oportunidades possuem e-mail repetido.
- Isso nao impede anexar telefone, mas impede deduplicacao automatica por e-mail.
- A regra correta continua sendo: uma pessoa pode ter multiplas oportunidades, portanto o `Hash` deve identificar a oportunidade, e o e-mail deve ser usado apenas para enriquecer contato.

## Arquivos Analisados

### Arquivo de oportunidades

Arquivo:

- `Banco Piperun.xlsx`

Estrutura:

| Indicador | Valor |
| --- | ---: |
| Abas | 1 |
| Aba analisada | Sheet1 |
| Registros | 763 |
| Colunas | 25 |
| Oportunidades com e-mail | 759 |
| Oportunidades sem e-mail | 4 |
| Oportunidades com telefone no proprio arquivo | 0 |
| Linhas com e-mail repetido | 628 |
| E-mails unicos | 434 |
| E-mails com mais de uma oportunidade | 303 |

Colunas principais:

- `Hash`
- `Funil`
- `Etapa`
- `Dono da oportunidade`
- `Nome do dono da oportunidade`
- `Origem`
- `Data de cadastro`
- `Data de fechamento`
- `Titulo`
- `Descrição`
- `Observações`
- `Status`
- `Situação`
- `Valor de P&S`
- `Tags`
- `Nome completo (Pessoa)`
- `E-mail (Pessoa)`

Distribuicao por status:

| Status | Registros |
| --- | ---: |
| Aberta | 377 |
| Perdida | 325 |
| Ganha | 61 |

Distribuicao por funil:

| Funil | Registros |
| --- | ---: |
| Prospecção | 424 |
| Perdidos | 278 |
| Vendas | 61 |

### Arquivo de contatos

Arquivo:

- `Banco Piperun telefone.xlsx`

Estrutura:

| Indicador | Valor |
| --- | ---: |
| Abas | 1 |
| Aba analisada | Sheet1 |
| Registros | 463 |
| Colunas | 7 |
| Contatos com telefone | 461 |
| Contatos sem telefone | 2 |
| Contatos com e-mail | 452 |
| Contatos sem e-mail | 11 |
| Contatos com nome | 463 |
| E-mails unicos | 451 |
| E-mails repetidos no arquivo de contatos | 2 linhas |
| Nomes unicos | 458 |
| Nomes repetidos no arquivo de contatos | 3 chaves de nome |
| E-mails aparentando teste/sistema | 7 |

Colunas existentes:

| Coluna | Papel aparente |
| --- | --- |
| Nome completo | Pessoa/contato |
| Consultor (E-mail) | Responsavel comercial |
| E-mail | E-mail do contato |
| Telefone | Telefone do contato |
| Tags | Tags do contato |
| CS Responsável | Responsavel interno |
| Nome fantasia (Empresa) | Empresa, quando houver |

Colunas que representam telefone:

- `Telefone`

Colunas que representam e-mail:

- `E-mail`
- `Consultor (E-mail)` representa e-mail do consultor, nao do contato.

Colunas que representam pessoa/contato:

- `Nome completo`

Possiveis IDs internos:

- Nenhuma coluna de ID interno foi identificada.
- Nao existe `Hash` no arquivo de contatos.
- Nao existe `ID da pessoa`.
- Nao existe documento pessoal.

## Estrutura do Arquivo de Contatos

O arquivo de contatos parece ser uma exportacao de pessoas/contatos, nao de oportunidades.

Ele possui menos registros que o arquivo de oportunidades porque uma mesma pessoa pode possuir mais de uma oportunidade no PipeRun. Isso explica a diferenca:

- 763 oportunidades.
- 463 contatos.

O arquivo contem telefones suficientes para enriquecer as oportunidades, mas nao contem uma chave primaria robusta. O relacionamento precisa ser feito por campos de contato, principalmente e-mail e, em casos sem e-mail, nome completo.

## Chaves de Consolidacao Possiveis

### Chave segura

Nao foi encontrada uma chave totalmente segura de pessoa entre os dois arquivos.

Motivo:

- `Hash` existe apenas em oportunidades.
- O arquivo de contatos nao possui `Hash`.
- Nao ha `ID da pessoa`.
- Nao ha documento pessoal.

### Chave aceitavel

#### E-mail

Mapeamento:

- Oportunidades: `E-mail (Pessoa)`
- Contatos: `E-mail`

Resultado:

- 759 de 763 oportunidades encontram telefone por e-mail.
- Nao foram encontrados casos de um mesmo e-mail apontando para multiplos telefones diferentes no match com oportunidades.

Classificacao:

- Aceitavel para enriquecer telefone.
- Nao recomendada para deduplicar oportunidades.

Motivo:

- 628 linhas de oportunidades possuem e-mail repetido.
- O e-mail repetido pode representar multiplas oportunidades legitimas do mesmo contato.

### Chave aceitavel com fallback manual

#### Nome completo

Mapeamento:

- Oportunidades: `Nome completo (Pessoa)`
- Contatos: `Nome completo`

Resultado:

- As 4 oportunidades sem e-mail encontram telefone por nome completo.
- No conjunto auditado, nao houve ambiguidade de telefone nos matches por nome usados como fallback.

Classificacao:

- Aceitavel apenas como fallback para registros sem e-mail.
- Exige revisao visual em importacao real.

Motivo:

- Nome pode ter divergencia de grafia.
- Nome pode repetir em bases maiores.
- Nome nao deve ser usado como identificador principal.

### Chave arriscada

#### Nome completo como chave principal

Classificacao:

- Arriscada.

Motivo:

- Pode existir homonimo.
- Pode haver variacao de grafia.
- Pode haver abreviacoes.
- O arquivo de contatos possui nomes repetidos.

### Chave nao recomendada

Nao usar como chave de consolidacao:

- `Consultor (E-mail)`
- `Nome do dono da oportunidade`
- `CS Responsável`
- `Funil`
- `Etapa`
- `Status`
- `Tags`
- `Nome fantasia (Empresa)`

Esses campos ajudam contexto operacional, mas nao identificam uma pessoa de forma confiavel.

## Cobertura de Telefones

### Cenario antes da consolidacao

| Indicador | Valor |
| --- | ---: |
| Total de oportunidades | 763 |
| Oportunidades com telefone | 0 |
| Oportunidades sem telefone | 763 |
| Cobertura de telefone | 0% |

### Cenario apos consolidacao por e-mail

| Indicador | Valor |
| --- | ---: |
| Total de oportunidades | 763 |
| Oportunidades que ganhariam telefone por e-mail | 759 |
| Oportunidades ainda sem telefone | 4 |
| Cobertura por e-mail | 99,48% |

### Cenario apos e-mail + fallback por nome

| Indicador | Valor |
| --- | ---: |
| Total de oportunidades | 763 |
| Oportunidades que ganhariam telefone por e-mail | 759 |
| Oportunidades que ganhariam telefone por nome | 4 |
| Oportunidades ainda sem telefone | 0 |
| Cobertura final estimada | 100% |

Leitura tecnica:

- O arquivo de contatos resolve o bloqueio de telefone.
- A cobertura final estimada e 100% no conjunto auditado.
- O fallback por nome deve ser marcado no preview para validacao, especialmente porque nao e chave segura.

### Impacto da regra de e-mails repetidos

O telefone pode ser enriquecido para todas as oportunidades, mas a importacao final ainda precisa respeitar a regra de duplicidade.

| Indicador | Valor |
| --- | ---: |
| Oportunidades com e-mail unico | 131 |
| Oportunidades com e-mail repetido | 628 |
| Oportunidades sem e-mail | 4 |
| E-mails fake/teste nas oportunidades | 0 |
| E-mails fake/teste nos contatos | 7 |

Recomendacao:

- Nao remover automaticamente oportunidades com e-mail repetido.
- Sinalizar e-mails repetidos no preview.
- Usar `Hash` como `externalId` para evitar reimportar a mesma oportunidade.
- Permitir multiplas oportunidades para o mesmo e-mail quando o `Hash` for diferente.

## Riscos Identificados

### Nomes duplicados

O arquivo de contatos possui nomes repetidos.

Risco:

- Usar nome como chave principal pode associar telefone incorreto.

Mitigacao:

- Usar nome apenas como fallback quando o e-mail estiver ausente.
- Exibir alerta no preview.

### E-mails repetidos

O arquivo de oportunidades possui 628 linhas com e-mail repetido.

Risco:

- Deduplicar por e-mail apagaria oportunidades legitimas.

Mitigacao:

- Deduplicar por `Hash`, nao por e-mail.
- Usar e-mail apenas para enriquecer telefone.

### Multiplos telefones para a mesma pessoa

No match auditado, nao foram encontrados casos de oportunidade com e-mail apontando para multiplos telefones diferentes.

Risco futuro:

- Caso surjam multiplos telefones em exportacoes maiores, o importador deve mostrar a lista e exigir escolha ou manter o primeiro como principal e os demais como observacao.

### Contatos sem oportunidade

Foram encontrados 25 contatos sem correspondencia por e-mail ou nome nas oportunidades.

Risco:

- Importar contatos isolados criaria pessoas sem oportunidade no CRM atual.

Mitigacao:

- Nesta fase, importar apenas oportunidades enriquecidas.
- Nao importar contatos soltos.

### Oportunidades sem contato

No conjunto auditado, todas as oportunidades encontram contato por e-mail ou por nome.

Risco:

- O fallback por nome pode mascarar divergencias se houver homonimos no futuro.

Mitigacao:

- Registrar fonte do telefone: `email` ou `nome`.
- Exigir revisao para registros unidos por nome.

### Divergencias de grafia

Risco:

- Nomes podem variar entre arquivos.

Mitigacao:

- Normalizar apenas para busca auxiliar.
- Preservar sempre o nome original do arquivo de oportunidades.

## Recomendacao Tecnica

### E possivel consolidar?

Sim.

O arquivo de contatos permite enriquecer o arquivo de oportunidades com telefones.

### Qual chave usar?

Recomendacao:

1. Usar `Hash` como `externalId` da oportunidade.
2. Usar `E-mail (Pessoa)` -> `E-mail` para buscar telefone.
3. Usar `Nome completo (Pessoa)` -> `Nome completo` apenas como fallback para oportunidades sem e-mail.

### A importacao continua viavel?

Sim, mas deve continuar assistida.

O bloqueio de telefone e resolvido, mas a importacao ainda precisa:

- preservar oportunidades repetidas por e-mail;
- sinalizar e-mails repetidos;
- sinalizar fallback por nome;
- manter `Hash` como chave de oportunidade.

### O arquivo de contatos resolve o bloqueio de telefones?

Sim.

Resultado estimado:

- 759 oportunidades recebem telefone por e-mail.
- 4 oportunidades recebem telefone por nome.
- 0 oportunidades permanecem sem telefone apos consolidacao.

### Quais registros ainda ficariam fora?

Pela regra de telefone, nenhum registro ficaria fora apos a consolidacao auditada.

Pela regra de qualidade/deduplicacao, ainda exigem revisao:

- 628 oportunidades com e-mail repetido.
- 4 oportunidades sem e-mail, enriquecidas por nome.
- contatos com e-mails de teste/sistema, se forem usados em algum fluxo futuro.

## Proximos Passos

1. Atualizar o preview de importacao para aceitar duas fontes:
   - oportunidades;
   - contatos com telefone.
2. Enriquecer oportunidades por e-mail.
3. Aplicar fallback por nome apenas para oportunidades sem e-mail.
4. Exibir no preview a fonte do telefone:
   - `telefone por e-mail`;
   - `telefone por nome`;
   - `sem telefone`.
5. Manter `Hash` como `externalId`.
6. Nao deduplicar por e-mail.
7. Sinalizar e-mails repetidos sem remover automaticamente.
8. Validar com Bruno uma amostra contendo:
   - oportunidades ganhas;
   - oportunidades perdidas;
   - oportunidades abertas;
   - oportunidades com e-mail repetido;
   - oportunidades enriquecidas por nome.
9. Somente depois criar o importador final.

## Confirmacao de Escopo

Esta sprint foi exclusivamente de auditoria e documentacao.

Nao foram importados dados.
Nao foram alterados CRM, Dashboard, Simulacao Comercial, Multi-Cotas, Supabase, localStorage, UI ou regras financeiras.

